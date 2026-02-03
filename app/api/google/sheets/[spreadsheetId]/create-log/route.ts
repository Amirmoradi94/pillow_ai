import { NextRequest, NextResponse } from 'next/server';
import { createCallLogSheet } from '@/lib/google-sheets';
import { createClient } from '@/lib/supabase/server';

/**
 * Create a new call log sheet in an existing spreadsheet
 * POST /api/google/sheets/[spreadsheetId]/create-log
 * Body: { sheetName }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { spreadsheetId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sheetName } = body;

    if (!sheetName) {
      return NextResponse.json(
        { error: 'Sheet name required' },
        { status: 400 }
      );
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

    // Create call log sheet
    const createdSheetName = await createCallLogSheet(
      params.spreadsheetId,
      sheetName,
      tokenData.access_token
    );

    return NextResponse.json({
      success: true,
      sheetName: createdSheetName,
      message: 'Call log sheet created successfully',
    });
  } catch (error: any) {
    console.error('Error creating call log sheet:', error);

    // Handle case where sheet already exists
    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: 'Sheet with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create call log sheet' },
      { status: 500 }
    );
  }
}
