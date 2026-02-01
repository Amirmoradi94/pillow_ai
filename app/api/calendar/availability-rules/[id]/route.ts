/**
 * Availability Rule API
 * GET /api/calendar/availability-rules/:id - Get single rule
 * PUT /api/calendar/availability-rules/:id - Update rule
 * DELETE /api/calendar/availability-rules/:id - Delete rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get rule
    const { data: rule, error } = await supabase
      .from('availability_rules')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !rule) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ rule });
  } catch (error: any) {
    console.error('Get rule error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rule', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify rule belongs to user
    const { data: existing } = await supabase
      .from('availability_rules')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // If setting as default, unset other default rules
    if (body.is_default) {
      await supabase
        .from('availability_rules')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true)
        .neq('id', params.id);
    }

    // Update rule
    const { data: rule, error } = await supabase
      .from('availability_rules')
      .update({
        name: body.name,
        description: body.description,
        schedule: body.schedule,
        timezone: body.timezone,
        date_overrides: body.date_overrides,
        slot_duration: body.slot_duration,
        buffer_before: body.buffer_before,
        buffer_after: body.buffer_after,
        min_booking_notice: body.min_booking_notice,
        max_booking_notice: body.max_booking_notice,
        is_default: body.is_default,
        active: body.active,
      })
      .eq('id', params.id)
      .select('*')
      .single();

    if (error || !rule) {
      throw new Error('Failed to update rule');
    }

    return NextResponse.json({
      success: true,
      rule,
    });
  } catch (error: any) {
    console.error('Update rule error:', error);
    return NextResponse.json(
      { error: 'Failed to update rule', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Delete rule
    const { error } = await supabase
      .from('availability_rules')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete rule error:', error);
    return NextResponse.json(
      { error: 'Failed to delete rule', details: error.message },
      { status: 500 }
    );
  }
}
