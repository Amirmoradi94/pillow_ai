/**
 * Retell Current Datetime API
 * POST /api/calendar/current-datetime/retell
 *
 * Internal API for voice agents to get exact current date/time in business timezone.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { formatInTimeZone } from 'date-fns-tz';

function isValidTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify internal API key
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.INTERNAL_API_KEY;

    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get agent ID from header
    const agentId = request.headers.get('x-agent-id');
    if (!agentId) {
      return NextResponse.json(
        { error: 'X-Agent-ID header required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get agent context
    const { data: agent } = await supabase
      .from('voice_agents')
      .select('tenant_id, settings')
      .eq('id', agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const requestedTimezone = body?.timezone as string | undefined;
    const settingsTimezone = (agent as any)?.settings?.timezone as string | undefined;

    let resolvedTimezone = requestedTimezone || settingsTimezone || 'UTC';

    // Try booking settings timezone if no explicit timezone passed.
    if (!requestedTimezone) {
      const { data: bookingSettings } = await supabase
        .from('booking_settings')
        .select('event_type_config')
        .eq('tenant_id', agent.tenant_id)
        .eq('agent_id', agentId)
        .maybeSingle();

      const bookingTimezone = bookingSettings?.event_type_config?.timezone as string | undefined;
      if (bookingTimezone) {
        resolvedTimezone = bookingTimezone;
      }
    }

    if (!isValidTimeZone(resolvedTimezone)) {
      resolvedTimezone = 'UTC';
    }

    const now = new Date();
    const currentDate = formatInTimeZone(now, resolvedTimezone, 'yyyy-MM-dd');
    const currentTime24 = formatInTimeZone(now, resolvedTimezone, 'HH:mm');
    const currentTime12 = formatInTimeZone(now, resolvedTimezone, 'h:mm a');
    const weekday = formatInTimeZone(now, resolvedTimezone, 'EEEE');
    const localIso = formatInTimeZone(now, resolvedTimezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
    const spoken = formatInTimeZone(now, resolvedTimezone, "EEEE, MMMM d, yyyy 'at' h:mm a zzz");

    return NextResponse.json({
      timezone: resolvedTimezone,
      now_utc_iso: now.toISOString(),
      now_local_iso: localIso,
      current_date: currentDate,
      current_time_24h: currentTime24,
      current_time_12h: currentTime12,
      weekday,
      spoken,
      message: `Current business time is ${spoken}. Use this as source of truth for scheduling.`,
    });
  } catch (error: any) {
    console.error('Retell current datetime API error:', error);
    return NextResponse.json(
      { error: 'Failed to get current datetime', details: error.message },
      { status: 500 }
    );
  }
}

