/**
 * Calendar Providers API
 * GET /api/calendar/providers - List tenant calendar providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }
    const supabase = await createServiceClient();

    // Get all calendar providers in the tenant.
    // Service client bypasses user-scoped RLS so shared providers appear for all tenant members.
    const { data: providers, error } = await supabase
      .from('calendar_providers')
      .select('*')
      .eq('tenant_id', user.tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      // Gracefully degrade when PostgREST schema cache is stale/missing this table.
      if (error.code === 'PGRST205') {
        return NextResponse.json({ providers: [], total: 0 });
      }
      throw error;
    }

    // Don't expose sensitive tokens in the response
    const sanitizedProviders = providers?.map(provider => ({
      id: provider.id,
      provider: provider.provider,
      provider_email: provider.provider_email,
      status: provider.status,
      sync_enabled: provider.sync_enabled,
      last_synced_at: provider.last_synced_at,
      created_at: provider.created_at,
    })) || [];

    return NextResponse.json({
      providers: sanitizedProviders,
      total: sanitizedProviders.length,
    });
  } catch (error: any) {
    console.error('Providers list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers', details: error.message },
      { status: 500 }
    );
  }
}
