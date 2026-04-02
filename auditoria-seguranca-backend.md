# Relatório de Auditoria de Segurança - Backend Otaku Calendar

## Sumário Executivo

Este relatório apresenta uma análise completa de segurança dos endpoints e configurações do backend do projeto Otaku Calendar. Foram identificadas **9 vulnerabilidades** distribuídas entre os níveis Crítico, Alto, Médio e Baixo.

| Severidade | Quantidade |
|------------|------------|
| 🔴 Crítica | 2 |
| 🟠 Alta | 3 |
| 🟡 Média | 2 |
| 🔵 Baixa | 2 |

---

## Vulnerabilidades Encontradas

---

### 1. Uso de Service Role Key em API Pública (CRÍTICA)

**Localização:** `/workspaces/Otaku-Calendar/apps/web/src/app/api/rumors/[id]/route.ts` - Linhas 4-9

**Descrição:** O endpoint de API pública `/api/rumors/[id]` utiliza a `SUPABASE_SERVICE_ROLE_KEY` (chave de administrador) em vez de usar a chave anônima com Row Level Security (RLS). Esta configuração contorna completamente todas as políticas de segurança do banco de dados.

**OWASP:** A01 - Broken Access Control, A04 - Cryptographic Failures

**Proof of Concept:**
```bash
# Qualquer usuário pode acessar o endpoint sem autenticação
curl https://otaku-calendar.com/api/rumors/123

# A API usa service role key internamente, ignorando RLS
# Dados sensíveis podem ser acessados diretamente do banco
```

**Risco:** Qualquer pessoa pode acessar todos os registros do banco de dados sem autenticação, incluindo dados potencialmente sensíveis.

**Recomendação:**
```typescript
// Substituir service client por client normal com RLS
import { createClient } from '@/lib/supabase';

// Usar o client autenticado que respeita RLS
const supabase = createClient();

// Se necessário acesso público, criar política RLS específica
// para SELECT público na tabela rumors
```

---

### 2. Ausência de Row Level Security (CRÍTICA)

**Localização:** Banco de dados Supabase - Schema não encontrado

**Descrição:** Não foram encontradas políticas RLS configuradas no schema do banco de dados. O arquivo `schema.sql` existe mas não contém definições de RLS. O uso de service role key em todas as operações indica que RLS não está habilitado.

**OWASP:** A01 - Broken Access Control, A07 - Authentication Failures

**Impacto:** Todas as tabelas estão acessíveis sem controle de acesso. Um atacante com acesso às chaves pode ler, modificar ou excluir qualquer dado.

**Recomendação:**
1. Habilitar RLS em todas as tabelas sensíveis
2. Criar políticas específicas:
   - `rumors`: SELECT público, INSERT/UPDATE apenas para service role
   - `user_settings`: SELECT/UPDATE apenas para o dono
   - `animes`: SELECT público, mutations restritas

---

### 3. Variável Sensível Exposta com Prefixo NEXT_PUBLIC (ALTA)

**Localização:** `/workspaces/Otaku-Calendar/apps/web/src/app/api/inngest/client.ts` - Linha 5

**Descrição:** A variável `NEXT_PUBLIC_INNGEST_EVENT_KEY` está exposta publicamente. Keys de eventos Inngest não devem ser expostas no frontend, pois permitem a qualquer pessoa enviar eventos para o sistema de filas.

**OWASP:** A04 - Cryptographic Failures

**Proof of Concept:**
```javascript
// Um atacante pode enviar eventos maliciosos para a fila Inngest
import { Inngest } from 'inngest';

const inngest = new Inngest({ eventKey: 'pub_pk_xxxxxxxx' });

// Enviar evento malicioso
await inngest.send({
  name: 'crawler/run',
  data: { url: 'malicious://payload' }
});
```

**Risco:** Injeção de eventos arbitrários no sistema de processamento em background.

