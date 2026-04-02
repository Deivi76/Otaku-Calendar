import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user stats
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('Error fetching user stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      );
    }

    // Get user watch history (last 30 days)
    const { data: history, error: historyError } = await supabase
      .from('user_watch_history')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (historyError) {
      console.error('Error fetching watch history:', historyError);
    }

    // Get community stats for comparison
    const { data: communityStats, error: communityError } = await supabase.rpc(
      'get_community_stats'
    );

    if (communityError) {
      console.error('Error fetching community stats:', communityError);
    }

    // Get favorite count
    const { count: favoritesCount } = await supabase
      .from('user_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get watchlist count
    const { count: watchlistCount } = await supabase
      .from('user_watchlist')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Calculate total unique animes watched
    const uniqueAnimes = history
      ? new Set(
          history.flatMap((h) =>
            (h.animes_watched as string[]).map((a) => a)
          )
        ).size
      : 0;

    const response = {
      stats: stats || {
        total_animes_watched: uniqueAnimes,
        total_episodes_watched: 0,
        total_minutes_watched: 0,
        current_streak: 0,
        longest_streak: 0,
        favorite_genres: [],
        genre_distribution: {},
      },
      history: history || [],
      community: communityStats?.[0] || {
        total_users: 0,
        avg_episodes_watched: 0,
        avg_streak: 0,
        top_genres: [],
      },
      summary: {
        favoritesCount: favoritesCount || 0,
        watchlistCount: watchlistCount || 0,
        uniqueAnimesWatched: uniqueAnimes,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in /api/user/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update user stats
    const { error: updateError } = await supabase.rpc('update_user_stats', {
      p_user_id: user.id,
    });

    if (updateError) {
      console.error('Error updating user stats:', updateError);
      return NextResponse.json(
        { error: 'Failed to update stats' },
        { status: 500 }
      );
    }

    // Fetch updated stats
    const { data: stats, error: fetchError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated stats:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch updated stats' },
        { status: 500 }
      );
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Unexpected error in POST /api/user/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
