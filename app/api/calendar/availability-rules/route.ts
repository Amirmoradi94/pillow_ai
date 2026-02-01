/**
 * Availability Rules API
 * GET /api/calendar/availability-rules - List user's availability rules
 * POST /api/calendar/availability-rules - Create availability rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

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

    // Get availability rules
    const { data: rules, error } = await supabase
      .from('availability_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      rules: rules || [],
      total: rules?.length || 0,
    });
  } catch (error: any) {
    console.error('Availability rules list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability rules', details: error.message },
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
    if (!body.name || !body.schedule) {
      return NextResponse.json(
        { error: 'Missing required fields: name, schedule' },
        { status: 400 }
      );
    }

    // If this is default, unset other default rules
    if (body.is_default) {
      await supabase
        .from('availability_rules')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true);
    }

    // Create rule
    const { data: rule, error } = await supabase
      .from('availability_rules')
      .insert({
        tenant_id: userData.tenant_id,
        user_id: user.id,
        name: body.name,
        description: body.description,
        schedule: body.schedule,
        timezone: body.timezone || 'UTC',
        date_overrides: body.date_overrides || [],
        slot_duration: body.slot_duration || 30,
        buffer_before: body.buffer_before || 0,
        buffer_after: body.buffer_after || 0,
        min_booking_notice: body.min_booking_notice || 60,
        max_booking_notice: body.max_booking_notice || 43200,
        is_default: body.is_default || false,
        active: body.active !== false,
      })
      .select('*')
      .single();

    if (error || !rule) {
      throw new Error('Failed to create availability rule');
    }

    return NextResponse.json({
      success: true,
      rule,
    });
  } catch (error: any) {
    console.error('Availability rule creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create availability rule', details: error.message },
      { status: 500 }
    );
  }
}
