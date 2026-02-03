import { NextRequest, NextResponse } from 'next/server';
import { readSheet, parseProspectList } from '@/lib/google-sheets';
import { createClient } from '@/lib/supabase/server';

/**
 * Read data from a specific sheet
 * GET /api/google/sheets/[spreadsheetId]/read?range=Sheet1!A1:F100
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

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range');

    if (!range) {
      return NextResponse.json(
        { error: 'Range parameter required' },
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

    // Read sheet data
    const values = await readSheet(
      params.spreadsheetId,
      range,
      tokenData.access_token
    );

    return NextResponse.json({ values });
  } catch (error) {
    console.error('Error reading sheet:', error);
    return NextResponse.json(
      { error: 'Failed to read sheet data' },
      { status: 500 }
    );
  }
}

/**
 * Parse prospect list with column mapping
 * POST /api/google/sheets/[spreadsheetId]/read
 * Body: { range, columnMapping }
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
    const { range, columnMapping } = body;

    if (!range || !columnMapping) {
      return NextResponse.json(
        { error: 'Range and columnMapping required' },
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

    // Read and parse sheet data
    const values = await readSheet(
      params.spreadsheetId,
      range,
      tokenData.access_token
    );

    const prospects = parseProspectList(values, columnMapping);

    return NextResponse.json({ prospects, totalRows: prospects.length });
  } catch (error) {
    console.error('Error parsing prospect list:', error);
    return NextResponse.json(
      { error: 'Failed to parse prospect list' },
      { status: 500 }
    );
  }
}
