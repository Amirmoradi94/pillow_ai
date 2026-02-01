/**
 * Google Calendar Sync Engine
 * Handles initial and incremental sync of calendar events
 */

import { GoogleCalendarClient, createGoogleCalendarClient } from './client';
import { createServerClient } from '@/lib/supabase/server';
import { calendar_v3 } from 'googleapis';

export interface SyncResult {
  providerId: string;
  success: boolean;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  error?: string;
}

/**
 * Convert Google Calendar event to our database format
 */
function convertGoogleEventToDbEvent(
  event: calendar_v3.Schema$Event,
  providerId: string,
  userId: string,
  tenantId: string
) {
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;

  if (!start || !end || !event.id) {
    return null;
  }

  return {
    calendar_provider_id: providerId,
    user_id: userId,
    tenant_id: tenantId,
    external_event_id: event.id,
    sync_source: 'google' as const,
    title: event.summary || 'Untitled Event',
    description: event.description || null,
    location: event.location || null,
    start_time: start,
    end_time: end,
    timezone: event.start?.timeZone || 'UTC',
    all_day: !!event.start?.date,
    status: event.status === 'cancelled' ? 'cancelled' as const : 'confirmed' as const,
    booked_by: 'external' as const,
    attendees: event.attendees?.map(a => ({
      email: a.email,
      name: a.displayName,
      status: a.responseStatus,
    })) || [],
    metadata: {
      google_html_link: event.htmlLink,
      google_organizer: event.organizer?.email,
      google_created: event.created,
      google_updated: event.updated,
    },
  };
}

/**
 * Perform initial sync for a calendar provider
 * Fetches events from the past 30 days and next 90 days
 */
export async function performInitialSync(providerId: string): Promise<SyncResult> {
  const result: SyncResult = {
    providerId,
    success: false,
    eventsCreated: 0,
    eventsUpdated: 0,
    eventsDeleted: 0,
  };

  try {
    const supabase = await createServerClient();
    const client = await createGoogleCalendarClient(providerId);

    // Get provider details
    const { data: provider } = await supabase
      .from('calendar_providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (!provider) {
      throw new Error('Provider not found');
    }

    // Fetch events from past 30 days to next 90 days
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30);

    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 90);

    let allEvents: calendar_v3.Schema$Event[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;

    // Fetch all pages
    do {
      const response = await client.listEvents({
        timeMin,
        timeMax,
        pageToken,
        maxResults: 250,
      });

      allEvents = allEvents.concat(response.items);
      pageToken = response.nextPageToken;
      nextSyncToken = response.nextSyncToken;
    } while (pageToken);

    // Process events in batches
    const batchSize = 50;
    for (let i = 0; i < allEvents.length; i += batchSize) {
      const batch = allEvents.slice(i, i + batchSize);

      for (const googleEvent of batch) {
        const dbEvent = convertGoogleEventToDbEvent(
          googleEvent,
          providerId,
          provider.user_id,
          provider.tenant_id
        );

        if (!dbEvent) continue;

        // Check if event already exists
        const { data: existing } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('calendar_provider_id', providerId)
          .eq('external_event_id', googleEvent.id!)
          .single();

        if (existing) {
          // Update existing event
          const { error } = await supabase
            .from('calendar_events')
            .update(dbEvent)
            .eq('id', existing.id);

          if (!error) result.eventsUpdated++;
        } else {
          // Create new event
          const { error } = await supabase
            .from('calendar_events')
            .insert(dbEvent);

          if (!error) result.eventsCreated++;
        }
      }
    }

    // Update provider with sync token
    await supabase
      .from('calendar_providers')
      .update({
        sync_token: nextSyncToken,
        last_synced_at: new Date().toISOString(),
        status: 'active',
      })
      .eq('id', providerId);

    result.success = true;
  } catch (error: any) {
    result.error = error.message;

    // Update provider status to error
    const supabase = await createServerClient();
    await supabase
      .from('calendar_providers')
      .update({
        status: 'error',
      })
      .eq('id', providerId);
  }

  return result;
}

/**
 * Perform incremental sync using sync tokens
 * Only fetches changes since last sync
 */
