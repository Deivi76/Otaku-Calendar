-- =====================================================
-- SISTEMA DE RECOMENDAÇÃO - Schema Updates
-- =====================================================

-- 1. Tabela de ratings de anime (notas 1-5 estrelas)
CREATE TABLE IF NOT EXISTS user_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    anime_id UUID REFERENCES animes(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, anime_id)
);

-- 2. Tabela de preferências de gêneros do usuário
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    preferred_genres JSONB DEFAULT '[]'::jsonb,
    preferred_anime_types JSONB DEFAULT '[]'::jsonb,
    preferred_seasons JSONB DEFAULT '[]'::jsonb,
    min_score DECIMAL(3, 2) DEFAULT 5.0,
    exclude_genres JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- user_ratings indexes
CREATE INDEX IF NOT EXISTS idx_user_ratings_user ON user_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_anime ON user_ratings(anime_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rating ON user_ratings(rating);

-- user_preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update rating timestamp
CREATE OR REPLACE FUNCTION update_rating_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_ratings
CREATE TRIGGER update_user_ratings_timestamp
  BEFORE UPDATE ON user_ratings
  FOR EACH ROW EXECUTE FUNCTION update_rating_timestamp();

-- Trigger for user_preferences
CREATE TRIGGER update_user_preferences_timestamp
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_rating_timestamp();

-- Function to auto-create preferences on new user
CREATE OR REPLACE FUNCTION handle_new_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences on profile creation
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_preferences();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- user_ratings: Users manage own ratings
CREATE POLICY "Users can view own ratings" ON user_ratings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ratings" ON user_ratings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings" ON user_ratings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings" ON user_ratings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_preferences: Users manage own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- =====================================================
-- VIEW para recomendações (algoritmo base)
-- =====================================================

-- View para buscar animes com base em gêneros preferidos
CREATE OR REPLACE VIEW anime_with_genre_match AS
SELECT 
    a.*,
    (
        SELECT COUNT(*)::float / 
            CASE WHEN jsonb_array_length(a.genres) > 0 
                 THEN jsonb_array_length(a.genres)::float 
                 ELSE 1 END
        FROM jsonb_array_elements(a.genres) AS genre
        WHERE genre->>'name' IN (
            SELECT jsonb_array_elements_text(up.preferred_genres)
            FROM user_preferences up
        )
    ) AS genre_match_score
FROM animes a
WHERE a.status = 'finished' OR a.status = 'airing';

-- View para recomendação baseada em ratings do usuário
CREATE OR REPLACE VIEW recommended_animes_by_ratings AS
SELECT 
    a.id,
    a.*,
    COALESCE(
        (
            SELECT AVG(ur.rating)::DECIMAL(3, 2)
            FROM user_ratings ur
            JOIN animes a2 ON ur.anime_id = a2.id
            WHERE ur.user_id = (
                SELECT user_id FROM user_ratings 
                WHERE anime_id = a.id 
                ORDER BY rating DESC LIMIT 1
            )
            AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(a2.genres) g1
                JOIN jsonb_array_elements(a.genres) g2 ON g1->>'name' = g2->>'name'
            )
        ), 0
    ) AS similar_user_score
FROM animes a
WHERE a.status IN ('finished', 'airing')
ORDER BY similar_user_score DESC;

-- =====================================================
-- FUNÇÕES para API de recomendações
-- =====================================================

-- Função para buscar recomendações baseadas em favoritos e ratings
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    mal_id INTEGER,
    title TEXT,
    title_english TEXT,
    image_url TEXT,
    score DECIMAL(4, 2),
    genres JSONB,
    match_score DECIMAL(5, 4)
) AS $$
BEGIN
    RETURN QUERY
    WITH user_favorite_genres AS (
        SELECT DISTINCT jsonb_array_elements(a.genres)->>'name' AS genre
        FROM animes a
        INNER JOIN user_favorites uf ON uf.anime_id = a.id
        WHERE uf.user_id = p_user_id
    ),
    user_rated_genres AS (
        SELECT DISTINCT jsonb_array_elements(a.genres)->>'name' AS genre
        FROM animes a
        INNER JOIN user_ratings ur ON ur.anime_id = a.id
        WHERE ur.user_id = p_user_id AND ur.rating >= 4
    ),
    preferred_genres AS (
        SELECT genre FROM user_favorite_genres
        UNION
        SELECT genre FROM user_rated_genres
        UNION
        SELECT jsonb_array_elements_text(preferred_genres) 
        FROM user_preferences 
        WHERE user_id = p_user_id AND preferred_genres != '[]'::jsonb
    ),
    user_rated_animes AS (
        SELECT anime_id, rating 
        FROM user_ratings 
        WHERE user_id = p_user_id
    ),
    user_favorite_animes AS (
        SELECT anime_id 
        FROM user_favorites 
        WHERE user_id = p_user_id
    ),
    excluded_animes AS (
        SELECT anime_id FROM user_rated_animes
        UNION
        SELECT anime_id FROM user_favorite_animes
    )
    SELECT 
        a.id,
        a.mal_id,
        a.title,
        a.title_english,
        COALESCE(a.images->'jpg'->>'large_image_url', a.images->'jpg'->>'image_url') AS image_url,
        a.score,
        a.genres,
        (
            COALESCE(
                (
                    SELECT COUNT(*)::DECIMAL(5, 4)
                    FROM jsonb_array_elements(a.genres) g
                    WHERE g->>'name' IN (SELECT genre FROM preferred_genres)
                ) / NULLIF(
                    CASE WHEN jsonb_array_length(a.genres) > 0 
                         THEN jsonb_array_length(a.genres)::DECIMAL 
                         ELSE 1 END, 0
                ), 0
            ) * 0.6
        ) + 
        (
            COALESCE(
                (
                    SELECT AVG(rating)::DECIMAL(5, 4) / 5.0
                    FROM user_ratings ur2
                    JOIN animes a2 ON ur2.anime_id = a2.id
                    WHERE ur2.rating >= 4
                    AND EXISTS (
                        SELECT 1 FROM jsonb_array_elements(a.genres) g1
                        JOIN jsonb_array_elements(a2.genres) g2 ON g1->>'name' = g2->>'name'
                    )
                    LIMIT 1
                ), 0
            ) * 0.3
        ) +
        (
            COALESCE(a.score / 10.0, 0) * 0.1
        ) AS match_score
    FROM animes a
    WHERE a.id NOT IN (SELECT anime_id FROM excluded_animes)
    AND a.status IN ('finished', 'airing')
    AND a.score IS NOT NULL AND a.score >= 6.0
    ORDER BY match_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Função para obter rating de um anime específico
CREATE OR REPLACE FUNCTION get_user_anime_rating(
    p_user_id UUID,
    p_anime_id UUID
)
RETURNS TABLE (
    rating INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT ur.rating, ur.created_at
    FROM user_ratings ur
    WHERE ur.user_id = p_user_id AND ur.anime_id = p_anime_id;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar rating
CREATE OR REPLACE FUNCTION upsert_user_rating(
    p_user_id UUID,
    p_anime_id UUID,
    p_rating INTEGER
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO user_ratings (user_id, anime_id, rating)
    VALUES (p_user_id, p_anime_id, p_rating)
    ON CONFLICT (user_id, anime_id)
    DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;