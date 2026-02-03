import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appendCallLog, CallLogEntry, updateProspectStatus } from '@/lib/google-sheets';

/**
 * Webhook endpoint for logging sales call outcomes
 * POST /api/webhooks/sales-log
 *
 * This webhook is called by the Retell AI agent when a sales call completes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      agent_id,
      business_name,
      phone_number,
      contact_person,
      call_duration,
      call_outcome,
      interest_level,
      pain_points_identified,
      objections_raised,
      next_action,
      follow_up_date,
      email_collected,
      notes,
    } = body;

    if (!agent_id || !business_name || !phone_number || !call_outcome) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get agent configuration to find Google Sheets details
    const { data: agent, error: agentError } = await supabase
      .from('voice_agents')
      .select('tenant_id, settings')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const settings = agent.settings as any;
    const salesConfig = settings?.salesAgentConfig;

    if (!salesConfig?.inputSheetId) {
      return NextResponse.json(
        { error: 'Sales agent not configured with Google Sheets' },
        { status: 400 }
      );
    }

    // Get user's Google tokens
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', agent.tenant_id)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get admin user for this tenant to get Google tokens
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('user_id')
      .eq('tenant_id', tenant.id)
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!userTenant) {
      return NextResponse.json(
        { error: 'No admin user found for tenant' },
        { status: 404 }
      );
    }

    const { data: tokenData } = await supabase
      .from('google_auth_tokens')
      .select('access_token')
      .eq('user_id', userTenant.user_id)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json(
        { error: 'Google Sheets not connected' },
        { status: 401 }
      );
    }

    // Format duration (convert seconds to "Xm Ys" format)
    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    // Create call log entry
    const logEntry: CallLogEntry = {
      timestamp: new Date().toISOString(),
      businessName: business_name,
      phoneNumber: phone_number,
      contactPerson: contact_person || '',
      duration: formatDuration(call_duration || 0),
      outcome: call_outcome,
      interestLevel: interest_level || '',
      painPoints: pain_points_identified || '',
      nextAction: next_action || '',
      followUpDate: follow_up_date || '',
      notes: [notes, objections_raised ? `Objections: ${objections_raised}` : '']
        .filter(Boolean)
        .join('. '),
    };

    // Append to call log sheet
    const callLogSheetName = salesConfig.outputSheetName || 'Sales Agent - Call Log';
    await appendCallLog(
      salesConfig.inputSheetId,
      callLogSheetName,
      logEntry,
      tokenData.access_token
    );

    // Update prospect status in input sheet
    const statusMap: { [key: string]: string } = {
      interested: 'Interested',
      not_interested: 'Not Interested',
      callback_requested: 'Callback',
      sent_information: 'Info Sent',
      voicemail: 'Voicemail',
      no_answer: 'No Answer',
      do_not_call: 'Do Not Call',
    };

    const status = statusMap[call_outcome] || 'Called';

    if (salesConfig.inputSheetName) {
      await updateProspectStatus(
        salesConfig.inputSheetId,
        salesConfig.inputSheetName,
        phone_number,
        status,
        tokenData.access_token
      );
    }

    // Also log the call in our database
    await supabase.from('calls').insert({
      agent_id,
      tenant_id: agent.tenant_id,
      phone_number,
      duration: call_duration || 0,
      transcript: notes || null,
      status: call_outcome === 'interested' ? 'completed' : 'completed',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Call logged successfully',
      logged_to_sheet: callLogSheetName,
    });
  } catch (error: any) {
    console.error('Error logging sales call:', error);
    return NextResponse.json(
      { error: 'Failed to log call', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Verify webhook endpoint is accessible
 * GET /api/webhooks/sales-log
 */
export async function GET() {
  return NextResponse.json({
    webhook: 'sales-log',
    status: 'active',
    description: 'Logs sales call outcomes to Google Sheets',
  });
}
