import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

type ScheduleBlock = { start: string; end: string };
type WeeklySchedule = Record<string, ScheduleBlock[]>;
type OutboundRecurrenceUnit = 'day' | 'week' | 'month';
type OutboundSchedule = {
  type?: 'weekly' | 'custom';
  days?: string[];
  startTime?: string;
  endTime?: string;
  timezone?: string;
  callIntervalMinutes?: number;
  customStartDate?: string;
  customMode?: 'pattern' | 'specific';
  specificDateTimes?: Array<{ date: string; time: string }>;
  recurrence?: {
    enabled?: boolean;
    interval?: number;
    unit?: OutboundRecurrenceUnit;
  };
};

function getOutboundScheduleFromSettings(settings: any): OutboundSchedule | null {
  const schedule = settings?.salesAgentConfig?.schedule;
  if (!schedule || typeof schedule !== 'object') return null;
  return schedule as OutboundSchedule;
}

function defaultSchedule(start: string, end: string): WeeklySchedule {
  return {
    monday: [{ start, end }],
    tuesday: [{ start, end }],
    wednesday: [{ start, end }],
    thursday: [{ start, end }],
    friday: [{ start, end }],
    saturday: [],
    sunday: [],
  };
}

function isAvailabilityRulesUnavailable(error: any): boolean {
  const message = String(error?.message || '');
  return error?.code === 'PGRST205' && message.includes('availability_rules');
}

function isBookingSettingsUnavailable(error: any): boolean {
  const message = String(error?.message || '');
  return error?.code === 'PGRST205' && message.includes('booking_settings');
}

function extractDayWindow(schedule: WeeklySchedule | null | undefined): { day_start: string; day_end: string } {
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  for (const day of weekdays) {
    const slots = schedule?.[day];
    if (Array.isArray(slots) && slots.length > 0) {
      return {
        day_start: slots[0].start || '09:00',
        day_end: slots[0].end || '17:00',
      };
    }
  }
  return { day_start: '09:00', day_end: '17:00' };
}

const DAY_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MAX_TRIGGER_EVENTS = 5000;
const TRIGGER_HORIZON_DAYS = 120;
const CANADA_TIMEZONES = new Set([
  'America/St_Johns',
  'America/Halifax',
  'America/Toronto',
  'America/Winnipeg',
  'America/Edmonton',
  'America/Vancouver',
  'America/Whitehorse',
]);

