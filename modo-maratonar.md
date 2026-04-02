# Modo Maratonar (Binge Mode)

## Goal
Criar UI especial para maratonas: timer entre episódios, progresso visual, lembrar onde o usuário parou, sugerir próximo episódio automaticamente.

## Tasks
- [ ] Task 1: Criar tabela 'watch_progress' no Supabase → Verify: Tabela com episode_id, user_id, timestamp
- [ ] Task 2: Criar API endpoint /api/progress (GET e POST) → Verify: Salvar e recuperar progresso
- [ ] Task 3: Criar hook useWatchProgress para gerenciar estado → Verify: Hook em hooks/useWatchProgress.ts
- [ ] Task 4: Criar componente BingeModeOverlay (UI de maratona) → Verify: Componente em components/BingeMode/
- [ ] Task 5: Implementar timer configurável entre eps → Verify: Timer conta regressiva
- [ ] Task 6: Adicionar "Continuar assistindo" na homepage → Verify: Seção com últimos assistidos
- [ ] Task 7: Criar lógica de "próximo episódio" automático → Verify: Sugestão baseada no progresso
- [ ] Task 8: Adicionar estados visuais (assistindo, completado, pausado) → Verify: Badges nos cards

## Done Quando
- [ ] Usuário pode iniciar modo maratona em qualquer anime
- [ ] Timer configurável entre episódios
- [ ] Progresso salvo automaticamente
- [ ] Seção "Continuar Assistindo" na homepage
- [ ] Sugestão de próximo episódio funciona
