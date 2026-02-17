/**
 * Sales Outbound Dialer Cron Job
 * GET /api/cron/sales-outbound
 *
 * Triggers automatic outbound calls for eligible sales agents.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runSalesOutboundWorker } from '@/lib/sales-outbound-worker';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const summary = await runSalesOutboundWorker(new Date());

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error: any) {
    console.error('Sales outbound cron error:', error);
    return NextResponse.json(
      { error: 'Sales outbound worker failed', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
