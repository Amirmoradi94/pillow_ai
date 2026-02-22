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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }
    const supabase = await createServiceClient();

    const body = await request.json();
    const rawId = params.id;
    const fallbackAgentId = rawId.startsWith('fallback-') ? rawId.slice('fallback-'.length) : null;
    const bookingSettingsId = fallbackAgentId ? null : rawId;
    const providerId = body.calendar_provider_id as string | undefined;
    const nextAgentId = (body.agent_id as string | null | undefined) ?? undefined;
    const calendarName = (body.calendar_name as string | undefined) || 'Agent Calendar';
    const timezone = (body.timezone as string | undefined) || 'UTC';
    const slotDuration = Number(body.slot_duration || 30);
    const dayStart = (body.day_start as string | undefined) || '09:00';
    const dayEnd = (body.day_end as string | undefined) || '17:00';

    if (!rawId) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Normal path: concrete booking_settings row.
    // Fallback path: synthetic "fallback-<agentId>" card rendered when booking_settings is unavailable.
    let settings: any = null;
    if (bookingSettingsId) {
      const { data: foundSettings } = await supabase
        .from('booking_settings')
        .select('id, tenant_id, agent_id, event_type_config')
        .eq('id', bookingSettingsId)
        .eq('tenant_id', user.tenantId)
        .single();
      settings = foundSettings;
      if (!settings?.id) {
        return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
      }
    } else if (fallbackAgentId) {
      settings = {
        id: null,
        tenant_id: user.tenantId,
        agent_id: fallbackAgentId,
        event_type_config: {},
      };
    } else {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    const targetAgentId = nextAgentId === undefined ? (settings.agent_id || null) : (nextAgentId || null);
    if (!targetAgentId) {
      return NextResponse.json(
        { error: 'Calendar must be linked to a voice agent' },
        { status: 400 }
      );
    }

    let agent: any = null;
    const { data: agentData } = await supabase
      .from('voice_agents')
      .select('id, tenant_id, name, settings')
      .eq('id', targetAgentId)
      .eq('tenant_id', user.tenantId)
      .single();

    if (!agentData) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    agent = agentData;

    if (bookingSettingsId) {
      const { data: otherForAgent } = await supabase
        .from('booking_settings')
        .select('id')
        .eq('tenant_id', user.tenantId)
        .eq('agent_id', targetAgentId)
        .neq('id', bookingSettingsId)
        .maybeSingle();
      if (otherForAgent?.id) {
        return NextResponse.json(
          { error: 'Selected agent already has another calendar assigned' },
          { status: 400 }
        );
      }
    } else {
      const { data: existingForAgent, error: existingForAgentError } = await supabase
        .from('booking_settings')
        .select('id')
        .eq('tenant_id', user.tenantId)
        .eq('agent_id', targetAgentId)
        .maybeSingle();

      if (existingForAgentError && !isBookingSettingsUnavailable(existingForAgentError)) {
        throw existingForAgentError;
      }

      if (existingForAgent?.id) {
        return NextResponse.json(
          { error: 'Selected agent already has another calendar assigned' },
          { status: 400 }
        );
      }
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

    const existingRuleId = settings?.event_type_config?.availability_rule_id as string | undefined;
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
      calendar_provider_id: provider?.id || null,
      availability_rule_id: ruleId,
      title_template: 'Appointment with {{customer_name}}',
      description_template: 'Phone: {{customer_phone}}',
    };

    // Update booking_settings when available. For fallback cards, attempt upsert by (tenant_id, agent_id).
    let persistedBookingSettingsId = bookingSettingsId;
    if (bookingSettingsId) {
      const { error: settingsError } = await supabase
        .from('booking_settings')
        .update({
          agent_id: targetAgentId,
          assignable_users: assignableUsers as any,
          distribution_strategy: 'specific_user',
          event_type_config: eventTypeConfig as any,
        })
        .eq('id', bookingSettingsId)
        .eq('tenant_id', user.tenantId);

      if (settingsError && !isBookingSettingsUnavailable(settingsError)) {
        throw new Error(`Failed to update booking settings: ${settingsError.message || 'unknown error'}`);
      }
    } else {
      const { data: existingBooking, error: existingBookingError } = await supabase
        .from('booking_settings')
        .select('id')
        .eq('tenant_id', user.tenantId)
        .eq('agent_id', targetAgentId)
        .maybeSingle();

      if (existingBookingError && !isBookingSettingsUnavailable(existingBookingError)) {
        throw new Error(`Failed to look up booking settings: ${existingBookingError.message || 'unknown error'}`);
      }

      if (existingBooking?.id) {
        const { data: updated, error: updateError } = await supabase
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

        if (updateError && !isBookingSettingsUnavailable(updateError)) {
          throw new Error(`Failed to update booking settings: ${updateError.message || 'unknown error'}`);
        }
        persistedBookingSettingsId = updated?.id || existingBooking.id;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('booking_settings')
          .insert({
            tenant_id: user.tenantId,
            agent_id: targetAgentId,
            assignable_users: assignableUsers as any,
            distribution_strategy: 'specific_user',
            event_type_config: eventTypeConfig as any,
          })
          .select('id')
          .single();

        if (insertError && !isBookingSettingsUnavailable(insertError)) {
          throw new Error(`Failed to create booking settings: ${insertError.message || 'unknown error'}`);
        }
        persistedBookingSettingsId = inserted?.id || null;
      }
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
      calendar: {
        id: persistedBookingSettingsId || rawId,
        agent_id: targetAgentId,
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
    console.error('Agent calendar update error:', error);
    return NextResponse.json(
      { error: 'Failed to update agent calendar', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }
    const supabase = await createServiceClient();

    const rawId = params.id;
    const fallbackAgentId = rawId.startsWith('fallback-') ? rawId.slice('fallback-'.length) : null;
    const bookingSettingsId = fallbackAgentId ? null : rawId;

    if (!rawId) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Get booking settings to find availability rule ID
    let availabilityRuleId: string | null = null;
    let agentId: string | null = null;

    if (bookingSettingsId) {
      const { data: settings } = await supabase
        .from('booking_settings')
        .select('id, tenant_id, agent_id, event_type_config')
        .eq('id', bookingSettingsId)
        .eq('tenant_id', user.tenantId)
        .single();

      if (!settings?.id) {
        return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
      }

      availabilityRuleId = settings.event_type_config?.availability_rule_id;
      agentId = settings.agent_id;

      // Delete trigger events associated with this calendar
      if (agentId) {
        const { error: deleteEventsError } = await supabase
          .from('calendar_events')
          .delete()
          .eq('tenant_id', user.tenantId)
          .eq('agent_id', agentId)
          .eq('booked_by', 'voice_agent');

        if (deleteEventsError && !isBookingSettingsUnavailable(deleteEventsError)) {
          console.warn('Failed to delete calendar events:', deleteEventsError);
        }
      }

      // Delete availability rule if exists
      if (availabilityRuleId) {
        const { error: deleteRuleError } = await supabase
          .from('availability_rules')
          .delete()
          .eq('id', availabilityRuleId)
          .eq('tenant_id', user.tenantId);

        if (deleteRuleError && !isAvailabilityRulesUnavailable(deleteRuleError)) {
          console.warn('Failed to delete availability rule:', deleteRuleError);
        }
      }

      // Delete booking settings
      const { error: deleteSettingsError } = await supabase
        .from('booking_settings')
        .delete()
        .eq('id', bookingSettingsId)
        .eq('tenant_id', user.tenantId);

      if (deleteSettingsError && !isBookingSettingsUnavailable(deleteSettingsError)) {
        throw new Error(`Failed to delete booking settings: ${deleteSettingsError.message || 'unknown error'}`);
      }

      // Clear calendar_provider_id from agent settings if agent exists
      if (agentId) {
        const { data: agent } = await supabase
          .from('voice_agents')
          .select('id, settings')
          .eq('id', agentId)
          .eq('tenant_id', user.tenantId)
          .single();

        if (agent?.id) {
          await supabase
            .from('voice_agents')
            .update({
              settings: {
                ...(agent as any).settings,
                calendar_provider_id: null,
              },
            })
            .eq('id', agent.id);
        }
      }
    } else if (fallbackAgentId) {
      // Fallback mode: try to delete by agent_id
      agentId = fallbackAgentId;

      // Delete trigger events
      const { error: deleteEventsError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('tenant_id', user.tenantId)
        .eq('agent_id', agentId)
        .eq('booked_by', 'voice_agent');

      if (deleteEventsError) {
        console.warn('Failed to delete calendar events:', deleteEventsError);
      }

      // Try to delete booking_settings by agent_id
      const { data: existingBooking } = await supabase
        .from('booking_settings')
        .select('id, event_type_config')
        .eq('tenant_id', user.tenantId)
        .eq('agent_id', agentId)
        .maybeSingle();

      if (existingBooking?.id) {
        availabilityRuleId = existingBooking.event_type_config?.availability_rule_id;

        const { error: deleteSettingsError } = await supabase
          .from('booking_settings')
          .delete()
          .eq('id', existingBooking.id)
          .eq('tenant_id', user.tenantId);

        if (deleteSettingsError && !isBookingSettingsUnavailable(deleteSettingsError)) {
          console.warn('Failed to delete booking settings:', deleteSettingsError);
        }
      }

      // Delete availability rule if exists
      if (availabilityRuleId) {
        const { error: deleteRuleError } = await supabase
          .from('availability_rules')
          .delete()
          .eq('id', availabilityRuleId)
          .eq('tenant_id', user.tenantId);

        if (deleteRuleError && !isAvailabilityRulesUnavailable(deleteRuleError)) {
          console.warn('Failed to delete availability rule:', deleteRuleError);
        }
      }

      // Clear calendar_provider_id from agent settings
      const { data: agent } = await supabase
        .from('voice_agents')
        .select('id, settings')
        .eq('id', agentId)
        .eq('tenant_id', user.tenantId)
        .single();

      if (agent?.id) {
        await supabase
          .from('voice_agents')
          .update({
            settings: {
              ...(agent as any).settings,
              calendar_provider_id: null,
            },
          })
          .eq('id', agent.id);
      }
    } else {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Agent calendar deleted successfully',
    });
  } catch (error: any) {
    if (typeof error?.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('Agent calendar delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent calendar', details: error.message },
      { status: 500 }
    );
  }
}
