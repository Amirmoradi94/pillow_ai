import { NextRequest, NextResponse } from 'next/server';
import { createPhoneNumber, listPhoneNumbers } from '@/lib/retell/client';
import { createServerClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getTenantFeatureLimit } from '@/lib/trial-utils';

// GET /api/phone-numbers - List all phone numbers
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: dbNumbers, error: dbError } = await supabase
      .from('phone_numbers')
      .select('number')
      .eq('tenant_id', user.tenantId);

    if (dbError) {
      return NextResponse.json({ error: 'Failed to load phone numbers' }, { status: 500 });
    }

    const allowedNumbers = new Set((dbNumbers || []).map((row: any) => row.number));
    const { data, error } = await listPhoneNumbers();

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    const filtered = (data || []).filter((phone: any) => allowedNumbers.has(phone.phone_number));
    return NextResponse.json({ phoneNumbers: filtered });
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
    const user = await requireAuth();
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }
    if (user.role === 'client') {
      return NextResponse.json({ error: 'Only admins can purchase phone numbers' }, { status: 403 });
    }

    const body = await request.json();
    const { areaCode, inboundAgentId, outboundAgentId, nickname, countryCode, tollFree, numberProvider } = body;

    if (!areaCode) {
      return NextResponse.json(
        { error: 'Area code is required' },
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
      const status = error.includes('card on file') ? 402 : 500;
      return NextResponse.json({ error }, { status });
    }

    await supabase.from('phone_numbers').insert({
      tenant_id: user.tenantId,
      number: data.phone_number,
      status: 'active',
      source: 'purchased',
      created_by: user.id,
      inbound_agent_id: inboundAgentId || null,
      outbound_agent_id: outboundAgentId || null,
      agent_id: null,
    });

    return NextResponse.json({ phoneNumber: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating phone number:', error);
    return NextResponse.json(
      { error: 'Failed to create phone number' },
      { status: 500 }
    );
  }
}
