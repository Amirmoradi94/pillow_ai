import { NextRequest, NextResponse } from 'next/server';
import { createPhoneNumber, deletePhoneNumber, listPhoneNumbers } from '@/lib/retell/client';
import { createServerClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getTenantFeatureLimit } from '@/lib/trial-utils';

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
      .select('number,status,inbound_agent_id,outbound_agent_id')
      .eq('tenant_id', user.tenantId);

    if (dbError) {
      return NextResponse.json({ error: 'Failed to load phone numbers' }, { status: 500 });
    }

    const dbRows = dbNumbers || [];
    const allowedNumbers = new Set(dbRows.map((row: any) => row.number));
    const { data, error } = await listPhoneNumbers();

    if (error) {
      // Fallback to DB-owned numbers so newly purchased numbers still appear in UI.
      const fallbackNumbers = dbRows.map((row: any) => ({
        phone_number: row.number,
        phone_number_pretty: row.number,
        status: row.status || 'active',
        inbound_agent_id: row.inbound_agent_id || null,
        outbound_agent_id: row.outbound_agent_id || null,
      }));
      return NextResponse.json({ phoneNumbers: fallbackNumbers });
    }

    const remoteNumbers = Array.isArray(data)
      ? data
      : (data as any)?.phone_numbers || (data as any)?.items || [];

    const remoteByNumber = new Map(
      (remoteNumbers || []).map((phone: any) => [phone.phone_number || phone.number, phone])
    );

    const merged = dbRows.map((row: any) => {
      const remote = remoteByNumber.get(row.number);
      if (remote) return remote;
      return {
        phone_number: row.number,
        phone_number_pretty: row.number,
        status: row.status || 'active',
        inbound_agent_id: row.inbound_agent_id || null,
        outbound_agent_id: row.outbound_agent_id || null,
      };
    });

    const filtered = merged.filter((phone: any) =>
      allowedNumbers.has(phone.phone_number || phone.number)
    );
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
    const internalUserId = await getInternalUserId(supabase, user.id);
    if (!internalUserId) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
    }

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

    const { error: insertError } = await supabase.from('phone_numbers').insert({
      tenant_id: user.tenantId,
      number: data.phone_number,
      status: 'active',
      source: 'purchased',
      created_by: internalUserId,
      inbound_agent_id: inboundAgentId || null,
      outbound_agent_id: outboundAgentId || null,
      agent_id: null,
    });

    if (insertError) {
      // Keep ownership in sync: if DB write fails, release the purchased number in Retell.
      await deletePhoneNumber(data.phone_number);
      return NextResponse.json({ error: 'Failed to save phone number ownership' }, { status: 500 });
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
