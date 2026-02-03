import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Webhook endpoint for scheduling follow-up callbacks
 * POST /api/webhooks/callback-scheduler
 *
 * This webhook is called by the Retell AI agent when a callback is requested
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      agent_id,
      business_name,
      phone_number,
      contact_person,
      callback_type, // 'human_rep', 'ai_followup', 'scheduled_demo'
      requested_datetime,
      reason,
      notes,
    } = body;

    if (!agent_id || !business_name || !phone_number || !callback_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get agent configuration
    const { data: agent, error: agentError } = await supabase
      .from('voice_agents')
      .select('tenant_id, name, settings')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Parse requested datetime
    const callbackDate = requested_datetime
      ? new Date(requested_datetime)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to 24 hours from now

    // Create calendar event for the callback
    const eventTitle =
      callback_type === 'human_rep'
        ? `Sales Callback: ${business_name}`
        : callback_type === 'scheduled_demo'
        ? `Product Demo: ${business_name}`
        : `Follow-up Call: ${business_name}`;

    const eventDescription = [
      `Business: ${business_name}`,
      `Phone: ${phone_number}`,
      contact_person ? `Contact: ${contact_person}` : '',
      `Reason: ${reason || 'Follow-up from sales call'}`,
      notes ? `Notes: ${notes}` : '',
      `Original Agent: ${agent.name}`,
    ]
      .filter(Boolean)
      .join('\n');

    // Insert callback event into calendar
    const { data: event, error: eventError } = await supabase
      .from('calendar_events')
      .insert({
        tenant_id: agent.tenant_id,
        title: eventTitle,
        description: eventDescription,
        start_time: callbackDate.toISOString(),
        end_time: new Date(callbackDate.getTime() + 30 * 60 * 1000).toISOString(), // 30 min duration
        timezone: 'America/New_York',
        status: 'tentative',
        booked_by: 'voice_agent',
        agent_id: agent_id,
        attendees: {
          business: business_name,
          phone: phone_number,
          contact: contact_person,
        },
        metadata: {
          callback_type,
          reason,
          original_call_date: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (eventError) {
      console.error('Error creating callback event:', eventError);
      return NextResponse.json(
        { error: 'Failed to schedule callback' },
        { status: 500 }
      );
    }

    // TODO: Send notification to admin/sales team
    // This could be implemented with email, Slack, etc.

    return NextResponse.json({
      success: true,
      message: 'Callback scheduled successfully',
      event: {
        id: event.id,
        title: eventTitle,
        scheduled_time: callbackDate.toISOString(),
        type: callback_type,
      },
    });
  } catch (error: any) {
    console.error('Error scheduling callback:', error);
    return NextResponse.json(
      { error: 'Failed to schedule callback', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Verify webhook endpoint is accessible
 * GET /api/webhooks/callback-scheduler
 */
export async function GET() {
  return NextResponse.json({
    webhook: 'callback-scheduler',
    status: 'active',
    description: 'Schedules follow-up callbacks and demos',
  });
}
