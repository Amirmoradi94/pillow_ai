/**
 * Calendar Booking Engine
 * Handles appointment booking with conflict detection and distribution strategies
 */

import { createServerClient } from '@/lib/supabase/server';
import { addMinutes } from 'date-fns';
import { isSlotAvailable } from './availability';
import { syncEventToGoogle } from '@/lib/google-calendar/sync';

export interface BookingParams {
  tenantId: string;
  agentId?: string;
  userId?: string; // Specific user to book with (optional)
  startTime: Date;
  duration: number; // in minutes
  attendee: {
    name: string;
    phone: string;
    email?: string;
  };
  notes?: string;
  callId?: string;
  timezone?: string;
}

export interface BookingResult {
  success: boolean;
  bookingId?: string;
  eventId?: string;
  userId?: string;
  userName?: string;
  startTime?: Date;
  endTime?: Date;
  confirmationCode?: string;
  error?: string;
}

/**
 * Generate a confirmation code
 */
function generateConfirmationCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Get next available user based on distribution strategy
 */
async function getAssignedUser(
  tenantId: string,
  agentId: string | undefined,
  startTime: Date,
  endTime: Date,
  requestedUserId?: string
): Promise<string | null> {
  const supabase = await createServerClient();

  // If specific user requested, check if available
  if (requestedUserId) {
    const available = await isSlotAvailable({
      userId: requestedUserId,
      startTime,
      endTime,
    });

    return available ? requestedUserId : null;
  }

  // Get booking settings
  const { data: settings } = await supabase
    .from('booking_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId || null)
    .single();

  if (!settings || !settings.assignable_users) {
    return null;
  }

  const assignableUsers = settings.assignable_users as any[];
  const strategy = settings.distribution_strategy;

  if (strategy === 'specific_user' && assignableUsers.length > 0) {
    const userId = assignableUsers[0].user_id;
    const available = await isSlotAvailable({ userId, startTime, endTime });
    return available ? userId : null;
  }

  if (strategy === 'priority') {
    // Sort by priority and find first available
    const sorted = [...assignableUsers].sort((a, b) => (a.priority || 0) - (b.priority || 0));
    for (const user of sorted) {
      const available = await isSlotAvailable({
        userId: user.user_id,
        startTime,
        endTime,
      });
      if (available) return user.user_id;
    }
    return null;
  }

  if (strategy === 'least_busy') {
    // Find user with fewest bookings in the next 7 days
    const weekFromNow = addMinutes(startTime, 7 * 24 * 60);

    let leastBusyUser = null;
    let minBookings = Infinity;

    for (const user of assignableUsers) {
      const { count } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user_id)
        .neq('status', 'cancelled')
        .gte('start_time', startTime.toISOString())
        .lte('start_time', weekFromNow.toISOString());

      const available = await isSlotAvailable({
        userId: user.user_id,
        startTime,
        endTime,
      });

      if (available && (count || 0) < minBookings) {
        minBookings = count || 0;
        leastBusyUser = user.user_id;
      }
    }

    return leastBusyUser;
  }

  // Default: round_robin
  // Use database function for round-robin
  const { data: userId } = await supabase.rpc('get_next_available_user', {
    p_tenant_id: tenantId,
    p_agent_id: agentId || null,
    p_start_time: startTime.toISOString(),
    p_end_time: endTime.toISOString(),
  });

  return userId;
}

/**
 * Create a booking
 */
export async function createBooking(params: BookingParams): Promise<BookingResult> {
  const supabase = await createServerClient();

  try {
    const endTime = addMinutes(params.startTime, params.duration);

    // Get assigned user
    const userId = await getAssignedUser(
      params.tenantId,
      params.agentId,
      params.startTime,
      endTime,
      params.userId
    );

    if (!userId) {
      return {
        success: false,
        error: 'No available user found for the requested time slot',
      };
    }

    // Double-check availability (race condition protection)
    const available = await isSlotAvailable({
      userId,
      startTime: params.startTime,
      endTime,
    });

    if (!available) {
      return {
        success: false,
        error: 'Time slot is no longer available',
      };
    }

    // Get booking settings for event configuration
    const { data: settings } = await supabase
      .from('booking_settings')
      .select('event_type_config')
      .eq('tenant_id', params.tenantId)
      .eq('agent_id', params.agentId || null)
      .single();

    const eventConfig = (settings?.event_type_config as any) || {
      duration: 30,
      title_template: 'Appointment with {{customer_name}}',
      description_template: 'Phone: {{customer_phone}}',
    };

    // Generate title and description from templates
    const title = eventConfig.title_template
      .replace('{{customer_name}}', params.attendee.name)
      .replace('{{customer_phone}}', params.attendee.phone)
      .replace('{{customer_email}}', params.attendee.email || '');

    const description = eventConfig.description_template
      .replace('{{customer_name}}', params.attendee.name)
      .replace('{{customer_phone}}', params.attendee.phone)
      .replace('{{customer_email}}', params.attendee.email || '')
      .replace('{{notes}}', params.notes || '');

    const confirmationCode = generateConfirmationCode();

    // Create calendar event
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .insert({
        tenant_id: params.tenantId,
        user_id: userId,
        title,
        description,
        start_time: params.startTime.toISOString(),
        end_time: endTime.toISOString(),
        timezone: params.timezone || 'UTC',
        status: 'confirmed',
        booked_by: 'voice_agent',
        agent_id: params.agentId,
        call_id: params.callId,
        attendees: [
          {
            name: params.attendee.name,
            phone: params.attendee.phone,
            email: params.attendee.email,
            status: 'accepted',
          },
        ],
        metadata: {
          confirmation_code: confirmationCode,
          notes: params.notes,
        },
      })
      .select('*')
      .single();

    if (eventError || !event) {
      throw new Error('Failed to create calendar event');
    }

    // Get user name
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    // Sync to Google Calendar if provider exists
    const { data: provider } = await supabase
      .from('calendar_providers')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .eq('status', 'active')
      .single();

    if (provider) {
      syncEventToGoogle(event.id).catch(error => {
        console.error('Failed to sync event to Google:', error);
      });
    }

    // TODO: Send confirmation email/SMS

    return {
      success: true,
      bookingId: event.id,
      eventId: event.id,
      userId,
      userName: user?.email,
      startTime: params.startTime,
      endTime,
      confirmationCode,
    };
  } catch (error: any) {
    console.error('Booking error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(eventId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  try {
    // Get event
    const { data: event } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    // Update status to cancelled
    const { error } = await supabase
      .from('calendar_events')
      .update({ status: 'cancelled' })
      .eq('id', eventId);

    if (error) {
      throw error;
    }

    // Sync cancellation to Google Calendar if applicable
    if (event.calendar_provider_id && event.external_event_id) {
      syncEventToGoogle(eventId).catch(error => {
        console.error('Failed to sync cancellation to Google:', error);
      });
    }

    // TODO: Send cancellation email/SMS

    return { success: true };
  } catch (error: any) {
    console.error('Cancellation error:', error);
    return { success: false, error: error.message };
  }
}
