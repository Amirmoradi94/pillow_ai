/**
 * Google Calendar API Client
 * Wrapper for Google Calendar API operations
 */

import { google, calendar_v3 } from 'googleapis';
import { decryptToken, isTokenExpired, refreshGoogleToken, encryptToken, calculateTokenExpiry } from './tokens';
import { createServerClient } from '@/lib/supabase/server';

export interface CalendarProvider {
  id: string;
  user_id: string;
  tenant_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  calendar_id: string | null;
  sync_token: string | null;
  status: 'active' | 'inactive' | 'error' | 'expired';
}

export class GoogleCalendarClient {
  private oauth2Client: any;
  private calendar: calendar_v3.Calendar;
  private provider: CalendarProvider;

  constructor(provider: CalendarProvider) {
    this.provider = provider;

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URI
    );

    // Set credentials
    this.oauth2Client.setCredentials({
      access_token: decryptToken(provider.access_token),
      refresh_token: provider.refresh_token ? decryptToken(provider.refresh_token) : undefined,
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Ensure access token is valid, refresh if needed
   */
  private async ensureValidToken(): Promise<void> {
    if (!isTokenExpired(this.provider.token_expires_at)) {
      return;
    }

    if (!this.provider.refresh_token) {
      throw new Error('No refresh token available');
    }

    // Refresh the token
    const tokenData = await refreshGoogleToken(decryptToken(this.provider.refresh_token));

    // Update provider in database
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('calendar_providers')
      .update({
        access_token: encryptToken(tokenData.access_token),
        token_expires_at: calculateTokenExpiry(tokenData.expires_in).toISOString(),
        status: 'active',
      })
      .eq('id', this.provider.id);

    if (error) {
      throw new Error(`Failed to update token: ${error.message}`);
    }

    // Update local provider
    this.provider.access_token = encryptToken(tokenData.access_token);
    this.provider.token_expires_at = calculateTokenExpiry(tokenData.expires_in).toISOString();

    // Update OAuth client
    this.oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: this.provider.refresh_token ? decryptToken(this.provider.refresh_token) : undefined,
    });
  }

  /**
   * List calendar events
   */
  async listEvents(params: {
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
    syncToken?: string;
    pageToken?: string;
  }): Promise<{
    items: calendar_v3.Schema$Event[];
    nextPageToken?: string;
    nextSyncToken?: string;
  }> {
    await this.ensureValidToken();

    const calendarId = this.provider.calendar_id || 'primary';

    const response = await this.calendar.events.list({
      calendarId,
      timeMin: params.timeMin?.toISOString(),
      timeMax: params.timeMax?.toISOString(),
      maxResults: params.maxResults || 250,
      singleEvents: true,
      orderBy: 'startTime',
      syncToken: params.syncToken,
      pageToken: params.pageToken,
    });

    return {
      items: response.data.items || [],
      nextPageToken: response.data.nextPageToken || undefined,
      nextSyncToken: response.data.nextSyncToken || undefined,
    };
  }

  /**
   * Get a single event
   */
  async getEvent(eventId: string): Promise<calendar_v3.Schema$Event> {
    await this.ensureValidToken();

    const calendarId = this.provider.calendar_id || 'primary';

    const response = await this.calendar.events.get({
      calendarId,
      eventId,
    });

    return response.data;
  }

  /**
   * Create a new event
   */
  async createEvent(event: {
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    attendees?: { email: string; displayName?: string }[];
  }): Promise<calendar_v3.Schema$Event> {
    await this.ensureValidToken();

    const calendarId = this.provider.calendar_id || 'primary';

    const response = await this.calendar.events.insert({
      calendarId,
      requestBody: event,
      sendUpdates: 'all',
    });

    return response.data;
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    eventId: string,
    event: Partial<calendar_v3.Schema$Event>
  ): Promise<calendar_v3.Schema$Event> {
    await this.ensureValidToken();

    const calendarId = this.provider.calendar_id || 'primary';

    const response = await this.calendar.events.update({
      calendarId,
      eventId,
      requestBody: event,
      sendUpdates: 'all',
    });

    return response.data;
  }

  /**
   * Delete (cancel) an event
   */
  async deleteEvent(eventId: string): Promise<void> {
    await this.ensureValidToken();

    const calendarId = this.provider.calendar_id || 'primary';

    await this.calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: 'all',
    });
  }

  /**
   * Get user's calendar list
   */
  async listCalendars(): Promise<calendar_v3.Schema$CalendarListEntry[]> {
    await this.ensureValidToken();

    const response = await this.calendar.calendarList.list();

    return response.data.items || [];
  }

  /**
   * Get free/busy information
   */
  async getFreeBusy(params: {
    timeMin: Date;
    timeMax: Date;
    calendars: string[];
  }): Promise<calendar_v3.Schema$FreeBusyResponse> {
    await this.ensureValidToken();

    const response = await this.calendar.freebusy.query({
      requestBody: {
        timeMin: params.timeMin.toISOString(),
        timeMax: params.timeMax.toISOString(),
        items: params.calendars.map(id => ({ id })),
      },
    });

    return response.data;
  }
}

/**
 * Create a Google Calendar client from a provider record
 */
export async function createGoogleCalendarClient(providerId: string): Promise<GoogleCalendarClient> {
  const supabase = await createServerClient();

  const { data: provider, error } = await supabase
    .from('calendar_providers')
    .select('*')
    .eq('id', providerId)
    .eq('provider', 'google')
    .single();

  if (error || !provider) {
    throw new Error('Calendar provider not found');
  }

  if (provider.status !== 'active') {
    throw new Error(`Calendar provider is ${provider.status}`);
  }

  return new GoogleCalendarClient(provider as CalendarProvider);
}
