import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';

// GET /api/calls - List all calls for the tenant
export async function GET(request: NextRequest) {
  try {
  const user = await requireAuth();
  const supabase = await createServerClient();

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('calls')
      .select(`
        *,
        voice_agents (
          name
        )
      `)
      .eq('tenant_id', user.tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching calls:', error);
      return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
    }

    return NextResponse.json({ calls: data });
  } catch (error) {
    console.error('Error in calls API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/calls - Create a new call record (webhook from Retell)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();

    // Extract call data from webhook
    const {
      call_id,
      agent_id,
      phone_number,
      duration,
      transcript,
      status,
      recording_url,
    } = body;

    if (!call_id || !agent_id || !phone_number) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the agent in our database
    const { data: agent } = await supabase
      .from('voice_agents')
      .select('tenant_id, id')
      .eq('retell_agent_id', agent_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Type assertion after null check
    const voiceAgent = agent as any;

    // Create call record
    const { data, error } = await supabase
      .from('calls')
      // @ts-ignore - Supabase type inference issue
      .insert([
        {
          agent_id: voiceAgent.id,
          tenant_id: voiceAgent.tenant_id,
          phone_number,
          duration: duration || 0,
          transcript,
          status: status || 'completed',
          recording_url,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating call:', error);
      return NextResponse.json({ error: 'Failed to create call' }, { status: 500 });
    }

    return NextResponse.json({ call: data }, { status: 201 });
  } catch (error) {
    console.error('Error in calls API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
