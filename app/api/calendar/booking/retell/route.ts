/**
 * Retell Calendar Booking API
 * POST /api/calendar/booking/retell
 *
 * Internal API for voice agents to book appointments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createBooking } from '@/lib/calendar/booking';
import { format } from 'date-fns';

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
      .select('tenant_id, name')
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
    if (!body.date_time || !body.customer_name || !body.customer_phone) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['date_time', 'customer_name', 'customer_phone'],
        },
        { status: 400 }
      );
    }

    // Parse date/time
    const startTime = new Date(body.date_time);
    const duration = body.duration || 30;
    const timezone = body.timezone || 'UTC';

    // Get call ID from context if available
    const callId = body.call_id;

    // Create booking
    const result = await createBooking({
      tenantId: agent.tenant_id,
      agentId,
      startTime,
      duration,
      attendee: {
        name: body.customer_name,
        phone: body.customer_phone,
        email: body.customer_email,
      },
      notes: body.notes,
      callId,
      timezone,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: `I'm sorry, but I couldn't book the appointment. ${result.error}`,
        error: result.error,
      });
    }

    // Format confirmation message for voice agent
    const confirmationTime = format(startTime, 'EEEE, MMMM do \'at\' h:mm a');

    const message = [
      `Great! I've successfully booked your appointment for ${confirmationTime}.`,
      result.userName ? `You'll be meeting with ${result.userName}.` : '',
      result.confirmationCode ? `Your confirmation code is ${result.confirmationCode.split('').join(' ')}.` : '',
      body.customer_email ? `A confirmation email has been sent to ${body.customer_email}.` : '',
      'Is there anything else I can help you with?',
    ]
      .filter(Boolean)
      .join(' ');

    return NextResponse.json({
      success: true,
      message,
      booking: {
        id: result.bookingId,
        confirmation_code: result.confirmationCode,
        start_time: result.startTime?.toISOString(),
        end_time: result.endTime?.toISOString(),
        user_id: result.userId,
        user_name: result.userName,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        customer_email: body.customer_email,
      },
    });
  } catch (error: any) {
    console.error('Retell booking API error:', error);

    return NextResponse.json({
      success: false,
      message: "I'm sorry, but I encountered an error while booking your appointment. Please try again or contact us directly.",
      error: error.message,
    });
  }
}
