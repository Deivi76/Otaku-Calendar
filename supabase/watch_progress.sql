-- =====================================================
-- Tabela: watch_progress
-- Armazena o progresso de assistindo do usuário
-- =====================================================

-- Criar tabela watch_progress
CREATE TABLE IF NOT EXISTS watch_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id INTEGER NOT NULL,
  anime_id INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  timestamp_seconds INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'watching' CHECK (status IN ('watching', 'completed', 'paused')),
  is_binge_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, episode_id)
);

-- Criar índice para buscar progresso por usuário
CREATE INDEX IF NOT EXISTS idx_watch_progress_user ON watch_progress(user_id);

-- Criar índice para buscar progresso por anime
CREATE INDEX IF NOT EXISTS idx_watch_progress_anime ON watch_progress(anime_id);

-- Criar índice para buscar últimos assistidos
CREATE INDEX IF NOT EXISTS idx_watch_progress_recent ON watch_progress(user_id, updated_at DESC);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_watch_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar timestamp
CREATE TRIGGER trigger_update_watch_progress_timestamp
  BEFORE UPDATE ON watch_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_watch_progress_timestamp();

-- Row Level Security (RLS) - usuários só veem seus próprios dados
ALTER TABLE watch_progress ENABLE ROW LEVEL SECURITY;

-- Policy para usuários verem apenas seus próprios dados
CREATE POLICY watch_progress_own_data ON watch_progress
  FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- Tabela: binge_settings
-- Armazena configurações do modo maratona por usuário
-- =====================================================

CREATE TABLE IF NOT EXISTS binge_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  timer_seconds INTEGER NOT NULL DEFAULT 10,
  auto_play BOOLEAN DEFAULT TRUE,
  auto_advance BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para binge_settings
ALTER TABLE binge_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY binge_settings_own_data ON binge_settings
  FOR ALL
  USING (auth.uid() = user_id);
