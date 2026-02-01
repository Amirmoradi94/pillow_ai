/**
 * Calendar Providers API
 * GET /api/calendar/providers - List user's calendar providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's calendar providers
    const { data: providers, error } = await supabase
      .from('calendar_providers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
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
