import { NextRequest, NextResponse } from 'next/server';
import { getPhoneNumber, updatePhoneNumber, deletePhoneNumber } from '@/lib/retell/client';
import { requireAuth } from '@/lib/supabase/auth';
import { createServerClient } from '@/lib/supabase/server';

async function getInternalUserId(supabase: any, authUserId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authUserId)
    .single();

  if (error || !data?.id) {
    return null;
  }

  return data.id;
}

// GET /api/phone-numbers/[number] - Get a specific phone number
export async function GET(
  request: NextRequest,
  { params }: { params: { number: string } }
) {
  try {
    const user = await requireAuth();
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const phoneNumber = decodeURIComponent(params.number);
    const supabase = await createServerClient();
    const { data: ownedNumber } = await supabase
      .from('phone_numbers')
      .select('id')
      .eq('tenant_id', user.tenantId)
      .eq('number', phoneNumber)
      .single();

    if (!ownedNumber?.id) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

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
    const user = await requireAuth();
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }
    if (user.role === 'client') {
      return NextResponse.json({ error: 'Only admins can update phone numbers' }, { status: 403 });
    }

    const phoneNumber = decodeURIComponent(params.number);
    const body = await request.json();
    const { inboundAgentId, outboundAgentId, nickname, inboundWebhookUrl } = body;
    const supabase = await createServerClient();
    const internalUserId = await getInternalUserId(supabase, user.id);
    if (!internalUserId) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('phone_numbers')
      .select('id')
      .eq('tenant_id', user.tenantId)
      .eq('number', phoneNumber)
      .single();

    if (!existing?.id) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    const { data, error } = await updatePhoneNumber(phoneNumber, {
      inboundAgentId,
      outboundAgentId,
      nickname,
      inboundWebhookUrl,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
    const { error: updateError } = await supabase
      .from('phone_numbers')
      .update({
        inbound_agent_id: inboundAgentId ?? null,
        outbound_agent_id: outboundAgentId ?? null,
        nickname: nickname ?? null,
        created_by: internalUserId,
      })
      .eq('id', existing.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update phone number ownership' }, { status: 500 });
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
    const user = await requireAuth();
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }
    if (user.role === 'client') {
      return NextResponse.json({ error: 'Only admins can delete phone numbers' }, { status: 403 });
    }

    const phoneNumber = decodeURIComponent(params.number);
    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from('phone_numbers')
      .select('id')
      .eq('tenant_id', user.tenantId)
      .eq('number', phoneNumber)
      .single();

    if (!existing?.id) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    const { error } = await deletePhoneNumber(phoneNumber);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    await supabase
      .from('phone_numbers')
      .delete()
      .eq('tenant_id', user.tenantId)
      .eq('number', phoneNumber);

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error) {
    console.error('Error deleting phone number:', error);
    return NextResponse.json(
      { error: 'Failed to delete phone number' },
      { status: 500 }
    );
  }
}
