import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { updateRetellAgent, deleteRetellAgent, getRetellAgent } from '@/lib/retell/client';
import { requireAuth } from '@/lib/supabase/auth';

// GET /api/agents/[id] - Get a specific agent
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const supabase = await createServerClient();

    const { data: agent, error } = await supabase
      .from('voice_agents')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Type assertion after null check
    const voiceAgent = agent as any;

    // Check permissions
    if (user.role === 'client') {
      if (user.tenantId !== voiceAgent.tenant_id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else if (user.role === 'admin') {
      if (user.tenantId !== voiceAgent.tenant_id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    return NextResponse.json({ agent: voiceAgent });
  } catch (error) {
    console.error('Error in agent API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/agents/[id] - Update an agent
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

    // Get existing agent
    const { data: existingAgent, error: fetchError } = await supabase
      .from('voice_agents')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Type assertion after null check
    const voiceAgent = existingAgent as any;

    // Check permissions
    if (user.role === 'admin' && user.tenantId !== voiceAgent.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, script, settings, status } = body;

    // Update agent in Retell AI if script or settings changed
    if (script || settings) {
      const retellResult = await updateRetellAgent(voiceAgent.retell_agent_id || '', {
        name,
        script,
        voice_model: settings?.voice_model,
        language: settings?.language,
        response_speed: settings?.response_speed,
      });

      if (retellResult.error) {
        return NextResponse.json({ error: retellResult.error }, { status: 500 });
      }
    }

    // Update agent in database
    const updateData: any = {
      ...(name && { name }),
      ...(script && { script }),
      ...(settings && { settings }),
      ...(status && { status }),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('voice_agents')
      // @ts-ignore - Supabase type inference issue
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating agent:', error);
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
    }

    return NextResponse.json({ agent: data });
  } catch (error) {
    console.error('Error in agent API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/agents/[id] - Delete an agent
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

    // Get existing agent
    const { data: existingAgent, error: fetchError } = await supabase
      .from('voice_agents')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Type assertion after null check
    const voiceAgent = existingAgent as any;

    // Check permissions
    if (user.role === 'admin' && user.tenantId !== voiceAgent.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete agent from Retell AI
    if (voiceAgent.retell_agent_id) {
      const retellResult = await deleteRetellAgent(voiceAgent.retell_agent_id);
      if (retellResult.error) {
        console.error('Error deleting Retell agent:', retellResult.error);
      }
    }

    // Delete agent from database
    const { error } = await supabase
      .from('voice_agents')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting agent:', error);
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error in agent API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
