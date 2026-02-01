import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth';
import { createServerClient } from '@/lib/supabase/server';

// POST /api/agents/[id]/test-call - Create web call for testing
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const supabase = await createServerClient();

    // Get agent to verify ownership and get Retell agent ID
    let agentQuery = supabase
      .from('voice_agents')
      .select('*')
      .eq('id', params.id)
      .single();

    if (user.role !== 'super_admin' && user.tenantId) {
      agentQuery = agentQuery.eq('tenant_id', user.tenantId);
    }

    const { data: agent, error: fetchError } = await agentQuery;

    if (fetchError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Create web call with Retell API
    const response = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agent.retell_agent_id,
        metadata: {
          test_call: true,
          user_id: user.id,
          agent_name: agent.name,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Retell API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create web call' },
        { status: response.status }
      );
    }

    const callData = await response.json();

    return NextResponse.json({
      access_token: callData.access_token,
      call_id: callData.call_id,
      call_status: callData.call_status,
    });
  } catch (error: any) {
    console.error('Error creating test call:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
