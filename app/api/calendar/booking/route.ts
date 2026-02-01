/**
 * Calendar Booking API
 * POST /api/calendar/booking - Create booking
 * GET /api/calendar/booking - List bookings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createBooking } from '@/lib/calendar/booking';

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
    if (!body.start_time || !body.duration || !body.attendee?.name || !body.attendee?.phone) {
      return NextResponse.json(
        { error: 'Missing required fields: start_time, duration, attendee.name, attendee.phone' },
        { status: 400 }
      );
    }

    // Create booking
    const result = await createBooking({
      tenantId: userData.tenant_id,
      agentId: body.agent_id,
      userId: body.user_id,
      startTime: new Date(body.start_time),
      duration: body.duration,
      attendee: {
        name: body.attendee.name,
        phone: body.attendee.phone,
        email: body.attendee.email,
      },
      notes: body.notes,
      timezone: body.timezone,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      booking_id: result.bookingId,
      event_id: result.eventId,
      user_id: result.userId,
      user_name: result.userName,
      start_time: result.startTime?.toISOString(),
      end_time: result.endTime?.toISOString(),
      confirmation_code: result.confirmationCode,
    });
  } catch (error: any) {
    console.error('Booking API error:', error);
    return NextResponse.json(
      { error: 'Failed to create booking', details: error.message },
      { status: 500 }
    );
  }
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
    const userId = searchParams.get('user_id');
    const agentId = searchParams.get('agent_id');
    const status = searchParams.get('status') || 'confirmed';

    // Build query
    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .eq('booked_by', 'voice_agent')
      .order('start_time', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: bookings, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      bookings: bookings || [],
      total: bookings?.length || 0,
    });
  } catch (error: any) {
    console.error('Bookings list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error.message },
      { status: 500 }
    );
  }
}
