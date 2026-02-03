import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  try {
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

    // Get current user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch user data with tenant information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, tenants(*)')
      .eq('auth_id', authUser.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    const user = userData as any;
    const tenant = user.tenants;

    // Calculate remaining minutes
    const minutesRemaining = Math.max(
      0,
      (tenant?.monthly_minutes_limit || 100) - (tenant?.minutes_used_current_period || 0)
    );

    // Check if trial has expired
    const trialEndsAt = tenant?.trial_ends_at ? new Date(tenant.trial_ends_at) : null;
    const isTrialExpired = trialEndsAt ? new Date() > trialEndsAt : false;

    // Format subscription data
    const subscription = {
      tier: tenant?.subscription_tier || 'free_trial',
      status: isTrialExpired ? 'expired' : (tenant?.subscription_status || 'active'),
      trial_ends_at: tenant?.trial_ends_at,
      monthly_minutes_limit: tenant?.monthly_minutes_limit || 100,
      minutes_used: tenant?.minutes_used_current_period || 0,
      minutes_remaining: minutesRemaining,
      concurrency_limit: tenant?.concurrency_limit || 5,
      period_starts_at: tenant?.period_starts_at,
      period_ends_at: tenant?.period_ends_at,
    };

    return NextResponse.json({
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      tenant: {
        id: tenant?.id,
        name: tenant?.name,
      },
      subscription,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
