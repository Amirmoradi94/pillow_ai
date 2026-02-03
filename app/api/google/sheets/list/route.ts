import { NextResponse } from 'next/server';
import { listSpreadsheets } from '@/lib/google-sheets';
import { createClient } from '@/lib/supabase/server';

/**
 * List all Google Sheets accessible by the authenticated user
 * GET /api/google/sheets/list
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stored Google tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_auth_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData?.access_token) {
      return NextResponse.json(
        { error: 'Google account not connected', connected: false },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      // TODO: Implement token refresh logic
      return NextResponse.json(
        { error: 'Token expired, please reconnect', connected: false },
        { status: 401 }
      );
    }

    // List spreadsheets
    const spreadsheets = await listSpreadsheets(tokenData.access_token);

    return NextResponse.json({
      connected: true,
      spreadsheets: spreadsheets.map((file) => ({
        id: file.id,
        name: file.name,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
      })),
    });
  } catch (error) {
    console.error('Error listing spreadsheets:', error);
    return NextResponse.json(
      { error: 'Failed to list spreadsheets' },
      { status: 500 }
    );
  }
}
