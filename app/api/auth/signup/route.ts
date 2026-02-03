import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, companyName } = await request.json();

    if (!email || !password || !fullName || !companyName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore errors from Server Components
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Create tenant and user record
    if (data.user) {
      // Calculate trial end date (14 days from now)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      // First, create a new tenant for this business
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert([
          {
            name: companyName,
            brand_config: {},
            subscription_tier: 'free_trial',
            subscription_status: 'active',
            trial_ends_at: trialEndsAt.toISOString(),
            monthly_minutes_limit: 100,
            minutes_used_current_period: 0,
            period_starts_at: new Date().toISOString(),
            period_ends_at: trialEndsAt.toISOString(),
            concurrency_limit: 5,
          },
        ])
        .select()
        .single();

      if (tenantError) {
        console.error('Error creating tenant:', tenantError);
        return NextResponse.json(
          { error: 'Failed to create business account' },
          { status: 500 }
        );
      }

      const tenant = tenantData as any;

      // Create user as admin of this tenant
      const { error: userError } = await supabase.from('users').insert([
        {
          auth_id: data.user.id,
          email: email,
          full_name: fullName,
          role: 'admin', // New signups are admins of their own business
          tenant_id: tenant.id,
        },
      ]);

      if (userError) {
        console.error('Error creating user record:', userError);
        // If user creation fails, delete the tenant
        await supabase.from('tenants').delete().eq('id', tenant.id);
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Check your email to confirm your account',
      user: data.user,
    });
  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
