import { NextRequest, NextResponse } from 'next/server';
import { importPhoneNumber } from '@/lib/retell/client';
import { requireAuth } from '@/lib/supabase/auth';
import { createServerClient } from '@/lib/supabase/server';
import { getTenantFeatureLimit } from '@/lib/trial-utils';

// POST /api/phone-numbers/import - Import a BYON phone number via SIP trunk
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }
    if (user.role === 'client') {
      return NextResponse.json({ error: 'Only admins can import phone numbers' }, { status: 403 });
    }

    const body = await request.json();
    const {
      phoneNumber,
      terminationUri,
      sipTrunkAuthUsername,
      sipTrunkAuthPassword,
      inboundAgentId,
      outboundAgentId,
      nickname,
      inboundWebhookUrl,
      allowedInboundCountryList,
      allowedOutboundCountryList,
    } = body;

    if (!phoneNumber || !terminationUri) {
      return NextResponse.json(
        { error: 'phoneNumber and terminationUri are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const limit = await getTenantFeatureLimit(user.tenantId, 'max_phone_numbers');
    if (limit > 0) {
      const { count } = await supabase
        .from('phone_numbers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenantId);

      if ((count || 0) >= limit) {
        return NextResponse.json(
          { error: `Phone number limit reached (${limit}). Upgrade your plan to add more.` },
          { status: 403 }
        );
      }
    }

    const { data, error } = await importPhoneNumber({
      phoneNumber,
      terminationUri,
      sipTrunkAuthUsername,
      sipTrunkAuthPassword,
      inboundAgentId,
      outboundAgentId,
      nickname,
      inboundWebhookUrl,
      allowedInboundCountryList,
      allowedOutboundCountryList,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    await supabase.from('phone_numbers').insert({
      tenant_id: user.tenantId,
      number: data.phone_number,
      status: 'active',
      source: 'imported',
      created_by: user.id,
      inbound_agent_id: inboundAgentId || null,
      outbound_agent_id: outboundAgentId || null,
      agent_id: null,
    });

    return NextResponse.json({ phoneNumber: data }, { status: 201 });
  } catch (error) {
    console.error('Error importing phone number:', error);
    return NextResponse.json(
      { error: 'Failed to import phone number' },
      { status: 500 }
    );
  }
}