export async function performIncrementalSync(providerId: string): Promise<SyncResult> {
  const result: SyncResult = {
    providerId,
    success: false,
    eventsCreated: 0,
    eventsUpdated: 0,
    eventsDeleted: 0,
  };

  try {
    const supabase = await createServerClient();
    const client = await createGoogleCalendarClient(providerId);

    // Get provider details
    const { data: provider } = await supabase
      .from('calendar_providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (!provider) {
      throw new Error('Provider not found');
    }

    if (!provider.sync_token) {
      // No sync token, perform initial sync instead
      return performInitialSync(providerId);
    }

    let allEvents: calendar_v3.Schema$Event[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;

    // Fetch all pages using sync token
    try {
      do {
        const response = await client.listEvents({
          syncToken: provider.sync_token,
          pageToken,
          maxResults: 250,
        });

        allEvents = allEvents.concat(response.items);
        pageToken = response.nextPageToken;
        nextSyncToken = response.nextSyncToken;
      } while (pageToken);
    } catch (error: any) {
      // Sync token invalid, perform full sync
      if (error.code === 410 || error.message?.includes('Sync token')) {
        console.log('Sync token expired, performing full sync');
        return performInitialSync(providerId);
      }
      throw error;
    }

    // Process events
    for (const googleEvent of allEvents) {
      // Check if event was deleted
      if (googleEvent.status === 'cancelled') {
        const { error } = await supabase
          .from('calendar_events')
          .update({ status: 'cancelled' })
          .eq('calendar_provider_id', providerId)
          .eq('external_event_id', googleEvent.id!);

        if (!error) result.eventsDeleted++;
        continue;
      }

      const dbEvent = convertGoogleEventToDbEvent(
        googleEvent,
        providerId,
        provider.user_id,
        provider.tenant_id
      );

      if (!dbEvent) continue;

      // Check if event exists
      const { data: existing } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('calendar_provider_id', providerId)
        .eq('external_event_id', googleEvent.id!)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('calendar_events')
          .update(dbEvent)
          .eq('id', existing.id);

        if (!error) result.eventsUpdated++;
      } else {
        // Create new
        const { error } = await supabase
          .from('calendar_events')
          .insert(dbEvent);

        if (!error) result.eventsCreated++;
      }
    }

    // Update provider with new sync token
    await supabase
      .from('calendar_providers')
      .update({
        sync_token: nextSyncToken,
        last_synced_at: new Date().toISOString(),
        status: 'active',
      })
      .eq('id', providerId);

    result.success = true;
  } catch (error: any) {
    result.error = error.message;

    // Update provider status to error
    const supabase = await createServerClient();
    await supabase
      .from('calendar_providers')
      .update({
        status: 'error',
      })
      .eq('id', providerId);
  }

  return result;
}

/**
 * Sync all active calendar providers
 */
export async function syncAllProviders(): Promise<SyncResult[]> {
  const supabase = await createServerClient();

  const { data: providers } = await supabase
    .from('calendar_providers')
    .select('id')
    .eq('sync_enabled', true)
    .in('status', ['active', 'error']);

  if (!providers || providers.length === 0) {
    return [];
  }

  const results: SyncResult[] = [];

  for (const provider of providers) {
    const result = await performIncrementalSync(provider.id);
    results.push(result);
  }

  return results;
}

/**
 * Sync a single event from our database to Google Calendar
 */
export async function syncEventToGoogle(eventId: string): Promise<void> {
  const supabase = await createServerClient();

  const { data: event } = await supabase
    .from('calendar_events')
    .select('*, calendar_providers(*)')
    .eq('id', eventId)
    .single();

  if (!event || !event.calendar_providers) {
    throw new Error('Event or provider not found');
  }

  const client = new GoogleCalendarClient(event.calendar_providers as any);

  const googleEvent = {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start: {
      dateTime: event.start_time,
      timeZone: event.timezone,
    },
    end: {
      dateTime: event.end_time,
      timeZone: event.timezone,
    },
    attendees: event.attendees?.map((a: any) => ({
      email: a.email,
      displayName: a.name,
    })),
  };

  if (event.external_event_id) {
    // Update existing event
    await client.updateEvent(event.external_event_id, googleEvent);
  } else {
    // Create new event
    const created = await client.createEvent(googleEvent);

    // Update our record with the Google event ID
    await supabase
      .from('calendar_events')
      .update({ external_event_id: created.id })
      .eq('id', eventId);
  }
}
