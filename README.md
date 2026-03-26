# Otaku Calendar - Calendário Inteligente de Animes

Sistema completo de agregação de lançamentos de animes com crawler inteligente, deduplicação e frontend moderno.

## 🚀 Quick Start

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev
```

## 📁 Estrutura

```
apps/
├── web/          # Frontend Next.js
└── crawler/      # Worker de coleta

packages/
├── core/         # Normalizer, Classifiers, Deduplicator
└── db/          # Supabase Client & Schema
```

## ⚙️ Configuração

1. Copie `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Configure as variáveis:
- `NEXT_PUBLIC_SUPABASE_URL` - URL do seu projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave anônima do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (apenas para crawler)

3. Execute o schema no Supabase SQL Editor:
```bash
# Copie o conteúdo de packages/db/src/schema.ts
# Execute no SQL Editor do Supabase
```

## 🔌 APIs Utilizadas

- **AniList** - GraphQL API para animes em andamento
- **Jikan** - API pública para schedules e top animes

## 📅 Funcionalidades

- Calendário semanal de lançamentos
- Radar Otaku (rumores, anúncios, live actions)
- Score de confiança por fonte
- Autenticação Google via Supabase
- Sistema de favoritos e progresso

## 🛠️ Tech Stack

- Next.js 14
- Supabase
- Turbo (monorepo)
- TypeScript
