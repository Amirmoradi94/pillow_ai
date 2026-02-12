import { NextRequest, NextResponse } from 'next/server';
import { getPhoneNumber, updatePhoneNumber, deletePhoneNumber } from '@/lib/retell/client';
import { requireAuth } from '@/lib/supabase/auth';
import { createServerClient } from '@/lib/supabase/server';

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

    const { data, error } = await updatePhoneNumber(phoneNumber, {
      inboundAgentId,
      outboundAgentId,
      nickname,
      inboundWebhookUrl,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    const supabase = await createServerClient();
    const { data: existing } = await supabase
      .from('phone_numbers')
      .select('id')
      .eq('tenant_id', user.tenantId)
      .eq('number', phoneNumber)
      .single();

    if (existing?.id) {
      await supabase
        .from('phone_numbers')
        .update({
          inbound_agent_id: inboundAgentId ?? null,
          outbound_agent_id: outboundAgentId ?? null,
          nickname: nickname ?? null,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('phone_numbers').insert({
        tenant_id: user.tenantId,
        number: phoneNumber,
        status: 'active',
        source: 'purchased',
        created_by: user.id,
        inbound_agent_id: inboundAgentId || null,
        outbound_agent_id: outboundAgentId || null,
        agent_id: null,
      });
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

    const { error } = await deletePhoneNumber(phoneNumber);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    const supabase = await createServerClient();
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