function parseTimeToMinutes(value: string): number {
  const [h, m] = (value || '').split(':').map((v) => parseInt(v, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  return h * 60 + m;
}

function safeTimezone(input?: string): string {
  if (!input || !CANADA_TIMEZONES.has(input)) return 'America/Toronto';
  try {
    Intl.DateTimeFormat('en-US', { timeZone: input });
    return input;
  } catch {
    return 'America/Toronto';
  }
}

function isoDateFromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDateFromDate(d);
}

function daysBetween(startDate: string, endDate: string): number {
  const s = new Date(`${startDate}T00:00:00Z`);
  const e = new Date(`${endDate}T00:00:00Z`);
  return Math.floor((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000));
}

function monthsBetween(startDate: string, endDate: string): number {
  const s = new Date(`${startDate}T00:00:00Z`);
  const e = new Date(`${endDate}T00:00:00Z`);
  return (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth());
}

function dayNameForIsoDate(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  return DAY_MAP[d.getUTCDay()] || 'monday';
}

function firstSelectedDayOnOrAfter(dateIso: string, selectedDays: Set<string>): string | null {
  if (selectedDays.size === 0) return dateIso;
  for (let i = 0; i < 7; i++) {
    const candidate = addDaysIso(dateIso, i);
    if (selectedDays.has(dayNameForIsoDate(candidate))) return candidate;
  }
  return null;
}

function matchesPatternRecurrence(
  anchorDate: string,
  dateIso: string,
  dayName: string,
  selectedDays: Set<string>,
  recurrence: OutboundSchedule['recurrence']
): boolean {
  if (selectedDays.size > 0 && !selectedDays.has(dayName)) return false;
  const dayDiff = daysBetween(anchorDate, dateIso);
  if (dayDiff < 0) return false;

  if (!recurrence?.enabled) return dateIso === anchorDate;

  const interval = Math.max(1, recurrence.interval || 1);
  const unit = recurrence.unit || 'week';
  if (unit === 'day') return dayDiff % interval === 0;
  if (unit === 'week') return Math.floor(dayDiff / 7) % interval === 0;

  const monthDiff = monthsBetween(anchorDate, dateIso);
  if (monthDiff < 0 || monthDiff % interval !== 0) return false;
  const startDay = new Date(`${anchorDate}T00:00:00Z`).getUTCDate();
  const currentDay = new Date(`${dateIso}T00:00:00Z`).getUTCDate();
  return startDay === currentDay;
}

function buildTimeSlots(startTime: string, endTime: string, gapMinutes: number): string[] {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  const gap = Math.max(1, gapMinutes || 15);
  if (start < 0 || end < 0 || end <= start) return [];

  const slots: string[] = [];
  for (let minutes = start; minutes < end; minutes += gap) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

function buildOutboundTriggerEvents(params: {
  tenantId: string;
  ownerUserId: string;
  agentId: string;
  providerId?: string | null;
  schedule: OutboundSchedule;
}): any[] {
  const schedule = params.schedule;
  if (schedule?.type !== 'custom') return [];

  const timezone = safeTimezone(schedule.timezone);
  const now = new Date();
  const nowLocalDate = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
  const events: any[] = [];

  const pushEvent = (dateIso: string, time: string) => {
    if (events.length >= MAX_TRIGGER_EVENTS) return;
    const startUtc = fromZonedTime(`${dateIso}T${time}:00`, timezone);
    const slotDurationMinutes = Math.max(15, Number(schedule.callIntervalMinutes || 15));
    const endUtc = new Date(startUtc.getTime() + slotDurationMinutes * 60 * 1000);

    events.push({
      tenant_id: params.tenantId,
      user_id: params.ownerUserId,
      agent_id: params.agentId,
      calendar_provider_id: params.providerId || null,
      title: 'Outbound Sales Trigger',
      description: 'Cron trigger for outbound sales call',
      location: null,
      start_time: startUtc.toISOString(),
      end_time: endUtc.toISOString(),
      timezone,
      all_day: false,
      status: 'confirmed',
      booked_by: 'voice_agent',
      attendees: [],
      metadata: {
        source: 'sales_outbound_trigger',
        schedule_type: 'custom',
        custom_mode: schedule.customMode || 'pattern',
        slot_date: dateIso,
        slot_time: time,
      },
      sync_source: 'internal',
    });
  };

  if ((schedule.customMode || 'pattern') === 'specific') {
    for (const slot of schedule.specificDateTimes || []) {
      if (!slot?.date || !slot?.time) continue;
      pushEvent(slot.date, slot.time);
    }
    return events;
  }

  const anchorDate = schedule.customStartDate || nowLocalDate;
  const selectedDays = new Set((schedule.days || []).map((d) => d.toLowerCase()));
  const timeSlots = buildTimeSlots(schedule.startTime || '09:00', schedule.endTime || '17:00', schedule.callIntervalMinutes || 15);
  if (!timeSlots.length) return [];

  if (!schedule.recurrence?.enabled) {
    const firstDate = firstSelectedDayOnOrAfter(anchorDate, selectedDays);
    if (!firstDate) return [];
    for (const t of timeSlots) {
      pushEvent(firstDate, t);
      if (events.length >= MAX_TRIGGER_EVENTS) break;
    }
    return events;
  }

  for (let i = 0; i <= TRIGGER_HORIZON_DAYS && events.length < MAX_TRIGGER_EVENTS; i++) {
    const dateIso = addDaysIso(anchorDate, i);
    const dayName = dayNameForIsoDate(dateIso);
    if (!matchesPatternRecurrence(anchorDate, dateIso, dayName, selectedDays, schedule.recurrence)) {
      continue;
    }
    for (const t of timeSlots) {
      pushEvent(dateIso, t);
      if (events.length >= MAX_TRIGGER_EVENTS) break;
    }
  }

  return events;
}

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }
    const supabase = await createServiceClient();

    const { data: rows, error } = await supabase
      .from('booking_settings')
      .select('id, agent_id, distribution_strategy, assignable_users, event_type_config, voice_agents(id, name, settings, status)')
      .eq('tenant_id', user.tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      if (!isBookingSettingsUnavailable(error)) {
        throw error;
      }

      // Fallback: when booking_settings isn't available in schema cache, still show agent cards.
      const { data: agents, error: agentsError } = await supabase
        .from('voice_agents')
        .select('id, name, status, settings')
        .eq('tenant_id', user.tenantId)
        .order('created_at', { ascending: false });

      if (agentsError) {
        throw agentsError;
      }

      const fallbackProviderIds = (agents || [])
        .map((agent: any) => agent?.settings?.calendar_provider_id)
        .filter(Boolean);

      let fallbackProvidersById: Record<string, any> = {};
      if (fallbackProviderIds.length > 0) {
        const { data: providers, error: providersError } = await supabase
          .from('calendar_providers')
          .select('id, provider, provider_email, status')
          .in('id', fallbackProviderIds);

        if (!providersError) {
          fallbackProvidersById = Object.fromEntries((providers || []).map((p: any) => [p.id, p]));
        }
      }

      const fallbackCalendars = (agents || []).map((agent: any) => {
        const providerId = agent?.settings?.calendar_provider_id || null;
        const provider = providerId ? fallbackProvidersById[providerId] : null;
        const outboundSchedule = getOutboundScheduleFromSettings(agent?.settings);
        const isSalesOutbound = Boolean(outboundSchedule) || agent?.settings?.template_id === 'sales-agent-outbound';
        return {
          id: `fallback-${agent.id}`,
          agent_id: agent.id,
          agent_name: agent.name || 'Unknown Agent',
          agent_status: agent.status || 'inactive',
          calendar_name: `${agent.name || 'Agent'} Calendar`,
          timezone: safeTimezone(outboundSchedule?.timezone || 'America/Toronto'),
          availability_rule_id: null,
          slot_duration: Number(outboundSchedule?.callIntervalMinutes || 30),
          day_start: outboundSchedule?.startTime || '09:00',
          day_end: outboundSchedule?.endTime || '17:00',
          calendar_provider_id: providerId,
          owner_user_id: null,
          distribution_strategy: 'specific_user',
          is_sales_outbound: isSalesOutbound,
          sales_schedule_mode: outboundSchedule?.customMode || null,
          sales_specific_slots: Array.isArray(outboundSchedule?.specificDateTimes)
            ? outboundSchedule.specificDateTimes
            : [],
          provider: provider
            ? {
                id: provider.id,
                type: provider.provider,
                email: provider.provider_email,
                status: provider.status,
              }
            : null,
        };
      });

      return NextResponse.json({
        calendars: fallbackCalendars,
        total: fallbackCalendars.length,
        warning: 'booking_settings unavailable in schema cache; showing fallback agent calendars',
      });
    }

    const linkedRows = (rows || []).filter((r: any) => Boolean(r?.agent_id && r?.voice_agents?.id));

    const providerIds = linkedRows
      .map((r: any) => (
        r?.voice_agents?.settings?.calendar_provider_id ||
        r?.event_type_config?.calendar_provider_id ||
        (Array.isArray(r?.assignable_users) ? r.assignable_users?.[0]?.calendar_provider_id : undefined)
      ))
      .filter(Boolean);

    let providersById: Record<string, any> = {};
    if (providerIds.length > 0) {
      const { data: providers } = await supabase
        .from('calendar_providers')
        .select('id, provider, provider_email, status')
        .in('id', providerIds);
      providersById = Object.fromEntries((providers || []).map((p: any) => [p.id, p]));
    }

    const availabilityRuleIds = linkedRows
      .map((r: any) => r?.event_type_config?.availability_rule_id)
      .filter(Boolean);

    let rulesById: Record<string, any> = {};
    if (availabilityRuleIds.length > 0) {
      const { data: rules } = await supabase
        .from('availability_rules')
        .select('id, schedule, slot_duration')
        .in('id', availabilityRuleIds);
      rulesById = Object.fromEntries((rules || []).map((rule: any) => [rule.id, rule]));
    }

    const calendars = linkedRows.map((r: any) => {
      const providerId = r?.voice_agents?.settings?.calendar_provider_id ||
        r?.event_type_config?.calendar_provider_id ||
        (Array.isArray(r?.assignable_users) ? r.assignable_users?.[0]?.calendar_provider_id : undefined);
      const provider = providerId ? providersById[providerId] : null;
      const agentSettings = r?.voice_agents?.settings || {};
      const outboundSchedule = getOutboundScheduleFromSettings(agentSettings);
      const isSalesOutbound = Boolean(outboundSchedule) || agentSettings?.template_id === 'sales-agent-outbound';
      const availabilityRuleId = r?.event_type_config?.availability_rule_id || null;
      const availabilityRule = availabilityRuleId ? rulesById[availabilityRuleId] : null;
      const { day_start, day_end } = extractDayWindow(availabilityRule?.schedule as WeeklySchedule | undefined);
      const ownerUserId = Array.isArray(r?.assignable_users) ? (r.assignable_users?.[0]?.user_id || null) : null;
      return {
        id: r.id,
        agent_id: r.agent_id || null,
        agent_name: r?.voice_agents?.name || 'Unassigned',
        agent_status: r?.voice_agents?.status || 'inactive',
        calendar_name: r?.event_type_config?.calendar_name || r?.voice_agents?.name || 'Agent Calendar',
        timezone: safeTimezone(outboundSchedule?.timezone || r?.event_type_config?.timezone || 'America/Toronto'),
        availability_rule_id: availabilityRuleId,
        slot_duration: Number(outboundSchedule?.callIntervalMinutes || r?.event_type_config?.duration || availabilityRule?.slot_duration || 30),
        day_start: outboundSchedule?.startTime || day_start,
        day_end: outboundSchedule?.endTime || day_end,
        calendar_provider_id: providerId || null,
        owner_user_id: ownerUserId,
        distribution_strategy: r?.distribution_strategy,
        is_sales_outbound: isSalesOutbound,
        sales_schedule_mode: outboundSchedule?.customMode || null,
        sales_specific_slots: Array.isArray(outboundSchedule?.specificDateTimes)
          ? outboundSchedule.specificDateTimes
          : [],
        provider: provider
          ? {
              id: provider.id,
              type: provider.provider,
              email: provider.provider_email,
              status: provider.status,
            }
          : null,
      };
    });

    return NextResponse.json({ calendars, total: calendars.length });
  } catch (error: any) {
    if (typeof error?.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('Agent calendars list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent calendars', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }
    const supabase = await createServiceClient();

    const body = await request.json();
    const agentId = body.agent_id as string | undefined;
    const providerId = body.calendar_provider_id as string | undefined;
    const calendarName = (body.calendar_name as string | undefined) || 'Agent Calendar';
    const inputTimezone = body.timezone as string | undefined;
    const inputSlotDuration = Number(body.slot_duration || 30);
    const inputDayStart = (body.day_start as string | undefined) || '09:00';
    const inputDayEnd = (body.day_end as string | undefined) || '17:00';
    const bodySalesSchedule = body.sales_schedule as OutboundSchedule | undefined;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing required field: agent_id' },
        { status: 400 }
      );
    }

    let agent: any = null;
    const { data: agentData } = await supabase
      .from('voice_agents')
      .select('id, tenant_id, name, settings')
      .eq('id', agentId)
      .eq('tenant_id', user.tenantId)
      .single();

    if (!agentData) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    agent = agentData;

    const hasSalesConfig = Boolean((agent?.settings as any)?.salesAgentConfig);
    const agentSalesSchedule = (agent?.settings as any)?.salesAgentConfig?.schedule as OutboundSchedule | undefined;
    const salesSchedule = bodySalesSchedule || agentSalesSchedule;
    const isOutboundCustomSchedule = hasSalesConfig && salesSchedule?.type === 'custom';

    const timezone = safeTimezone(salesSchedule?.timezone || inputTimezone || 'UTC');
    const slotDuration = Math.max(1, Number(salesSchedule?.callIntervalMinutes || inputSlotDuration || 30));
    const dayStart = salesSchedule?.startTime || inputDayStart || '09:00';
    const dayEnd = salesSchedule?.endTime || inputDayEnd || '17:00';

    const { data: internalUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .eq('tenant_id', user.tenantId)
      .single();

    if (!internalUser?.id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
    }

    let provider: { id: string; user_id: string } | null = null;
    if (providerId) {
      const { data: selectedProvider } = await supabase
        .from('calendar_providers')
        .select('id, user_id, tenant_id, status')
        .eq('id', providerId)
        .eq('tenant_id', user.tenantId)
        .eq('status', 'active')
        .single();

      if (!selectedProvider?.user_id) {
        return NextResponse.json(
          { error: 'Calendar provider not found or inactive' },
          { status: 400 }
        );
      }
      provider = { id: selectedProvider.id, user_id: selectedProvider.user_id };
    }

    const ownerUserId = provider?.user_id || internalUser.id;

    let existingSettings: any = null;
    if (agent?.id) {
      const { data } = await supabase
        .from('booking_settings')
        .select('id, event_type_config')
        .eq('tenant_id', user.tenantId)
        .eq('agent_id', agent.id)
        .maybeSingle();
      existingSettings = data;
    }

    const existingRuleId = existingSettings?.event_type_config?.availability_rule_id as string | undefined;

    let ruleId = existingRuleId;
    if (existingRuleId) {
      const { error: updateRuleError } = await supabase
        .from('availability_rules')
        .update({
          user_id: ownerUserId,
          name: agent ? `${calendarName} (${agent.name})` : calendarName,
          description: agent ? `Managed calendar for agent ${agent.id}` : 'Standalone calendar',
          schedule: defaultSchedule(dayStart, dayEnd),
          timezone,
          slot_duration: slotDuration,
          active: true,
        })
        .eq('id', existingRuleId)
        .eq('tenant_id', user.tenantId);

      if (updateRuleError) {
        if (isAvailabilityRulesUnavailable(updateRuleError)) {
          console.warn('availability_rules unavailable; continuing without rule linkage');
          ruleId = null;
        } else {
          throw new Error(`Failed to update availability rule: ${updateRuleError.message || 'unknown error'}`);
        }
      }
    } else {
      const { data: rule, error: ruleError } = await supabase
        .from('availability_rules')
        .insert({
          tenant_id: user.tenantId,
          user_id: ownerUserId,
          name: agent ? `${calendarName} (${agent.name})` : calendarName,
          description: agent ? `Auto-created for agent ${agent.id}` : 'Standalone calendar',
          schedule: defaultSchedule(dayStart, dayEnd),
          timezone,
          slot_duration: slotDuration,
          is_default: false,
          active: true,
        })
        .select('id')
        .single();

      if (ruleError || !rule) {
        if (isAvailabilityRulesUnavailable(ruleError)) {
          console.warn('availability_rules unavailable; continuing without rule linkage');
          ruleId = null;
        } else {
          throw new Error(`Failed to create availability rule: ${ruleError?.message || 'unknown error'}`);
        }
      } else {
        ruleId = rule.id;
      }
    }

    const assignableUsers = [
      {
        user_id: ownerUserId,
        priority: 1,
        ...(provider?.id ? { calendar_provider_id: provider.id } : {}),
      },
    ];

    const eventTypeConfig = {
      duration: slotDuration,
      calendar_name: calendarName,
      timezone,
      availability_rule_id: ruleId,
      calendar_provider_id: provider?.id || null,
      title_template: 'Appointment with {{customer_name}}',
      description_template: 'Phone: {{customer_phone}}',
    };

    let bookingSettings: any = null;
    let bookingError: any = null;
    if (agent?.id) {
      const { data: existingBooking, error: existingBookingError } = await supabase
        .from('booking_settings')
        .select('id')
        .eq('tenant_id', user.tenantId)
        .eq('agent_id', agent.id)
        .maybeSingle();

      if (existingBookingError && !isBookingSettingsUnavailable(existingBookingError)) {
        bookingError = existingBookingError;
      } else if (existingBooking?.id) {
        const result = await supabase
          .from('booking_settings')
          .update({
            assignable_users: assignableUsers as any,
            distribution_strategy: 'specific_user',
            event_type_config: eventTypeConfig as any,
          })
          .eq('id', existingBooking.id)
          .eq('tenant_id', user.tenantId)
          .select('id')
          .single();
        bookingSettings = result.data;
        bookingError = result.error;
      } else {
        const result = await supabase
          .from('booking_settings')
          .insert({
            tenant_id: user.tenantId,
            agent_id: agent.id,
            assignable_users: assignableUsers as any,
            distribution_strategy: 'specific_user',
            event_type_config: eventTypeConfig as any,
          })
          .select('id')
          .single();
        bookingSettings = result.data;
        bookingError = result.error;
      }
    }

    if (bookingError || !bookingSettings) {
      if (!isBookingSettingsUnavailable(bookingError)) {
        throw new Error(`Failed to create booking settings: ${bookingError?.message || 'unknown error'}`);
      }
      console.warn('booking_settings unavailable; continuing with agent-level calendar settings only');
    }

    if (agent?.id) {
      await supabase
        .from('voice_agents')
        .update({
          settings: {
            ...(agent as any).settings,
            calendar_provider_id: provider?.id || null,
          },
        })
        .eq('id', agent.id);
    }

    if (agent?.id && isOutboundCustomSchedule && salesSchedule) {
      const triggerEvents = buildOutboundTriggerEvents({
        tenantId: user.tenantId,
        ownerUserId,
        agentId: agent.id,
        providerId: provider?.id || null,
        schedule: salesSchedule,
      });

      if (triggerEvents.length > 0) {
        // Replace previously generated trigger events to keep schedule in sync.
        await supabase
          .from('calendar_events')
          .delete()
          .eq('tenant_id', user.tenantId)
          .eq('agent_id', agent.id)
          .filter('metadata->>source', 'eq', 'sales_outbound_trigger');

        await supabase
          .from('calendar_events')
          .insert(triggerEvents as any);
      }
    }

    return NextResponse.json({
      success: true,
      warning: isBookingSettingsUnavailable(bookingError)
        ? 'booking_settings unavailable in schema cache; saved partial calendar settings'
        : undefined,
      calendar: {
        id: bookingSettings?.id || null,
        agent_id: agent?.id || null,
        calendar_name: calendarName,
        timezone,
        calendar_provider_id: provider?.id || null,
        availability_rule_id: ruleId,
      },
    });
  } catch (error: any) {
    if (typeof error?.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('Agent calendar create error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent calendar', details: error.message },
      { status: 500 }
    );
  }
}
