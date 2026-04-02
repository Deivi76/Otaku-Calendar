import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateRecommendations } from '@otaku-calendar/core';
import { cookies } from 'next/headers';

const createAnonClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
};

const createServerClient = () => {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  });
};

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const genreFilter = searchParams.get('genre');

    const supabase = createAnonClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get current user if authenticated
    let userId: string | null = null;
    let userPreferences: { preferred_genres: string[]; preferred_seasons: string[] } | null = null;
    let userRatings: { anime_id: string; rating: number }[] = [];
    let userFavorites: string[] = [];

    const serverClient = createServerClient();
    if (serverClient) {
      const { data: { session } } = await serverClient.auth.getSession();
      if (session?.user) {
        userId = session.user.id;

        // Get user preferences
        const { data: prefs } = await serverClient
          .from('user_preferences')
          .select('preferred_genres, preferred_seasons')
          .eq('user_id', userId)
          .single();
        
        if (prefs) {
          userPreferences = prefs as { preferred_genres: string[]; preferred_seasons: string[] };
        }

        // Get user ratings
        const { data: ratings } = await serverClient
          .from('user_ratings')
          .select('anime_id, rating')
          .eq('user_id', userId);
        
        if (ratings) {
          userRatings = ratings;
        }

        // Get user favorites
        const { data: favs } = await serverClient
          .from('user_favorites')
          .select('anime_id')
          .eq('user_id', userId);
        
        if (favs) {
          userFavorites = favs.map(f => f.anime_id);
        }
      }
    }

    // Fetch available animes from database
    let query = supabase
      .from('animes')
      .select('id, mal_id, title, title_english, score, genres, type, status, season, season_year, images')
      .in('status', ['finished', 'airing'])
      .not('score', 'is', null)
      .gte('score', 6.0)
      .order('score', { ascending: false })
      .limit(100);

    if (genreFilter) {
      query = query.contains('genres', [{ name: genreFilter }]);
    }

    const { data: animes, error: animeError } = await query;

    if (animeError) {
      console.error('Error fetching animes:', animeError);
      return NextResponse.json({ error: 'Failed to fetch animes' }, { status: 500 });
    }

    if (!animes || animes.length === 0) {
      return NextResponse.json({ 
        recommendations: [],
        message: 'No animes found matching criteria',
      });
    }

    // Transform data for recommendation algorithm
    const mappedAnimes = animes.map(a => ({
      id: a.id,
      mal_id: a.mal_id,
      title: a.title,
      title_english: a.title_english,
      score: a.score,
      genres: (a.genres as Array<{ name: string }>)?.map(g => g.name) || [],
      type: a.type,
      status: a.status,
      season: a.season,
      season_year: a.season_year,
      images: a.images,
    }));

    // Get anime details for user's ratings
    let ratedAnimes: { anime_id: string; rating: number; anime: { genres: string[] } }[] = [];
    if (userRatings.length > 0) {
      const animeIds = userRatings.map(r => r.anime_id);
      const { data: animeData } = await supabase
        .from('animes')
        .select('id, genres')
        .in('id', animeIds);

      ratedAnimes = userRatings.map(r => ({
        anime_id: r.anime_id,
        rating: r.rating,
        anime: {
          genres: animeData?.find(a => a.id === r.anime_id)?.genres as string[] || [],
        },
      }));
    }

    // Get favorite animes
    let favoriteAnimes: { id: string; genres: string[] }[] = [];
    if (userFavorites.length > 0) {
      const { data: favAnimeData } = await supabase
        .from('animes')
        .select('id, genres')
        .in('id', userFavorites);
      
      if (favAnimeData) {
        favoriteAnimes = favAnimeData.map(a => ({
          id: a.id,
          genres: (a.genres as Array<{ name: string }>)?.map(g => g.name) || [],
        }));
      }
    }

    // Generate recommendations
    const recommendations = generateRecommendations(
      mappedAnimes as any,
      userPreferences ? {
        user_id: userId!,
        preferred_genres: userPreferences.preferred_genres || [],
        preferred_seasons: userPreferences.preferred_seasons || [],
        preferred_anime_types: [],
        min_score: 6.0,
        exclude_genres: [],
      } : null,
      ratedAnimes as any,
      favoriteAnimes as any,
      limit
    );

    return NextResponse.json({
      recommendations: recommendations.map(r => ({
        id: r.anime.id,
        mal_id: r.anime.mal_id,
        title: r.anime.title,
        title_english: r.anime.title_english,
        image_url: r.anime.images?.jpg?.large_image_url || r.anime.images?.jpg?.image_url,
        score: r.anime.score,
        genres: r.anime.genres,
        type: r.anime.type,
        status: r.anime.status,
        season: r.anime.season,
        match_score: r.score,
        reasons: r.reasons.map(reason => ({
          type: reason.type,
          description: reason.description,
        })),
      })),
      user: userId ? { id: userId, authenticated: true } : null,
    });
  } catch (error) {
    console.error('Error in GET /api/recommendations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAnonClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { anime_id, rating } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating. Must be between 1 and 5.' }, { status: 400 });
    }

    if (!anime_id) {
      return NextResponse.json({ error: 'Anime ID is required' }, { status: 400 });
    }

    // Get authenticated user
    const serverClient = createServerClient();
    if (!serverClient) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: { session } } = await serverClient.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.user.id;

    // Upsert rating
    const { data, error } = await supabase
      .from('user_ratings')
      .upsert({
        user_id: userId,
        anime_id: anime_id,
        rating: rating,
      }, {
        onConflict: 'user_id,anime_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving rating:', error);
      return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      rating: data,
      message: 'Rating saved successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/recommendations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}