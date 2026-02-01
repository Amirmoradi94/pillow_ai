import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { updateRetellAgent, deleteRetellAgent, getRetellAgent } from '@/lib/retell/client';
import { requireAuth } from '@/lib/supabase/auth';
import { generateTools } from '@/lib/agent-templates';

// GET /api/agents/[id] - Get single agent
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const supabase = await createServerClient();

    // Apply RLS - users can only see their tenant's agents
    const { data, error } = await supabase
      .from('voice_agents')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching agent:', error);
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ agent: data });
  } catch (error) {
    console.error('Error in agents/[id] API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/agents/[id] - Update agent
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const supabase = await createServerClient();

    if (user.role === 'client') {
      return NextResponse.json({ error: 'Clients cannot update agents' }, { status: 403 });
    }

    const body = await request.json();
    const { name, script, settings, cal_event_type_id, transfer_phone, webhook_urls } = body;

    // Get existing agent to verify ownership and get Retell IDs
    const { data: existingAgent, error: fetchError } = await supabase
      .from('voice_agents')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();

    if (fetchError || !existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Type assertion after null check
    const agent = existingAgent as any;

    // Regenerate tools if tools_config is provided, otherwise use provided tools
    let tools = settings?.tools || [];

    if (settings?.tools_config) {
      tools = generateTools(settings.tools_config, {
        calApiKey: process.env.CAL_API_KEY,
        calEventTypeId: cal_event_type_id,
        transferPhone: transfer_phone,
        webhookUrls: webhook_urls,
        agentId: params.id,
      });
    }

    // Update agent in Retell AI
    const retellResult = await updateRetellAgent(
      agent.retell_agent_id,
      {
        name,
        script,
        voice_model: settings?.voice_model,
        language: settings?.language,
        response_speed: settings?.response_speed,
      },
      agent.retell_llm_id
    );

    if (retellResult.error) {
      return NextResponse.json({ error: retellResult.error }, { status: 500 });
    }

    // Update agent in database
    const { data, error } = await supabase
      .from('voice_agents')
      .update({
        name,
        script,
        settings: {
          ...settings,
          tools,
          cal_event_type_id,
          transfer_phone,
          webhook_urls,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating agent in database:', error);
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
    }

    return NextResponse.json({ agent: data });
  } catch (error) {
    console.error('Error in agents/[id] PUT route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/agents/[id] - Delete agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const supabase = await createServerClient();

    if (user.role === 'client') {
      return NextResponse.json({ error: 'Clients cannot delete agents' }, { status: 403 });
    }

    // Get existing agent to verify ownership and get Retell ID
    let agentQuery = supabase
      .from('voice_agents')
      .select('*')
      .eq('id', params.id)
      .single();

    if (user.role !== 'super_admin' && user.tenantId) {
      agentQuery = agentQuery.eq('tenant_id', user.tenantId);
    }

    const { data: existingAgent, error: fetchError } = await agentQuery;

    if (fetchError || !existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Delete from Retell AI
    const retellResult = await deleteRetellAgent(existingAgent.retell_agent_id);

    if (retellResult.error) {
      console.error('Error deleting from Retell:', retellResult.error);
      // Continue with database deletion even if Retell deletion fails
    }

    // Delete from database
    const { error } = await supabase
      .from('voice_agents')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting agent from database:', error);
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in agents/[id] DELETE route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
