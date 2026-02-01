/**
 * Google Calendar OAuth - Callback Handler
 * GET /api/calendar/google/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServerClient } from '@/lib/supabase/server';
import { encryptToken, calculateTokenExpiry } from '@/lib/google-calendar/tokens';
import { performInitialSync } from '@/lib/google-calendar/sync';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // user_id
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/calendar?error=${error}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/calendar?error=missing_parameters', request.url)
      );
    }

    const supabase = await createServerClient();

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.id !== state) {
      return NextResponse.redirect(
        new URL('/dashboard/calendar?error=unauthorized', request.url)
      );
    }

    // Get user's tenant
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!userData?.tenant_id) {
      return NextResponse.redirect(
        new URL('/dashboard/calendar?error=no_tenant', request.url)
      );
    }

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL('/dashboard/calendar?error=token_exchange_failed', request.url)
      );
    }

    // Get user's email from Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Encrypt tokens
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : null;

    // Check if provider already exists
    const { data: existingProvider } = await supabase
      .from('calendar_providers')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('provider_email', userInfo.email!)
      .single();

    let providerId: string;

    if (existingProvider) {
      // Update existing provider
      const { data, error: updateError } = await supabase
        .from('calendar_providers')
        .update({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : calculateTokenExpiry(3600).toISOString(),
          status: 'active',
          sync_enabled: true,
        })
        .eq('id', existingProvider.id)
        .select('id')
        .single();

      if (updateError || !data) {
        throw new Error('Failed to update provider');
      }

      providerId = data.id;
    } else {
      // Create new provider
      const { data, error: insertError } = await supabase
        .from('calendar_providers')
        .insert({
          user_id: user.id,
          tenant_id: userData.tenant_id,
          provider: 'google',
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : calculateTokenExpiry(3600).toISOString(),
          provider_email: userInfo.email!,
          calendar_id: 'primary',
          sync_enabled: true,
          status: 'active',
          settings: {
            timezone: 'UTC',
            default_duration: 30,
            buffer_before: 0,
            buffer_after: 0,
          },
        })
        .select('id')
        .single();

      if (insertError || !data) {
        throw new Error('Failed to create provider');
      }

      providerId = data.id;
    }

    // Trigger initial sync in background
    performInitialSync(providerId).catch(error => {
      console.error('Initial sync failed:', error);
    });

    return NextResponse.redirect(
      new URL('/dashboard/calendar?success=connected', request.url)
    );
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/dashboard/calendar?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
