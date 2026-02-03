import { NextRequest, NextResponse } from 'next/server';
import { appendCallLog, CallLogEntry } from '@/lib/google-sheets';
import { createClient } from '@/lib/supabase/server';

/**
 * Append a call log entry to the call log sheet
 * POST /api/google/sheets/[spreadsheetId]/append
 * Body: { sheetName, entry: CallLogEntry }
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
    const { sheetName, entry } = body;

    if (!sheetName || !entry) {
      return NextResponse.json(
        { error: 'Sheet name and entry required' },
        { status: 400 }
      );
    }

    // Validate entry has required fields
    if (!entry.businessName || !entry.phoneNumber || !entry.outcome) {
      return NextResponse.json(
        { error: 'Entry must have businessName, phoneNumber, and outcome' },
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

    // Ensure timestamp is set
    const logEntry: CallLogEntry = {
      timestamp: entry.timestamp || new Date().toISOString(),
      businessName: entry.businessName,
      phoneNumber: entry.phoneNumber,
      contactPerson: entry.contactPerson,
      duration: entry.duration || '0s',
      outcome: entry.outcome,
      interestLevel: entry.interestLevel,
      painPoints: entry.painPoints,
      nextAction: entry.nextAction,
      followUpDate: entry.followUpDate,
      notes: entry.notes,
    };

    // Append to sheet
    await appendCallLog(
      params.spreadsheetId,
      sheetName,
      logEntry,
      tokenData.access_token
    );

    return NextResponse.json({
      success: true,
      message: 'Call log entry added successfully',
    });
  } catch (error) {
    console.error('Error appending call log:', error);
    return NextResponse.json(
      { error: 'Failed to append call log entry' },
      { status: 500 }
    );
  }
}
