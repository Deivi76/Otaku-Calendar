# Sistema de Recomendação Personalizado

## Goal
Implementar algoritmo de recomendação que sugere animes baseados no histórico do usuário, favoritos, notas e padrões de visualização.

## Tasks
- [ ] Task 1: Adicionar campo 'nota' e 'generos_preferidos' na tabela users do Supabase → Verify: Schema atualizado
- [ ] Task 2: Criar tabela 'user_preferences' para store preferências → Verify: Tabela criada no Supabase
- [ ] Task 3: Criar API endpoint /api/recommendations → Verify: Endpoint retorna recomendações
- [ ] Task 4: Implementar algoritmo de recomendação base (géneros, estudos, ano) → Verify: Função em packages/core
- [ ] Task 5: Criar componente RecommendationCarousel na homepage → Verify: Componente renderiza recomendações
- [ ] Task 6: Adicionar sistema de nota (1-5 stars) nos cards de anime → Verify: Usuário pode avaliar
- [ ] Task 7: Criar página "Para Você" com recomendações → Verify: /para-voz retorna recomendações personalizadas

## Done Quando
- [ ] Usuário pode avaliar animes com nota
- [ ] Recomendação baseada em favoritos e notas anteriores
- [ ] Carrossel "Para Você" na homepage
- [ ] Página dedicada /para-voz com recomendações
- [ ] Algoritmo melhora com mais interações
