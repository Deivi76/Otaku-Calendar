import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@otaku-calendar/db';

export const dynamic = 'force-dynamic';

type RumorStatus = 'unverified' | 'circulating' | 'likely' | 'confirmed' | 'denied';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;

    const { data: rumor, error } = await supabase
      .from('rumors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Rumor not found' }, { status: 404 });
      }
      console.error('Error fetching rumor:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let sources: Array<{ id: string; name: string; url: string }> = [];
    if (rumor.source_ids && rumor.source_ids.length > 0) {
      const { data: sourcesData } = await supabase
        .from('sources')
        .select('id, name, url')
        .in('id', rumor.source_ids);

      if (sourcesData) {
        sources = sourcesData;
      }
    }

    return NextResponse.json({
      rumor: {
        ...rumor,
        sources,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/rumors/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
