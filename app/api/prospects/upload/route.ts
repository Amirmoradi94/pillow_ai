import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { parseCsv, validateBusinessHeaders, validateBusinessRows } from '@/lib/csv-utils';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }

    const content = await file.text();
    const { headers, rows } = parseCsv(content);

    const validation = validateBusinessHeaders(headers);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Missing required headers', missing: validation.missing },
        { status: 400 }
      );
    }

    const rowValidation = validateBusinessRows(rows, headers);
    if (!rowValidation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid rows in CSV',
          missingRows: rowValidation.missingRows,
          invalidPhoneRows: rowValidation.invalidPhoneRows,
        },
        { status: 400 }
      );
    }

    const uploadsDir = path.join(process.cwd(), 'data', 'sales', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const fileName = `${Date.now()}_${safeName}`;
    const filePath = path.join(uploadsDir, fileName);

    await fs.writeFile(filePath, content, 'utf-8');

    return NextResponse.json({
      id: fileName,
      name: file.name,
      rowCount: rows.length,
      headers,
    });
  } catch (error) {
    console.error('Error uploading prospects CSV:', error);
    return NextResponse.json(
      { error: 'Failed to upload CSV' },
      { status: 500 }
    );
  }
}
