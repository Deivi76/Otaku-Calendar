import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';

// Schema de validação para POST
const WatchProgressSchema = z.object({
  episode_id: z.number().int().positive(),
  anime_id: z.number().int().positive(),
  episode_number: z.number().int().positive().min(1),
  timestamp_seconds: z.number().int().min(0).default(0),
  duration_seconds: z.number().int().min(0).default(0),
  status: z.enum(['watching', 'completed', 'paused']).default('watching'),
  is_binge_mode: z.boolean().default(false),
});

// Schema para timer settings
const BingeSettingsSchema = z.object({
  timer_seconds: z.number().int().min(0).max(300).default(10),
  auto_play: z.boolean().default(true),
  auto_advance: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const animeId = searchParams.get('anime_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase
      .from('watch_progress')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (animeId) {
      const animeIdNum = parseInt(animeId);
      if (isNaN(animeIdNum)) {
        return NextResponse.json(
          { error: 'anime_id inválido' },
          { status: 400 }
        );
      }
      query = query.eq('anime_id', animeIdNum);
    }

    const { data: progress, error } = await query.limit(limit);

    if (error) {
      console.error('Erro ao buscar progresso:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar progresso' },
        { status: 500 }
      );
    }

    // Buscar configurações de binge
    const { data: bingeSettings } = await supabase
      .from('binge_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    return NextResponse.json({
      progress: progress || [],
      binge_settings: bingeSettings || {
        timer_seconds: 10,
        auto_play: true,
        auto_advance: true,
      },
    });
  } catch (error) {
    console.error('Erro na API progress:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validar entrada
    const validation = WatchProgressSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
      { error: 'Dados inválidos', details: validation.error.issues },
      { status: 400 }
    );
    }

    const data = validation.data;

    // Upsert - insere ou atualiza
    const { data: progress, error } = await supabase
      .from('watch_progress')
      .upsert(
        {
          user_id: userId,
          episode_id: data.episode_id,
          anime_id: data.anime_id,
          episode_number: data.episode_number,
          timestamp_seconds: data.timestamp_seconds,
          duration_seconds: data.duration_seconds,
          status: data.status,
          is_binge_mode: data.is_binge_mode,
        },
        {
          onConflict: 'user_id,episode_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar progresso:', error);
      return NextResponse.json(
        { error: 'Erro ao salvar progresso' },
        { status: 500 }
      );
    }

    return NextResponse.json({ progress }, { status: 200 });
  } catch (error) {
    console.error('Erro na API progress POST:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validar entrada
    const validation = BingeSettingsSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
      { error: 'Dados inválidos', details: validation.error.issues },
      { status: 400 }
    );
    }

    const data = validation.data;

    // Upsert configurações de binge
    const { data: settings, error } = await supabase
      .from('binge_settings')
      .upsert(
        {
          user_id: userId,
          timer_seconds: data.timer_seconds,
          auto_play: data.auto_play,
          auto_advance: data.auto_advance,
        },
        {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar configurações:', error);
      return NextResponse.json(
        { error: 'Erro ao salvar configurações' },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    console.error('Erro na API progress PUT:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
