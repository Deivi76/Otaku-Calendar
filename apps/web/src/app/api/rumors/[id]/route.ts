import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { checkRateLimit, getRateLimitKey } from '@/lib/rate-limit';

const createServiceClient = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
};

export const dynamic = 'force-dynamic';

type RumorStatus = 'unverified' | 'circulating' | 'likely' | 'confirmed' | 'denied';

const RumorIdSchema = z.string().uuid();

const createAnonClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitKey = getRateLimitKey(request, 'rumors-api');
  if (!checkRateLimit(rateLimitKey, 50, 60000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const { id } = await params;

  const validation = RumorIdSchema.safeParse(id);
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

  const supabase = createAnonClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
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
      return NextResponse.json({ error: 'Failed to fetch rumor' }, { status: 500 });
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
