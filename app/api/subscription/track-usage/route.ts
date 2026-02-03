import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function POST(request: NextRequest) {
  try {
    const { tenantId, minutesUsed } = await request.json();

    if (!tenantId || minutesUsed === undefined) {
      return NextResponse.json(
        { error: 'Tenant ID and minutes used are required' },
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

    // Get current tenant data
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (fetchError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Calculate new minutes used
    const newMinutesUsed = (tenant.minutes_used_current_period || 0) + minutesUsed;

    // Check if trial has expired
    const trialEndsAt = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null;
    const isTrialExpired = trialEndsAt ? new Date() > trialEndsAt : false;

    // Update tenant usage
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        minutes_used_current_period: newMinutesUsed,
        subscription_status: isTrialExpired ? 'expired' : tenant.subscription_status,
      })
      .eq('id', tenantId);

    if (updateError) {
      console.error('Error updating usage:', updateError);
      return NextResponse.json(
        { error: 'Failed to update usage' },
        { status: 500 }
      );
    }

    // Check if limit exceeded
    const limitExceeded = newMinutesUsed >= (tenant.monthly_minutes_limit || 100);

    return NextResponse.json({
      success: true,
      minutes_used: newMinutesUsed,
      minutes_limit: tenant.monthly_minutes_limit,
      limit_exceeded: limitExceeded,
      trial_expired: isTrialExpired,
    });
  } catch (error) {
    console.error('Track usage error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
