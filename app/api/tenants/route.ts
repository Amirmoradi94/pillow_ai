import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/supabase/auth';

// GET /api/tenants - List all tenants
export async function GET() {
  try {
    await requireSuperAdmin();
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('tenants')
      .select(`
        *,
        users (
          id,
          email,
          role
        ),
        voice_agents (
          id,
          name,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenants:', error);
      return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
    }

    return NextResponse.json({ tenants: data });
  } catch (error) {
    console.error('Error in tenants API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tenants - Create a new tenant
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const supabase = await createServerClient();

    const body = await request.json();
    const { name, brand_config } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tenants')
      // @ts-ignore - Supabase type inference issue
      .insert([
        {
          name,
          brand_config: brand_config || {},
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating tenant:', error);
      return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
    }

    return NextResponse.json({ tenant: data }, { status: 201 });
  } catch (error) {
    console.error('Error in tenants API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
