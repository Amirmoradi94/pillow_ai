/**
 * Calendar Events API
 * GET /api/calendar/events - List events
 * POST /api/calendar/events - Create event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { syncEventToGoogle } from '@/lib/google-calendar/sync';
import { fromZonedTime } from 'date-fns-tz';

function buildSalesSpecificEvents(
  agentId: string,
  tenantId: string,
  settings: any,
  startDate?: string | null,
  endDate?: string | null
) {
  const sales = settings?.salesAgentConfig;
  const schedule = sales?.schedule;

  if (!sales || !schedule) return [];
  if (settings?.template_id !== 'sales-agent-outbound') return [];
  if (schedule?.type !== 'custom' || schedule?.customMode !== 'specific') return [];

  const timezone = schedule?.timezone || 'UTC';
  const slots = Array.isArray(schedule?.specificDateTimes) ? schedule.specificDateTimes : [];
  if (!slots.length) return [];

  const now = new Date();
  const defaultWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const defaultWindowEnd = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
  const windowStart = startDate ? new Date(startDate) : defaultWindowStart;
  const windowEnd = endDate ? new Date(endDate) : defaultWindowEnd;

  return slots
    .filter((slot: any) => slot?.date && slot?.time)
    .map((slot: any) => {
      const startLocal = `${slot.date}T${slot.time}:00`;
      const startUtc = fromZonedTime(startLocal, timezone);
      const endUtc = new Date(startUtc.getTime() + 10 * 60 * 1000);
      return {
        id: `sales-slot-${agentId}-${slot.date}-${slot.time}`,
        tenant_id: tenantId,
        user_id: null,
        agent_id: agentId,
        calendar_provider_id: null,
        title: 'Outbound Sales Call',
        description: 'Scheduled outbound call (specific slot)',
        location: null,
        start_time: startUtc.toISOString(),
        end_time: endUtc.toISOString(),
        timezone,
        all_day: false,
        status: 'tentative',
        booked_by: 'voice_agent',
        attendees: [],
        metadata: {
          source: 'sales_schedule_specific_slot',
          slot_date: slot.date,
          slot_time: slot.time,
        },
        sync_source: 'internal',
      };
    })
    .filter((event) => {
      const start = new Date(event.start_time);
      return start >= windowStart && start <= windowEnd;
    });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's tenant
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!userData?.tenant_id) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const userId = searchParams.get('user_id');
    const agentId = searchParams.get('agent_id');
    const calendarProviderId = searchParams.get('calendar_provider_id');

    // Build query
    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .order('start_time', { ascending: true });

    if (startDate) {
      query = query.gte('start_time', startDate);
    }

    if (endDate) {
      query = query.lte('start_time', endDate);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    if (calendarProviderId) {
      query = query.eq('calendar_provider_id', calendarProviderId);
    }

    const { data: events, error } = await query;

    if (error) {
      throw error;
    }

    let syntheticSalesEvents: any[] = [];
    if (agentId) {
      const { data: agent } = await supabase
        .from('voice_agents')
        .select('settings')
        .eq('tenant_id', userData.tenant_id)
        .eq('id', agentId)
        .maybeSingle();

      if (agent?.settings) {
        syntheticSalesEvents = buildSalesSpecificEvents(
          agentId,
          userData.tenant_id,
          agent.settings,
          startDate,
          endDate
        );
      }
    }

    return NextResponse.json({
      events: [...(events || []), ...syntheticSalesEvents],
      total: (events?.length || 0) + syntheticSalesEvents.length,
    });
  } catch (error: any) {
    console.error('Events list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's tenant
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!userData?.tenant_id) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.start_time || !body.end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: title, start_time, end_time' },
        { status: 400 }
      );
    }

    // Create event
    const { data: event, error } = await supabase
      .from('calendar_events')
      .insert({
        tenant_id: userData.tenant_id,
        user_id: body.user_id || user.id,
        title: body.title,
        description: body.description,
        location: body.location,
        start_time: body.start_time,
        end_time: body.end_time,
        timezone: body.timezone || 'UTC',
        all_day: body.all_day || false,
        status: body.status || 'confirmed',
        booked_by: 'user',
        attendees: body.attendees || [],
        metadata: body.metadata || {},
      })
      .select('*')
      .single();

    if (error || !event) {
      throw new Error('Failed to create event');
    }

    // Sync to Google Calendar if requested and provider exists
    if (body.sync_to_google !== false) {
      const { data: provider } = await supabase
        .from('calendar_providers')
        .select('id')
        .eq('user_id', event.user_id!)
        .eq('provider', 'google')
        .eq('status', 'active')
        .single();

      if (provider) {
        syncEventToGoogle(event.id).catch(error => {
          console.error('Failed to sync event to Google:', error);
        });
      }
    }

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error: any) {
    console.error('Event creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create event', details: error.message },
      { status: 500 }
    );
  }
}
