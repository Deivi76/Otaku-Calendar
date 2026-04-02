-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- DOMAIN: ANIME DATA
-- =====================================================

-- 1. animes: Catálogo principal de animes
CREATE TABLE IF NOT EXISTS animes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mal_id INTEGER UNIQUE,
    kitsu_id INTEGER UNIQUE,
    anilist_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    title_english TEXT,
    title_japanese TEXT,
    synopsis TEXT,
    type VARCHAR(20) CHECK (type IN ('tv', 'movie', 'ova', 'ona', 'special', 'music')),
    status VARCHAR(20) CHECK (status IN ('airing', 'finished', 'upcoming')),
    episodes INTEGER,
    duration_minutes INTEGER,
    score DECIMAL(4, 2),
    rank INTEGER,
    popularity INTEGER,
    rating VARCHAR(20) CHECK (rating IN ('g', 'pg', 'pg_13', 'r', 'r_17', 'rx')),
    season VARCHAR(10) CHECK (season IN ('winter', 'spring', 'summer', 'fall')),
    season_year INTEGER,
    source VARCHAR(30),
    studios JSONB DEFAULT '[]'::jsonb,
    producers JSONB DEFAULT '[]'::jsonb,
    genres JSONB DEFAULT '[]'::jsonb,
    images JSONB,
    trailer_url TEXT,
    url TEXT,
    aired_from DATE,
    aired_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. episodes: Episódios por anime
CREATE TABLE IF NOT EXISTS episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anime_id UUID REFERENCES animes(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    title TEXT,
    title_japanese TEXT,
    aired DATE,
    filler BOOLEAN DEFAULT FALSE,
    recap BOOLEAN DEFAULT FALSE,
    duration_minutes INTEGER,
    summary TEXT,
    forum_url TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(anime_id, episode_number)
);

-- 3. schedule: Grade semanal de episódios
CREATE TABLE IF NOT EXISTS schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anime_id UUID REFERENCES animes(id) ON DELETE CASCADE,
    episode_number INTEGER,
    airing_at TIMESTAMPTZ NOT NULL,
    day_of_week VARCHAR(10),
    week_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. anime_updates: Episódios recentes/lançamentos
CREATE TABLE IF NOT EXISTS anime_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anime_id UUID REFERENCES animes(id) ON DELETE CASCADE,
    episode INTEGER,
    aired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DOMAIN: USERS
-- =====================================================

-- 5. profiles: Perfil de usuário (ligado ao Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. user_favorites: Animes favoritos do usuário
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    anime_id UUID REFERENCES animes(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, anime_id)
);

-- 7. user_progress: Progresso de episódios assistidos
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
    watched BOOLEAN DEFAULT FALSE,
    watched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, episode_id)
);

-- 8. user_watchlist: Lista "assistir depois"
CREATE TABLE IF NOT EXISTS user_watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    anime_id UUID REFERENCES animes(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, anime_id)
);

-- 9. user_settings: Configurações do usuário
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    spoiler_free BOOLEAN DEFAULT FALSE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    notification_types JSONB DEFAULT '{"new_episode": true, "rumors": true, "news": false}'::jsonb,
    preferred_origin VARCHAR(20) DEFAULT 'all',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DOMAIN: CRAWLER (precisa vir antes de rumor_sources)
-- =====================================================

-- 10. sources: Fontes de dados para crawlers
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('api', 'rss', 'site', 'social')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('anime', 'manga', 'news', 'forum', 'social')),
    reliability_tier INTEGER DEFAULT 3 CHECK (reliability_tier BETWEEN 1 AND 5),
    last_crawled TIMESTAMPTZ,
    last_status VARCHAR(20) CHECK (last_status IN ('success', 'error', 'partial')),
    crawl_interval_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. crawl_history: Histórico de execuções
CREATE TABLE IF NOT EXISTS crawl_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    items_collected INTEGER,
    items_new INTEGER,
    items_updated INTEGER,
    duration_ms INTEGER,
    status VARCHAR(20) CHECK (status IN ('success', 'error', 'partial')),
    error_message TEXT,
    error_details JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- =====================================================
-- DOMAIN: RADAR (RUMORS)
-- =====================================================

-- 12. rumors: Rumores e anúncios
CREATE TABLE IF NOT EXISTS rumors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT,
    media_type VARCHAR(20) DEFAULT 'anime' CHECK (media_type IN ('anime', 'manga', 'manhwa', 'live_action', 'film')),
    status VARCHAR(20) DEFAULT 'unverified' CHECK (status IN ('unverified', 'circulating', 'likely', 'confirmed', 'denied')),
    confidence_score DECIMAL(3, 2),
    related_anime_id UUID REFERENCES animes(id) ON DELETE SET NULL,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    denied_at TIMESTAMPTZ,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. rumor_sources: Fontes de cada rumor
CREATE TABLE IF NOT EXISTS rumor_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rumor_id UUID REFERENCES rumors(id) ON DELETE CASCADE,
    source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
    source_url TEXT,
    source_confidence DECIMAL(3, 2),
    collected_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DOMAIN: ANALYTICS
-- =====================================================

-- 14. trending_animes: Animes em trending
CREATE TABLE IF NOT EXISTS trending_animes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anime_id UUID REFERENCES animes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    rank INTEGER,
    score DECIMAL(10, 2),
    member_count INTEGER,
    score_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(anime_id, date)
);

