-- =====================================================
-- USER STATS ANALYTICS
-- =====================================================

-- 16. user_stats: Estatísticas do usuário
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    total_animes_watched INTEGER DEFAULT 0,
    total_episodes_watched INTEGER DEFAULT 0,
    total_minutes_watched INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_watch_date DATE,
    favorite_genres JSONB DEFAULT '[]'::jsonb,
    genre_distribution JSONB DEFAULT '{}'::jsonb,
    weekly_stats JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. user_watch_history: Histórico diário de visualização
CREATE TABLE IF NOT EXISTS user_watch_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    episodes_watched INTEGER DEFAULT 0,
    minutes_watched INTEGER DEFAULT 0,
    animes_watched JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Indexes for user_stats
CREATE INDEX IF NOT EXISTS idx_user_stats_user ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watch_history_user ON user_watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watch_history_date ON user_watch_history(date DESC);

-- Trigger for updated_at on user_stats
CREATE TRIGGER update_user_stats_updated_at
    BEFORE UPDATE ON user_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watch_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_stats
CREATE POLICY "Users can view own stats" ON user_stats
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON user_stats
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON user_stats
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for user_watch_history
CREATE POLICY "Users can view own watch history" ON user_watch_history
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watch history" ON user_watch_history
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watch history" ON user_watch_history
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS FOR STATS CALCULATION
-- =====================================================

-- Function to calculate user streak
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_current_streak INTEGER := 0;
    v_date DATE := CURRENT_DATE;
    v_record RECORD;
BEGIN
    -- Check if user watched today
    SELECT INTO v_record 
        episodes_watched, 
        date 
    FROM user_watch_history 
    WHERE user_id = p_user_id 
    AND date >= CURRENT_DATE - INTERVAL '1 day'
    ORDER BY date DESC
    LIMIT 1;

    IF v_record.date IS NULL THEN
        -- No watch today, check yesterday
        v_date := CURRENT_DATE - INTERVAL '1 day';
    END IF;

    -- Count consecutive days
    WHILE EXISTS (
        SELECT 1 FROM user_watch_history 
        WHERE user_id = p_user_id 
        AND date = v_date 
        AND episodes_watched > 0
    ) LOOP
        v_current_streak := v_current_streak + 1;
        v_date := v_date - INTERVAL '1 day';
    END LOOP;

    RETURN v_current_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user stats
