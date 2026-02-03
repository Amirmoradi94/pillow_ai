import { NextRequest, NextResponse } from 'next/server';
import { getSpreadsheetInfo } from '@/lib/google-sheets';
import { createClient } from '@/lib/supabase/server';

/**
 * Get spreadsheet metadata and sheet names
 * GET /api/google/sheets/[spreadsheetId]/info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { spreadsheetId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stored Google tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_auth_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData?.access_token) {
      return NextResponse.json(
        { error: 'Google account not connected' },
        { status: 401 }
      );
    }

    // Get spreadsheet info
    const info = await getSpreadsheetInfo(
      params.spreadsheetId,
      tokenData.access_token
    );

    return NextResponse.json(info);
  } catch (error) {
    console.error('Error getting spreadsheet info:', error);
    return NextResponse.json(
      { error: 'Failed to get spreadsheet info' },
      { status: 500 }
    );
  }
}
