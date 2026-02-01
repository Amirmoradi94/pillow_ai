/**
 * Google Calendar - Disconnect Provider
 * DELETE /api/calendar/google/disconnect/:id
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { google } from 'googleapis';
import { decryptToken } from '@/lib/google-calendar/tokens';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get provider
    const { data: provider, error: providerError } = await supabase
      .from('calendar_providers')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (providerError || !provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Revoke Google OAuth token
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET
      );

      await oauth2Client.revokeToken(decryptToken(provider.access_token));
    } catch (error) {
      console.error('Failed to revoke Google token:', error);
      // Continue with deletion even if revoke fails
    }

    // Delete all synced events
    await supabase
      .from('calendar_events')
      .delete()
      .eq('calendar_provider_id', params.id);

    // Delete provider
    const { error: deleteError } = await supabase
      .from('calendar_providers')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      throw new Error('Failed to delete provider');
    }

    return NextResponse.json({
      success: true,
      message: 'Calendar disconnected successfully',
    });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect calendar', details: error.message },
      { status: 500 }
    );
  }
}
