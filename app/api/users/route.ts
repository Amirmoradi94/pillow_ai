import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/supabase/auth';

// GET /api/users - List all users
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const supabase = await createServerClient();

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');

    let query = supabase
      .from('users')
      .select(`
        *,
        tenants (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({ users: data });
  } catch (error) {
    console.error('Error in users API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const supabase = await createServerClient();

    const body = await request.json();
    const { email, role, tenant_id } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    if (!['super_admin', 'admin', 'client'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (role !== 'super_admin' && !tenant_id) {
      return NextResponse.json({ error: 'Tenant ID is required for this role' }, { status: 400 });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password: Math.random().toString(36).slice(-8), // Temporary password
      user_metadata: {
        role,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Create user record
    const { data, error } = await supabase
      .from('users')
      // @ts-ignore - Supabase type inference issue
      .insert([
        {
          email,
          role,
          tenant_id: role === 'super_admin' ? null : tenant_id,
          auth_id: authData.user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating user record:', error);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    return NextResponse.json({ user: data, tempPassword: 'User will receive an email to set password' }, { status: 201 });
  } catch (error) {
    console.error('Error in users API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