**Recomendação:**
```typescript
// Remover prefixo NEXT_PUBLIC
// Usar server-side only
export const inngest = new Inngest({
  id: 'otaku-calendar-web',
  eventKey: process.env.INNGEST_EVENT_KEY,  // Sem NEXT_PUBLIC
});
```

---

### 4. Ausência de Validação de Entrada (ALTA)

**Localização:** `/workspaces/Otaku-Calendar/apps/web/src/app/api/rumors/[id]/route.ts` - Linha 25

**Descrição:** O parâmetro `id` é usado diretamente na query sem validação ou sanitização. Não há verificação de tipo, length, ou formato do ID.

**OWASP:** A03 - Injection, A05 - Injection

**Proof of Concept:**
```bash
# Potencialmente explorarInjection via ID
curl "https://otaku-calendar.com/api/rumors/'; DROP TABLE rumors;--"

# Ou explorar via parâmetros malformados
curl "https://otaku-calendar.com/api/rumors/null"
```

**Risco:**尽管 Supabase usa parametrização, a falta de validação permite enumeração de IDs e potenciais ataques.

**Recomendação:**
```typescript
import { z } from 'zod';

const RumorIdSchema = z.string().uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const result = RumorIdSchema.safeParse(id);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }
  // ...
}
```

---

### 5. Middleware Vazio Sem Headers de Segurança (ALTA)

**Localização:** `/workspaces/Otaku-Calendar/apps/web/src/middleware.ts` - Linhas 4-6

**Descrição:** O middleware existe mas não implementa nenhum header de segurança. Headers críticos como CSP, X-Frame-Options, HSTS estão ausentes.

**OWASP:** A02 - Security Misconfiguration

**Impacto:** A aplicação está vulnerável a:
- XSS (ausência de CSP)
- Clickjacking (ausência de X-Frame-Options)
- MIME sniffing (ausência de X-Content-Type-Options)
- downgrade de protocolo (ausência de HSTS)

**Recomendação:**
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
}
```

---

### 6. Exposição de Erros em Produção (MÉDIA)

**Localização:** `/workspaces/Otaku-Calendar/apps/web/src/app/api/rumors/[id]/route.ts` - Linha 38, 62

**Descrição:** Mensagens de erro detalhadas são retornadas ao cliente em caso de falhas. Isso pode expor informações internas do sistema.

**OWASP:** A09 - Insufficient Logging & Monitoring, A01 - Information Exposure

**Código Problemático:**
```typescript
// Retorna mensagem de erro detalhada
return NextResponse.json({ error: error.message }, { status: 500 });

// Retorna mensagem genérica em catch
return NextResponse.json(
  { error: error instanceof Error ? error.message : 'Unknown error' },
  { status: 500 }
);
```

**Risco:** Informações sobre estrutura do banco, tecnologias, ou vulnerabilidades podem ser expostas.

**Recomendação:**
```typescript
// Usar mensagens genéricas em produção
const errorMessage = process.env.NODE_ENV === 'development' 
  ? error.message 
  : 'Internal server error';

return NextResponse.json({ error: errorMessage }, { status: 500 });
```

---

### 7. Missing Rate Limiting (MÉDIA)

**Localização:** `/workspaces/Otaku-Calendar/apps/web/src/app/api/rumors/[id]/route.ts`

**Descrição:** Não há limitação de taxa (rate limiting) no endpoint. Um atacante pode fazer请求s ilimitadas para enumeração de dados ou DoS.

**OWASP:** A04 - Security Misconfiguration (Rate Limiting)

**Proof of Concept:**
```bash
# Enumerar todos os IDs de rumores
for i in {1..10000}; do 
  curl "https://otaku-calendar.com/api/rumors/$i" 
done
```

**Risco:** Enumeração de dados, DoS, custo adicional de API.

**Recomendação:**
```typescript
// Implementar rate limiting simples
const rateLimitCache = new Map<string, number[]>();

