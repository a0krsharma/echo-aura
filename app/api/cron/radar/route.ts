import { NextResponse } from 'next/server';
import { aggregateAllRadarFeeds } from '@/lib/radarAggregator';

/**
 * GET /api/cron/radar
 * Background worker / cron endpoint to calculate acoustic velocity scores
 * across all categories and write aggregated documents to radar_feeds/{category}.
 */
export async function GET() {
  try {
    const results = await aggregateAllRadarFeeds();
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      aggregated_categories: Object.keys(results),
    });
  } catch (error: any) {
    console.error('[API /api/cron/radar] Failed to aggregate radar feeds:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to aggregate radar feeds',
      },
      { status: 500 }
    );
  }
}