CREATE OR REPLACE FUNCTION update_user_stats(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_episodes INTEGER;
    v_total_minutes INTEGER;
    v_genre_dist JSONB;
    v_favorite_genres JSONB;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
BEGIN
    -- Get total episodes and minutes
    SELECT 
        COALESCE(SUM(episodes_watched), 0),
        COALESCE(SUM(minutes_watched), 0)
    INTO v_total_episodes, v_total_minutes
    FROM user_watch_history
    WHERE user_id = p_user_id;

    -- Calculate genre distribution from favorites
    SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
    INTO v_genre_dist
    FROM (
        SELECT 
            jsonb_array_elements_text(anime.genres->0->>'name') as genre,
            COUNT(*)::text as count
        FROM user_favorites
        JOIN animes ON user_favorites.anime_id = animes.id
        WHERE user_favorites.user_id = p_user_id
        AND anime.genres IS NOT NULL
        GROUP BY genre
    ) sub;

    -- Get top 5 favorite genres
    SELECT jsonb_agg(genre)
    INTO v_favorite_genres
    FROM (
        SELECT genre
        FROM (
            SELECT 
                jsonb_array_elements_text(anime.genres->0->>'name') as genre,
                COUNT(*) as count
            FROM user_favorites
            JOIN animes ON user_favorites.anime_id = animes.id
            WHERE user_favorites.user_id = p_user_id
            AND anime.genres IS NOT NULL
            GROUP BY genre
            ORDER BY count DESC
            LIMIT 5
        ) t
    ) genres;

    -- Calculate streak
    v_current_streak := calculate_user_streak(p_user_id);
    
    -- Get current longest streak
    SELECT COALESCE(longest_streak, 0)
    INTO v_longest_streak
    FROM user_stats
    WHERE user_id = p_user_id;

    -- Update longest if current is higher
    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;

    -- Upsert stats
    INSERT INTO user_stats (
        user_id,
        total_episodes_watched,
        total_minutes_watched,
        current_streak,
        longest_streak,
        favorite_genres,
        genre_distribution,
        last_watch_date
    )
    SELECT 
        p_user_id,
        v_total_episodes,
        v_total_minutes,
        v_current_streak,
        v_longest_streak,
        COALESCE(v_favorite_genres, '[]'::jsonb),
        COALESCE(v_genre_dist, '{}'::jsonb),
        MAX(date)
    FROM user_watch_history
    WHERE user_id = p_user_id
    ON CONFLICT (user_id) DO UPDATE SET
        total_episodes_watched = v_total_episodes,
        total_minutes_watched = v_total_minutes,
        current_streak = v_current_streak,
        longest_streak = GREATEST(v_longest_streak, EXCLUDED.longest_streak),
        favorite_genres = COALESCE(v_favorite_genres, '[]'::jsonb),
        genre_distribution = COALESCE(v_genre_dist, '{}'::jsonb),
        last_watch_date = EXCLUDED.last_watch_date,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record daily watch
CREATE OR REPLACE FUNCTION record_daily_watch(
    p_user_id UUID,
    p_episodes INTEGER DEFAULT 0,
    p_minutes INTEGER DEFAULT 0,
    p_animes JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_watch_history (user_id, date, episodes_watched, minutes_watched, animes_watched)
    VALUES (p_user_id, CURRENT_DATE, p_episodes, p_minutes, p_animes)
    ON CONFLICT (user_id, date) DO UPDATE SET
        episodes_watched = user_watch_history.episodes_watched + p_episodes,
        minutes_watched = user_watch_history.minutes_watched + p_minutes,
        animes_watched = (
            SELECT jsonb_array_remove(
                jsonb_array_merge(
                    user_watch_history.animes_watched::jsonb,
                    p_animes::jsonb
                )
            )
        );
    
    -- Update stats
    PERFORM update_user_stats(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get community stats (for comparison)
CREATE OR REPLACE FUNCTION get_community_stats()
RETURNS TABLE (
    total_users INTEGER,
    avg_episodes_watched DECIMAL,
    avg_streak DECIMAL,
    top_genres JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT user_id)::INTEGER as total_users,
        COALESCE(AVG(total_episodes_watched), 0)::DECIMAL as avg_episodes_watched,
        COALESCE(AVG(current_streak), 0)::DECIMAL as avg_streak,
        (
            SELECT jsonb_agg(row_to_json(t))
            FROM (
                SELECT 
                    key as genre,
                    value::text::int as count
                FROM (
                    SELECT 
                        jsonb_object_keys(genre_distribution) as key,
                        (genre_distribution->>key)::text::int as value
                    FROM user_stats
                    WHERE genre_distribution IS NOT NULL
                ) counts
                ORDER BY value DESC
                LIMIT 10
            ) t
        )::JSONB as top_genres
    FROM user_stats;
END;
$$ LANGUAGE plpgsql;

-- Weekly stats function
CREATE OR REPLACE FUNCTION get_user_weekly_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_weekly JSONB;
BEGIN
    SELECT jsonb_agg(row_to_json(t))
    INTO v_weekly
    FROM (
        SELECT 
            to_char(date, 'Day') as day,
            episodes_watched as episodes,
            minutes_watched as minutes
        FROM user_watch_history
        WHERE user_id = p_user_id
        AND date >= CURRENT_DATE - INTERVAL '6 days'
        ORDER BY date
    ) t;

    RETURN COALESCE(v_weekly, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
