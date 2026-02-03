import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google-sheets';
import { createClient } from '@/lib/supabase/server';

/**
 * Handle Google OAuth callback
 * GET /api/google/sheets/callback?code=xxx&state=userId
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // userId passed during auth

  if (!code) {
    return NextResponse.redirect(
      new URL('/dashboard/agents/new?error=oauth_failed', request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Store tokens in database
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL('/dashboard/agents/new?error=unauthorized', request.url)
      );
    }

    // Store Google tokens in user metadata or separate table
    const { error } = await supabase
      .from('google_auth_tokens')
      .upsert({
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error storing tokens:', error);
      return NextResponse.redirect(
        new URL('/dashboard/agents/new?error=storage_failed', request.url)
      );
    }

    // Redirect back to agent creation with success
    return NextResponse.redirect(
      new URL('/dashboard/agents/new?google_connected=true', request.url)
    );
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/dashboard/agents/new?error=token_exchange_failed', request.url)
    );
  }
}
