/**
 * Calendar Events API
 * GET /api/calendar/events - List events
 * POST /api/calendar/events - Create event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { syncEventToGoogle } from '@/lib/google-calendar/sync';

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

    const { data: events, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      events: events || [],
      total: events?.length || 0,
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
