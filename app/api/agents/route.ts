import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createRetellAgent, updateRetellAgent, deleteRetellAgent } from '@/lib/retell/client';
import { requireAuth } from '@/lib/supabase/auth';
import { generateTools } from '@/lib/agent-templates';

// GET /api/agents - List all agents for the current tenant
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createServerClient();

    let query = supabase.from('voice_agents').select('*');

    if (user.role === 'super_admin') {
      // Super admins can see all agents
      query = query.order('created_at', { ascending: false });
    } else if (user.tenantId) {
      // Other users can only see their tenant's agents
      query = query.eq('tenant_id', user.tenantId).order('created_at', { ascending: false });
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching agents:', error);
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }

    return NextResponse.json({ agents: data });
  } catch (error) {
    console.error('Error in agents API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createServerClient();

    if (user.role === 'client') {
      return NextResponse.json({ error: 'Clients cannot create agents' }, { status: 403 });
    }

    const body = await request.json();
    const { name, script, settings, tenant_id, knowledge_base_ids, tools_config, cal_event_type_id, transfer_phone, template_id } = body;

    if (!name || !script) {
      return NextResponse.json({ error: 'Name and script are required' }, { status: 400 });
    }

    // Determine tenant_id
    let targetTenantId = tenant_id;

    if (user.role === 'admin') {
      // Admins can only create agents for their own tenant
      targetTenantId = user.tenantId;
    } else if (user.role === 'super_admin' && !targetTenantId) {
      return NextResponse.json({ error: 'Tenant ID is required for super admins' }, { status: 400 });
    }

    // Generate tools from config with server-side credentials
    const tools = tools_config ? generateTools(tools_config, {
      calApiKey: process.env.CAL_API_KEY,
      calEventTypeId: cal_event_type_id,
      transferPhone: transfer_phone,
    }) : [];

    // Create agent in Retell AI with knowledge bases and tools
    const retellResult = await createRetellAgent({
      name,
      script,
      voice_model: settings?.voice_model,
      language: settings?.language,
      response_speed: settings?.response_speed,
      knowledge_base_ids: knowledge_base_ids || [],
      tools: tools || [],
    });

    if (retellResult.error || !retellResult.data) {
      return NextResponse.json({ error: retellResult.error || 'Failed to create Retell agent' }, { status: 500 });
    }

    // Create agent in database
    const { data, error} = await supabase
      .from('voice_agents')
      // @ts-ignore - Supabase type inference issue
      .insert([
        {
          tenant_id: targetTenantId,
          name,
          script,
          settings: {
            ...settings,
            template_id,
            knowledge_base_ids,
            tools,
          },
          retell_agent_id: retellResult.data.agent_id,
          retell_llm_id: retellResult.data.llm_id,
          status: 'active',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating agent in database:', error);
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
    }

    return NextResponse.json({ agent: data }, { status: 201 });
  } catch (error) {
    console.error('Error in agents API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
