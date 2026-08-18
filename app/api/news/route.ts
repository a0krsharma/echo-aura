import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveNewsDispatches, NewsCategory } from '@/lib/newsService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/news?category=all|world|tech|markets|sports|entertainment&q=search
 * Returns real-time world news dispatches with $0 API overhead.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = (searchParams.get('category') || 'all') as NewsCategory;
    const query = (searchParams.get('q') || '').toLowerCase().trim();

    let dispatches = await fetchLiveNewsDispatches(category);

    if (query) {
      dispatches = dispatches.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.description.toLowerCase().includes(query) ||
          d.source.toLowerCase().includes(query) ||
          d.topicTag.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      success: true,
      category,
      count: dispatches.length,
      dispatches,
    });
  } catch (error: any) {
    console.error('[API /api/news] Error fetching news:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch news dispatches',
      },
      { status: 500 }
    );
  }
}