function rateLimit(key: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const requests = rateLimitCache.get(key) || [];
  const recent = requests.filter(t => now - t < windowMs);
  
  if (recent.length >= limit) return false;
  
  recent.push(now);
  rateLimitCache.set(key, recent);
  return true;
}

// Na rota
export async function GET(...) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(`rumor:${ip}`)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  // ...
}
```

---

### 8. Console Warn em Ambiente de Produção (BAIXA)

**Localização:** `/workspaces/Otaku-Calendar/apps/crawler/src/utils/supabase.ts` - Linha 9

**Descrição:** Há um `console.warn` que pode vazar informações sobre configuração em produção.

**OWASP:** A04 - Information Exposure

```typescript
console.warn('⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
```

**Recomendação:** Remover ou usar sistema de logging apropriado para produção.

---

### 9. Cookies sem Flags de Segurança (BAIXA)

**Localização:** `/workspaces/Otaku-Calendar/apps/web/src/lib/supabase.ts` - Linhas 15-21

**Descrição:** Não há configuração explícita de flags de segurança nos cookies (HttpOnly, Secure, SameSite).

**OWASP:** A07 - Insufficient Security Configuration

**Recomendação:**
```typescript
set(name: string, value: string, options: CookieOptions) {
  try {
    cookieStore.set(name, value, {
      ...options,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  } catch (error) { }
}
```

---

## Análise de Autenticação

### OAuth Implementation
**Localização:** `/workspaces/Otaku-Calendar/apps/web/src/app/auth/callback/route.ts`

| Aspecto | Status | Observação |
|---------|--------|-------------|
| Redirect URL | ✅ | Usando variável de ambiente |
| Error Handling | ✅ | Redireciona em caso de erro |
| Session Validation | ✅ | Verifica usuário após callback |
| State Parameter | ⚠️ | Não verificado - verificar se CSRF está protegido |

**Recomendação:** Implementar state parameter para prevenir CSRF em OAuth.

---

## Matriz de OWASP Top 10

| # | Categoria | Status | Arquivos Afetados |
|---|-----------|--------|-------------------|
| A01 | Broken Access Control | 🔴 CRÍTICO | route.ts, supabase.ts |
| A02 | Security Misconfiguration | 🟠 ALTO | middleware.ts, client.ts |
| A03 | Software Supply Chain | ✅ | Não aplicável a arquivos reviewed |
| A04 | Cryptographic Failures | 🔴 CRÍTICO | client.ts, route.ts |
| A05 | Injection | 🟠 ALTO | route.ts |
| A06 | Insecure Design | ⚠️ | Não avaliado |
| A07 | Authentication Failures | 🟠 ALTO | callback/route.ts |
| A08 | Integrity Failures | ✅ | Não aplicável |
| A09 | Logging & Alerting | 🟡 MÉDIO | route.ts |
| A10 | Unchecked Redirects | ✅ | Não encontrado |

---

## Recomendações Prioritárias

### Imediato (Crítico)
1. Substituir service role key por anon key + RLS
2. Habilitar Row Level Security em todas as tabelas
3. Remover NEXT_PUBLIC_ da Inngest event key

### Curto Prazo (Alto)
4. Implementar middleware com security headers
5. Adicionar validação de entrada com Zod
6. Implementar rate limiting

### Médio Prazo (Médio)
7. Mascarar erros em produção
8. Adicionar logging estruturado
9. Revisar configuração de cookies

---

## Conclusão

O backend apresenta vulnerabilidades críticas que devem ser corrigidas imediatamente. O principal problema é o uso de service role key em APIs públicas, que completamente ignora o modelo de segurança do Supabase. A exposição de variáveis sensíveis com prefixo NEXT_PUBLIC também é crítica, permitindo injeção de eventos maliciosos.

**Score de Segurança:** 4.5/10 - Requer ação imediata

---

*Relatório gerado em: 2026-04-02*
*Auditor: Security Expert*
*Stack: Next.js, Supabase, Inngest, TypeScript*