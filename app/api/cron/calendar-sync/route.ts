/**
 * Calendar Sync Cron Job
 * GET /api/cron/calendar-sync
 *
 * Configure in vercel.json or run via scheduled task every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAllProviders } from '@/lib/google-calendar/sync';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting calendar sync cron job...');

    const results = await syncAllProviders();

    const summary = {
      totalProviders: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalEventsCreated: results.reduce((sum, r) => sum + r.eventsCreated, 0),
      totalEventsUpdated: results.reduce((sum, r) => sum + r.eventsUpdated, 0),
      totalEventsDeleted: results.reduce((sum, r) => sum + r.eventsDeleted, 0),
      errors: results.filter(r => r.error).map(r => ({
        providerId: r.providerId,
        error: r.error,
      })),
    };

    console.log('Calendar sync completed:', summary);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error: any) {
    console.error('Calendar sync cron error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error.message },
      { status: 500 }
    );
  }
}

// Allow POST as well for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
