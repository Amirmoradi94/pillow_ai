import { NextRequest, NextResponse } from 'next/server';
import { createPhoneNumber, listPhoneNumbers } from '@/lib/retell/client';

// GET /api/phone-numbers - List all phone numbers
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await listPhoneNumbers();

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ phoneNumbers: data || [] });
  } catch (error) {
    console.error('Error listing phone numbers:', error);
    return NextResponse.json(
      { error: 'Failed to list phone numbers' },
      { status: 500 }
    );
  }
}

// POST /api/phone-numbers - Create a new phone number
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { areaCode, inboundAgentId, outboundAgentId, nickname, countryCode, tollFree, numberProvider } = body;

    if (!areaCode) {
      return NextResponse.json(
        { error: 'Area code is required' },
        { status: 400 }
      );
    }

    const { data, error } = await createPhoneNumber({
      areaCode: parseInt(areaCode),
      inboundAgentId,
      outboundAgentId,
      nickname,
      countryCode,
      tollFree,
      numberProvider,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ phoneNumber: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating phone number:', error);
    return NextResponse.json(
      { error: 'Failed to create phone number' },
      { status: 500 }
    );
  }
}
