import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth';
import { createServiceClient } from '@/lib/supabase/server';

type ScheduleBlock = { start: string; end: string };
type WeeklySchedule = Record<string, ScheduleBlock[]>;

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
        return {
          id: `fallback-${agent.id}`,
          agent_id: agent.id,
          agent_name: agent.name || 'Unknown Agent',
          agent_status: agent.status || 'inactive',
          calendar_name: `${agent.name || 'Agent'} Calendar`,
          timezone: 'UTC',
          availability_rule_id: null,
          slot_duration: 30,
          day_start: '09:00',
          day_end: '17:00',
          calendar_provider_id: providerId,
          owner_user_id: null,
          distribution_strategy: 'specific_user',
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

    const providerIds = (rows || [])
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

    const availabilityRuleIds = (rows || [])
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

    const calendars = (rows || []).map((r: any) => {
      const providerId = r?.voice_agents?.settings?.calendar_provider_id ||
        r?.event_type_config?.calendar_provider_id ||
        (Array.isArray(r?.assignable_users) ? r.assignable_users?.[0]?.calendar_provider_id : undefined);
      const provider = providerId ? providersById[providerId] : null;
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
        timezone: r?.event_type_config?.timezone || 'UTC',
        availability_rule_id: availabilityRuleId,
        slot_duration: Number(r?.event_type_config?.duration || availabilityRule?.slot_duration || 30),
        day_start,
        day_end,
        calendar_provider_id: providerId || null,
        owner_user_id: ownerUserId,
        distribution_strategy: r?.distribution_strategy,
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
    const timezone = (body.timezone as string | undefined) || 'UTC';
    const slotDuration = Number(body.slot_duration || 30);
    const dayStart = (body.day_start as string | undefined) || '09:00';
    const dayEnd = (body.day_end as string | undefined) || '17:00';

    let agent: any = null;
    if (agentId) {
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
    }

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
      const result = await supabase
        .from('booking_settings')
        .upsert({
          tenant_id: user.tenantId,
          agent_id: agent.id,
          assignable_users: assignableUsers as any,
          distribution_strategy: 'specific_user',
          event_type_config: eventTypeConfig as any,
        }, { onConflict: 'tenant_id,agent_id' })
        .select('id')
        .single();
      bookingSettings = result.data;
      bookingError = result.error;
    } else {
      const result = await supabase
        .from('booking_settings')
        .insert({
          tenant_id: user.tenantId,
          agent_id: null,
          assignable_users: assignableUsers as any,
          distribution_strategy: 'specific_user',
          event_type_config: eventTypeConfig as any,
        })
        .select('id')
        .single();
      bookingSettings = result.data;
      bookingError = result.error;
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
