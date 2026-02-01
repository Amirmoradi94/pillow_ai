/**
 * Calendar Availability API
 * GET /api/calendar/availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAvailableSlots } from '@/lib/calendar/availability';
import { parse } from 'date-fns';

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
    const dateStr = searchParams.get('date');
    const duration = searchParams.get('duration');
    const timezone = searchParams.get('timezone');
    const userIdParam = searchParams.get('user_id');
    const agentId = searchParams.get('agent_id');

    if (!dateStr) {
      return NextResponse.json(
        { error: 'Date parameter required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Parse date
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());

    // Get available slots
    const slots = await getAvailableSlots({
      tenantId: userData.tenant_id,
      date,
      duration: duration ? parseInt(duration) : undefined,
      timezone: timezone || undefined,
      userIds: userIdParam ? [userIdParam] : undefined,
      agentId: agentId || undefined,
    });

    // Format response
    const formattedSlots = slots.map(slot => ({
      start_time: slot.start_time.toISOString(),
      end_time: slot.end_time.toISOString(),
      user_id: slot.user_id,
      user_name: slot.user_name,
    }));

    return NextResponse.json({
      date: dateStr,
      timezone: timezone || 'UTC',
      slots: formattedSlots,
      total: formattedSlots.length,
    });
  } catch (error: any) {
    console.error('Availability API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability', details: error.message },
      { status: 500 }
    );
  }
}
