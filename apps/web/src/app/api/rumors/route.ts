import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@otaku-calendar/db';

export const dynamic = 'force-dynamic';

type RumorStatus = 'unverified' | 'circulating' | 'likely' | 'confirmed' | 'denied';
type MediaType = 'anime' | 'manga' | 'manhwa' | 'live_action' | 'film';
type SortOption = 'recent' | 'confidence' | 'sources';

interface RumorRow {
  id: string;
  title: string;
  content: string | null;
  source_ids: string[] | null;
  status: string;
  confidence_score: number | null;
  related_anime_id: string | null;
  first_seen_at: string;
  last_updated: string;
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as RumorStatus | null;
    const minConfidence = searchParams.get('minConfidence');
    const sort = searchParams.get('sort') as SortOption | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabase.from('rumors').select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (minConfidence) {
      query = query.gte('confidence_score', parseInt(minConfidence) / 100);
    }

    const sortFieldMap: Record<SortOption, string> = {
      recent: 'first_seen_at',
      confidence: 'confidence_score',
      sources: 'source_ids',
    };
    const sortField = sort ? sortFieldMap[sort] : 'first_seen_at';
    const sortOrder = sort === 'confidence' ? 'desc' : 'desc';
    query = query.order(sortField, { ascending: false, nullsFirst: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: rumors, error, count } = await query;

    if (error) {
      console.error('Error fetching rumors:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: statsData } = await supabase
      .from('rumors')
      .select('status')
      .then(({ data }) => ({ data }));

    const stats: Record<string, number> = { unverified: 0, circulating: 0, likely: 0, confirmed: 0, denied: 0 };
    if (statsData) {
      statsData.forEach((r: { status: string }) => {
        const s = r.status as RumorStatus;
        if (s in stats) stats[s]++;
      });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      rumors: rumors || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats,
    });
  } catch (error) {
    console.error('Error in GET /api/rumors:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { title, content, type, status = 'unverified', confidenceScore } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const rumorData: Record<string, unknown> = {
      title,
      content: content || null,
      status,
      confidence_score: confidenceScore ? confidenceScore / 100 : null,
      first_seen_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('rumors').insert(rumorData).select().single();

    if (error) {
      console.error('Error creating rumor:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rumor: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/rumors:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
