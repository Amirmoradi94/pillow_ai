import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';

// GET /api/team - List team members in current tenant
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createServerClient();

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    // Get all users in the current tenant
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', user.tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching team members:', error);
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    return NextResponse.json({ team: data });
  } catch (error) {
    console.error('Error in team API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/team - Invite a new team member
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Only admins can invite team members
    if (user.role === 'client') {
      return NextResponse.json({ error: 'Only admins can invite team members' }, { status: 403 });
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const body = await request.json();
    const { email, role, name } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    // Validate role (admins can only create admin or client roles, not super_admin)
    if (!['admin', 'client'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);

    // Create auth user using service role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false, // User will set password via email
      user_metadata: {
        role,
        name,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 500 });
    }

    // Create user record in database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        {
          email,
          role,
          tenant_id: user.tenantId,
          auth_id: authData.user.id,
        },
      ])
      .select()
      .single();

    if (userError) {
      console.error('Error creating user record:', userError);
      // Clean up auth user if database insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 });
    }

    // Send password reset email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    if (resetError) {
      console.error('Error sending password reset email:', resetError);
    }

    return NextResponse.json({
      user: userData,
      message: 'Team member invited successfully. They will receive an email to set their password.',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in team invite API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/team/[id] - Remove team member
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role === 'client') {
      return NextResponse.json({ error: 'Only admins can remove team members' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Get user to delete
    const { data: userToDelete, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user is in same tenant
    if (userToDelete.tenant_id !== user.tenantId) {
      return NextResponse.json({ error: 'Cannot remove users from other tenants' }, { status: 403 });
    }

    // Cannot delete yourself
    if (userToDelete.id === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    // Delete auth user
    if (userToDelete.auth_id) {
      await supabase.auth.admin.deleteUser(userToDelete.auth_id);
    }

    // Delete user record
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in team delete API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
