import { NextRequest, NextResponse } from 'next/server';
import { getPhoneNumber, updatePhoneNumber, deletePhoneNumber } from '@/lib/retell/client';

// GET /api/phone-numbers/[number] - Get a specific phone number
export async function GET(
  request: NextRequest,
  { params }: { params: { number: string } }
) {
  try {
    const phoneNumber = decodeURIComponent(params.number);

    const { data, error } = await getPhoneNumber(phoneNumber);

    if (error) {
      return NextResponse.json({ error }, { status: 404 });
    }

    return NextResponse.json({ phoneNumber: data });
  } catch (error) {
    console.error('Error getting phone number:', error);
    return NextResponse.json(
      { error: 'Failed to get phone number' },
      { status: 500 }
    );
  }
}

// PATCH /api/phone-numbers/[number] - Update a phone number
export async function PATCH(
  request: NextRequest,
  { params }: { params: { number: string } }
) {
  try {
    const phoneNumber = decodeURIComponent(params.number);
    const body = await request.json();
    const { inboundAgentId, outboundAgentId, nickname, inboundWebhookUrl } = body;

    const { data, error } = await updatePhoneNumber(phoneNumber, {
      inboundAgentId,
      outboundAgentId,
      nickname,
      inboundWebhookUrl,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ phoneNumber: data });
  } catch (error) {
    console.error('Error updating phone number:', error);
    return NextResponse.json(
      { error: 'Failed to update phone number' },
      { status: 500 }
    );
  }
}

// DELETE /api/phone-numbers/[number] - Delete a phone number
export async function DELETE(
  request: NextRequest,
  { params }: { params: { number: string } }
) {
  try {
    const phoneNumber = decodeURIComponent(params.number);

    const { error } = await deletePhoneNumber(phoneNumber);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error) {
    console.error('Error deleting phone number:', error);
    return NextResponse.json(
      { error: 'Failed to delete phone number' },
      { status: 500 }
    );
  }
}
