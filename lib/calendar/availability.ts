/**
 * Calendar Availability Engine
 * Calculates available time slots based on working hours and existing events
 */

import { createServerClient } from '@/lib/supabase/server';
import { addMinutes, format, parse, startOfDay, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export interface TimeSlot {
  start_time: Date;
  end_time: Date;
  user_id: string;
  user_name?: string;
}

export interface AvailabilityRule {
  id: string;
  schedule: {
    [key: string]: { start: string; end: string }[];
  };
  timezone: string;
  date_overrides: { date: string; available: boolean; reason?: string }[];
  min_booking_notice: number;
  max_booking_notice: number;
  slot_duration: number;
  buffer_before: number;
  buffer_after: number;
}

/**
 * Get day of week name from date
 */
function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * Check if a date has an override
 */
function getDateOverride(
  date: Date,
  overrides: { date: string; available: boolean }[]
): { available: boolean } | null {
  const dateStr = format(date, 'yyyy-MM-dd');
  return overrides.find(o => o.date === dateStr) || null;
}

/**
 * Get working hours for a specific date
 */
function getWorkingHours(
  date: Date,
  rule: AvailabilityRule
): { start: string; end: string }[] | null {
  // Check for date override
  const override = getDateOverride(date, rule.date_overrides);
  if (override && !override.available) {
    return null;
  }

  const dayOfWeek = getDayOfWeek(date);
  return rule.schedule[dayOfWeek] || null;
}

/**
 * Generate time slots for a date based on working hours
 */
function generateTimeSlots(
  date: Date,
  workingHours: { start: string; end: string }[],
  slotDuration: number,
  timezone: string
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (const hours of workingHours) {
    // Parse start and end times
    const dayStart = parse(hours.start, 'HH:mm', date);
    const dayEnd = parse(hours.end, 'HH:mm', date);

    // Convert to user's timezone
    let currentSlot = fromZonedTime(dayStart, timezone);
    const endTime = fromZonedTime(dayEnd, timezone);

    while (currentSlot < endTime) {
      const slotEnd = addMinutes(currentSlot, slotDuration);

      if (slotEnd <= endTime) {
        slots.push({
          start_time: currentSlot,
          end_time: slotEnd,
          user_id: '',
        });
      }

      currentSlot = slotEnd;
    }
  }

  return slots;
}

/**
 * Filter out slots that conflict with existing events
 */
function filterConflictingSlots(
  slots: TimeSlot[],
  events: { start_time: string; end_time: string }[],
  bufferBefore: number,
  bufferAfter: number
): TimeSlot[] {
  return slots.filter(slot => {
    // Add buffer times
    const slotStart = addMinutes(slot.start_time, -bufferBefore);
    const slotEnd = addMinutes(slot.end_time, bufferAfter);

    // Check for conflicts with any event
    return !events.some(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);

      // Check if slot overlaps with event
      return (
        (slotStart >= eventStart && slotStart < eventEnd) ||
        (slotEnd > eventStart && slotEnd <= eventEnd) ||
        (slotStart <= eventStart && slotEnd >= eventEnd)
      );
    });
  });
}

/**
 * Calculate available slots for a user on a specific date
 */
export async function getAvailableSlotsForUser(params: {
  userId: string;
  date: Date;
  duration?: number;
  timezone?: string;
}): Promise<TimeSlot[]> {
  const supabase = await createServerClient();

  // Get user's availability rules
  const { data: rules } = await supabase
    .from('availability_rules')
    .select('*')
    .eq('user_id', params.userId)
    .eq('active', true)
    .order('is_default', { ascending: false });

  if (!rules || rules.length === 0) {
    return [];
  }

  const rule = rules[0] as unknown as AvailabilityRule;
  const timezone = params.timezone || rule.timezone || 'UTC';
  const duration = params.duration || rule.slot_duration;

  // Get working hours for the date
  const workingHours = getWorkingHours(params.date, rule);
  if (!workingHours) {
    return [];
  }

  // Generate all possible slots
  let slots = generateTimeSlots(params.date, workingHours, duration, timezone);

  // Apply min/max booking notice
  const now = new Date();
  const minBookingTime = addMinutes(now, rule.min_booking_notice);
  const maxBookingTime = addMinutes(now, rule.max_booking_notice);

  slots = slots.filter(slot =>
    slot.start_time >= minBookingTime && slot.start_time <= maxBookingTime
  );

  // Get existing events for the user on this date
  const dayStart = startOfDay(params.date);
  const dayEnd = addMinutes(dayStart, 24 * 60);

  const { data: events } = await supabase
    .from('calendar_events')
    .select('start_time, end_time')
    .eq('user_id', params.userId)
    .neq('status', 'cancelled')
    .gte('start_time', dayStart.toISOString())
    .lt('start_time', dayEnd.toISOString());

  // Filter out conflicting slots
  slots = filterConflictingSlots(
    slots,
    events || [],
    rule.buffer_before,
    rule.buffer_after
  );

  // Add user_id to slots
  return slots.map(slot => ({
    ...slot,
    user_id: params.userId,
  }));
}

/**
 * Get available slots across multiple users (for team scheduling)
 */
export async function getAvailableSlots(params: {
  tenantId: string;
  date: Date;
  duration?: number;
  timezone?: string;
  userIds?: string[];
  agentId?: string;
}): Promise<TimeSlot[]> {
  const supabase = await createServerClient();

  let targetUserIds = params.userIds;

  // If agent ID provided, get users from booking settings
  if (params.agentId && !targetUserIds) {
    const { data: settings } = await supabase
      .from('booking_settings')
      .select('assignable_users')
      .eq('tenant_id', params.tenantId)
      .eq('agent_id', params.agentId)
      .single();

    if (settings?.assignable_users) {
      targetUserIds = (settings.assignable_users as any[]).map(u => u.user_id);
    }
  }

  // If no specific users, get all users in tenant with availability rules
  if (!targetUserIds) {
    const { data: rules } = await supabase
      .from('availability_rules')
      .select('user_id')
      .eq('tenant_id', params.tenantId)
      .eq('active', true);

    targetUserIds = [...new Set(rules?.map(r => r.user_id) || [])];
  }

  if (targetUserIds.length === 0) {
    return [];
  }

  // Get slots for each user
  const allSlots: TimeSlot[] = [];

  for (const userId of targetUserIds) {
    const userSlots = await getAvailableSlotsForUser({
      userId,
      date: params.date,
      duration: params.duration,
      timezone: params.timezone,
    });

    allSlots.push(...userSlots);
  }

  // Get user names
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .in('id', targetUserIds);

  const userMap = new Map(users?.map(u => [u.id, u.email]) || []);

  // Add user names and sort by time
  return allSlots
    .map(slot => ({
      ...slot,
      user_name: userMap.get(slot.user_id),
    }))
    .sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
}

/**
 * Check if a specific time slot is available
 */
export async function isSlotAvailable(params: {
  userId: string;
  startTime: Date;
  endTime: Date;
}): Promise<boolean> {
  const supabase = await createServerClient();

  // Call database function
  const { data, error } = await supabase.rpc('check_slot_availability', {
    p_user_id: params.userId,
    p_start_time: params.startTime.toISOString(),
    p_end_time: params.endTime.toISOString(),
  });

  if (error) {
    console.error('Slot availability check error:', error);
    return false;
  }

  return data === true;
}
