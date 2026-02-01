/**
 * Retell Calendar Availability API
 * POST /api/calendar/availability/retell
 *
 * Internal API for voice agents to check availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAvailableSlots } from '@/lib/calendar/availability';
import { parse, format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    // Verify internal API key
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.INTERNAL_API_KEY;

    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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

    // Get agent's tenant
    const { data: agent } = await supabase
      .from('voice_agents')
      .select('tenant_id')
      .eq('id', agentId)
      .single();

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.date) {
      return NextResponse.json(
        { error: 'Date parameter required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Parse date
    const date = parse(body.date, 'yyyy-MM-dd', new Date());
    const duration = body.duration || 30;
    const timezone = body.timezone || 'UTC';

    // Get available slots
    const slots = await getAvailableSlots({
      tenantId: agent.tenant_id,
      date,
      duration,
      timezone,
      agentId,
    });

    if (slots.length === 0) {
      return NextResponse.json({
        available: false,
        message: `No available time slots found for ${body.date}`,
        date: body.date,
        slots: [],
      });
    }

    // Format slots in a voice-friendly way
    const formattedSlots = slots.map(slot => {
      const timeStr = format(slot.start_time, 'h:mm a');
      return {
        time: timeStr,
        start_time: slot.start_time.toISOString(),
        end_time: slot.end_time.toISOString(),
        user_id: slot.user_id,
        user_name: slot.user_name,
      };
    });

    // Create a natural language summary for the voice agent
    const topSlots = formattedSlots.slice(0, 5);
    const timesList = topSlots.map(s => s.time).join(', ');

    return NextResponse.json({
      available: true,
      message: `I have ${slots.length} available slots on ${body.date}. The first few are: ${timesList}.`,
      date: body.date,
      total_slots: slots.length,
      slots: formattedSlots,
      summary: {
        first_available: topSlots[0]?.time,
        last_available: formattedSlots[formattedSlots.length - 1]?.time,
        total: slots.length,
      },
    });
  } catch (error: any) {
    console.error('Retell availability API error:', error);
    return NextResponse.json(
      { error: 'Failed to check availability', details: error.message },
      { status: 500 }
    );
  }
}
