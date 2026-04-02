# Cmd+K Busca Global

## Goal
Implementar um atalho de teclado global (Cmd+K / Ctrl+K) que abre uma modal de busca fuzzy com navegação instantânea para animes, episódios e rumores.

## Tasks
- [x] Task 1: Instalar dependências (cmdk, fuse.js) → Verify: npm install cmdk fuse.js
- [x] Task 2: Criar hook useSearch para gerenciar estado da busca → Verify: Arquivo criado em hooks/useSearch.ts
- [x] Task 3: Criar componente CommandMenu (modal Cmd+K) → Verify: Arquivo criado em components/CommandMenu.tsx
- [x] Task 4: Integrar Fuse.js com dados do catálogo → Verify: Busca retornando resultados fuzzy
- [x] Task 5: Adicionar atalho de teclado global no layout → Verify: Cmd+K abre a modal
- [x] Task 6: Implementar navegação para páginas de anime/rumor → Verify: Click no resultado navega corretamente
- [x] Task 7: Estilizar modal conforme design system → Verify: Visual consistente com tema dark

## Done When
- [x] Cmd+K abre modal de busca de qualquer página
- [x] Busca fuzzy funciona com tolerância a erros
- [x] Resultados mostram imagem, título e tipo do anime
- [x] Enter ou click navega para a página correta
- [x] ESC fecha a modal