-- 15. page_views: Contagem de visualizações
CREATE TABLE IF NOT EXISTS page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anime_id UUID REFERENCES animes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(anime_id, date)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Animes indexes
CREATE INDEX IF NOT EXISTS idx_animes_mal_id ON animes(mal_id);
CREATE INDEX IF NOT EXISTS idx_animes_status ON animes(status);
CREATE INDEX IF NOT EXISTS idx_animes_type ON animes(type);
CREATE INDEX IF NOT EXISTS idx_animes_score ON animes(score DESC);
CREATE INDEX IF NOT EXISTS idx_animes_popularity ON animes(popularity);
CREATE INDEX IF NOT EXISTS idx_animes_season ON animes(season, season_year);
CREATE INDEX IF NOT EXISTS idx_animes_created ON animes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_animes_genres ON animes USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_animes_title_fts ON animes USING GIN(to_tsvector('portuguese', title || ' ' || COALESCE(title_english, '')));

-- Episodes indexes
CREATE INDEX IF NOT EXISTS idx_episodes_anime ON episodes(anime_id);
CREATE INDEX IF NOT EXISTS idx_episodes_number ON episodes(anime_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_episodes_aired ON episodes(aired DESC);

-- Schedule indexes
CREATE INDEX IF NOT EXISTS idx_schedule_airing ON schedule(airing_at);
CREATE INDEX IF NOT EXISTS idx_schedule_day ON schedule(day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedule_anime ON schedule(anime_id);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_anime ON user_favorites(anime_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_episode ON user_progress(episode_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user ON user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- Rumors indexes
CREATE INDEX IF NOT EXISTS idx_rumors_status ON rumors(status);
CREATE INDEX IF NOT EXISTS idx_rumors_media ON rumors(media_type);
CREATE INDEX IF NOT EXISTS idx_rumors_date ON rumors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rumors_related_anime ON rumors(related_anime_id);
CREATE INDEX IF NOT EXISTS idx_rumor_sources_rumor ON rumor_sources(rumor_id);

-- Crawler indexes
CREATE INDEX IF NOT EXISTS idx_sources_active ON sources(is_active);
CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(type);
CREATE INDEX IF NOT EXISTS idx_crawl_history_source ON crawl_history(source_id);
CREATE INDEX IF NOT EXISTS idx_crawl_history_date ON crawl_history(started_at DESC);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_trending_date ON trending_animes(date DESC);
CREATE INDEX IF NOT EXISTS idx_trending_rank ON trending_animes(rank);
CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(date DESC);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on tables with this column
CREATE TRIGGER update_animes_updated_at
  BEFORE UPDATE ON animes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_episodes_updated_at
  BEFORE UPDATE ON episodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User_' || LEFT(NEW.id::TEXT, 8)));
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update rumor timestamps
CREATE OR REPLACE FUNCTION update_rumor_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    NEW.confirmed_at = NOW();
  ELSIF NEW.status = 'denied' AND OLD.status != 'denied' THEN
    NEW.denied_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rumor_timestamps
  BEFORE UPDATE ON rumors
  FOR EACH ROW EXECUTE FUNCTION update_rumor_status();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE animes ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE anime_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rumors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rumor_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_animes ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: ANIME DATA
-- =====================================================

-- animes: Public read, authenticated write, service full
CREATE POLICY "Public can view animes" ON animes
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated can insert animes" ON animes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update animes" ON animes
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete animes" ON animes
  FOR DELETE TO authenticated USING (true);

-- episodes: Public read, authenticated write
CREATE POLICY "Public can view episodes" ON episodes
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated can insert episodes" ON episodes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update episodes" ON episodes
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete episodes" ON episodes
  FOR DELETE TO authenticated USING (true);

-- schedule: Public read, authenticated write
CREATE POLICY "Public can view schedule" ON schedule
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated can insert schedule" ON schedule
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update schedule" ON schedule
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete schedule" ON schedule
  FOR DELETE TO authenticated USING (true);

-- anime_updates: Public read, authenticated write
CREATE POLICY "Public can view anime_updates" ON anime_updates
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated can insert anime_updates" ON anime_updates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update anime_updates" ON anime_updates
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete anime_updates" ON anime_updates
  FOR DELETE TO authenticated USING (true);

-- =====================================================
-- RLS POLICIES: USERS
-- =====================================================

-- profiles: Users can read all, update own
CREATE POLICY "Public can view profiles" ON profiles
  FOR SELECT TO public USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_favorites: Users manage own favorites
CREATE POLICY "Users can view own favorites" ON user_favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON user_favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorites" ON user_favorites
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON user_favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_progress: Users manage own progress
CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON user_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON user_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON user_progress
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_watchlist: Users manage own watchlist
CREATE POLICY "Users can view own watchlist" ON user_watchlist
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist" ON user_watchlist
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist" ON user_watchlist
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist" ON user_watchlist
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_settings: Users manage own settings
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES: RADAR
-- =====================================================

-- rumors: Public read, authenticated insert/update
CREATE POLICY "Public can view rumors" ON rumors
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated can insert rumors" ON rumors
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update rumors" ON rumors
  FOR UPDATE TO authenticated USING (true);

-- rumor_sources: Public read, authenticated write
CREATE POLICY "Public can view rumor_sources" ON rumor_sources
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated can insert rumor_sources" ON rumor_sources
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update rumor_sources" ON rumor_sources
  FOR UPDATE TO authenticated USING (true);

-- =====================================================
-- RLS POLICIES: CRAWLER
-- =====================================================

-- sources: Public read only
CREATE POLICY "Public can view sources" ON sources
  FOR SELECT TO public USING (true);

-- crawl_history: Public read only
CREATE POLICY "Public can view crawl_history" ON crawl_history
  FOR SELECT TO public USING (true);

-- =====================================================
-- RLS POLICIES: ANALYTICS
-- =====================================================

-- trending_animes: Public read only
CREATE POLICY "Public can view trending_animes" ON trending_animes
  FOR SELECT TO public USING (true);

-- page_views: Public read only
CREATE POLICY "Public can view page_views" ON page_views
  FOR SELECT TO public USING (true);
