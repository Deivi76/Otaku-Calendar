export const SCHEMA = `
-- Events table (core of the system)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anime TEXT NOT NULL,
  episode INTEGER,
  date TIMESTAMP WITH TIME ZONE,
  type TEXT NOT NULL DEFAULT 'confirmed',
  confidence REAL DEFAULT 0.5,
  source TEXT,
  source_type TEXT DEFAULT 'api',
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  episode_id UUID REFERENCES events(id) ON DELETE CASCADE,
  watched BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, episode_id)
);

-- User favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  anime TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, anime)
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID PRIMARY KEY,
  spoiler_free BOOLEAN DEFAULT FALSE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sources table (expanded)
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  reliability_tier INT NOT NULL DEFAULT 3,
  last_crawled TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  crawl_interval_minutes INT DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rumors table
CREATE TABLE IF NOT EXISTS rumors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  source_ids UUID[],
  status TEXT NOT NULL DEFAULT 'unverified',
  confidence_score DECIMAL(3,2),
  related_anime_id UUID REFERENCES events(id),
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crawl history table
CREATE TABLE IF NOT EXISTS crawl_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id),
  items_collected INT,
  duration_ms INT,
  status TEXT,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Trending rumors table
CREATE TABLE IF NOT EXISTS trending_rumors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rumor_id UUID REFERENCES rumors(id),
  engagement_count INT DEFAULT 0,
  source_count INT DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_anime ON events(anime);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_source_type ON events(source_type);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(type);
CREATE INDEX IF NOT EXISTS idx_sources_category ON sources(category);
CREATE INDEX IF NOT EXISTS idx_sources_is_active ON sources(is_active);
CREATE INDEX IF NOT EXISTS idx_rumors_status ON rumors(status);
CREATE INDEX IF NOT EXISTS idx_rumors_related_anime ON rumors(related_anime_id);
CREATE INDEX IF NOT EXISTS idx_crawl_history_source ON crawl_history(source_id);
CREATE INDEX IF NOT EXISTS idx_crawl_history_started ON crawl_history(started_at);
CREATE INDEX IF NOT EXISTS idx_trending_rumors_engagement ON trending_rumors(engagement_count DESC);

-- Row level security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE rumors ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_rumors ENABLE ROW LEVEL SECURITY;

-- Events RLS
CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);
CREATE POLICY "Service role can insert events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update events" ON events FOR UPDATE USING (true);
CREATE POLICY "Service role can delete events" ON events FOR DELETE USING (true);

-- User progress RLS
CREATE POLICY "Users can view own progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON user_progress FOR DELETE USING (auth.uid() = user_id);

-- User favorites RLS
CREATE POLICY "Users can view own favorites" ON user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own favorites" ON user_favorites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON user_favorites FOR DELETE USING (auth.uid() = user_id);

-- User settings RLS
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Sources RLS
CREATE POLICY "Sources are viewable by everyone" ON sources FOR SELECT USING (true);
CREATE POLICY "Service role can insert sources" ON sources FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update sources" ON sources FOR UPDATE USING (true);
CREATE POLICY "Service role can delete sources" ON sources FOR DELETE USING (true);

-- Rumors RLS
CREATE POLICY "Rumors are viewable by everyone" ON rumors FOR SELECT USING (true);
CREATE POLICY "Service role can insert rumors" ON rumors FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update rumors" ON rumors FOR UPDATE USING (true);
CREATE POLICY "Service role can delete rumors" ON rumors FOR DELETE USING (true);

-- Crawl history RLS
CREATE POLICY "Crawl history is viewable by everyone" ON crawl_history FOR SELECT USING (true);
CREATE POLICY "Service role can insert crawl history" ON crawl_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update crawl history" ON crawl_history FOR UPDATE USING (true);
CREATE POLICY "Service role can delete crawl history" ON crawl_history FOR DELETE USING (true);

-- Trending rumors RLS
CREATE POLICY "Trending rumors are viewable by everyone" ON trending_rumors FOR SELECT USING (true);
CREATE POLICY "Service role can insert trending rumors" ON trending_rumors FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update trending rumors" ON trending_rumors FOR UPDATE USING (true);
CREATE POLICY "Service role can delete trending rumors" ON trending_rumors FOR DELETE USING (true);
`;

export type EventType = 'confirmed' | 'rumor' | 'announcement' | 'live_action';
export type SourceType = 'site' | 'rss' | 'api' | 'social';

export type SourceCategory = 'anime' | 'manga' | 'manhwa' | 'film' | 'series' | 'live_action';
export type SourceTypeNew = 'api' | 'rss' | 'site' | 'social' | 'rumor';
export type RumorStatus = 'unverified' | 'circulating' | 'likely' | 'confirmed' | 'denied';
export type CrawlStatus = 'success' | 'error' | 'partial';

export interface Event {
  id: string;
  anime: string;
  episode: number | null;
  date: Date | null;
  type: EventType;
  confidence: number;
  source: string | null;
  source_type: SourceType;
  url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserProgress {
  id: string;
  user_id: string;
  episode_id: string;
  watched: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  anime: string;
  created_at: Date;
}

export interface UserSettings {
  id: string;
  user_id: string;
  spoiler_free: boolean;
  notifications_enabled: boolean;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  type: SourceTypeNew;
  category: SourceCategory;
  reliability_tier: number;
  last_crawled: Date | null;
  is_active: boolean;
  crawl_interval_minutes: number;
  created_at: Date;
}

export interface Rumor {
  id: string;
  title: string;
  content: string | null;
  source_ids: string[] | null;
  status: RumorStatus;
  confidence_score: number | null;
  related_anime_id: string | null;
  first_seen_at: Date;
  last_updated: Date;
}

export interface CrawlHistory {
  id: string;
  source_id: string | null;
  items_collected: number | null;
  duration_ms: number | null;
  status: CrawlStatus | null;
  error_message: string | null;
  started_at: Date;
  completed_at: Date | null;
}

export interface TrendingRumor {
  id: string;
  rumor_id: string;
  engagement_count: number;
  source_count: number;
  calculated_at: Date;
}