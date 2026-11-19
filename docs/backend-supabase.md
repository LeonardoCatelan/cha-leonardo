# Backend oficial: Next.js + Supabase

Este projeto usa Next.js com App Router no runtime oficial e Supabase como único
backend. Não há ORM, Cloudflare, D1, Vinext ou Wrangler.

## 1. Projeto Supabase

O projeto atualmente conectado no painel é:

- Project ref: `rklzzxthjksvawnbqvwp`
- URL: `https://rklzzxthjksvawnbqvwp.supabase.co`

O schema versionado fica em `supabase/migrations`. Não faça alterações manuais
no Table Editor sem criar a migration equivalente.

## 2. Conectar o Supabase MCP ao Codex

O arquivo `.codex/config.toml` já contém o servidor oficial, limitado a este
project ref:

```toml
[mcp_servers.supabase]
url = "https://mcp.supabase.com/mcp?project_ref=rklzzxthjksvawnbqvwp"
auth = "oauth"
enabled = true
default_tools_approval_mode = "writes"
```

Para concluir a conexão:

1. Reinicie o Codex para carregar `.codex/config.toml`.
2. Abra **Settings > MCP servers**.
3. Encontre `supabase` e selecione **Authenticate**.
4. Autorize somente a organização correta no Supabase.
5. Abra uma nova tarefa neste repositório e use `/mcp` para confirmar o servidor.
6. Peça ao Codex: “Use o Supabase MCP e liste as tabelas do projeto”.

Durante o desenvolvimento o MCP precisa escrever migrations. Depois que o
projeto estiver em produção, prefira um projeto/branch separado para
desenvolvimento ou altere a URL para incluir `read_only=true`.

## 3. Aplicar o banco

Fluxo preferencial:

1. Inspecionar o schema remoto com o MCP.
2. Revisar `supabase/migrations`.
3. Aplicar a migration com a ferramenta `apply_migration` do MCP.
4. Rodar os advisors de segurança e performance.
5. Gerar novamente `src/types/database.types.ts` a partir do schema remoto.

Alternativa reproduzível com o CLI:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref rklzzxthjksvawnbqvwp
pnpm db:push
pnpm db:types
```

Nunca execute `db reset --linked` em um projeto com dados reais.

## 4. Variáveis de ambiente

No painel do Supabase, abra **Project Settings > API Keys**. Configure
`.env.local` sem enviar as chaves pelo chat:

```dotenv
SUPABASE_URL=https://rklzzxthjksvawnbqvwp.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
GIFT_ADMIN_CODE=ABCD-EFGH
INVITATION_CODE_SECRET=64-caracteres-hexadecimais-aleatorios
```

- A publishable key pode chegar ao cliente somente para Realtime e sempre com
  RLS/grants mínimos.
- A secret key ignora RLS e deve existir apenas no servidor.
- `GIFT_ADMIN_CODE` é o código de convite do casal, com os mesmos oito
  caracteres dos demais convites. O servidor mantém a linha `is_admin` de
  `gift_invitations` em sincronia com essa variável: cria na primeira execução
  e, quando o valor muda, troca o código e revoga as sessões administrativas
  anteriores. Não pode coincidir com o código de um convidado.
- `INVITATION_CODE_SECRET` protege os códigos por HMAC e permite que apenas o
  servidor recupere o código exibido na área administrativa. Gere um valor
  aleatório diferente em cada ambiente e não o troque sem antes rotacionar os
  convites.
- Nenhuma chave real deve ser commitada.

## 5. Desenvolvimento e validação

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

Depois de qualquer mudança no banco:

```bash
pnpm db:push
pnpm db:types
```

## 6. Regra para produção

- Migrations são a fonte de verdade do schema.
- RLS é obrigatória nas tabelas expostas.
- Quantidades e reservas são alteradas dentro de funções transacionais do
  Postgres.
- Cada convite ou família tem um código curto `XXXX-XXXX`. O banco armazena um
  hash para validação, o código cifrado para a área administrativa e sessões
  com tokens também armazenados apenas como hash.
- O acesso do casal é o mesmo convite, marcado com `is_admin`. Não há senha
  administrativa separada nem credencial no navegador; um índice parcial
  garante que exista no máximo uma linha administrativa.
- `is_confirmed`/`confirmed_at` registram a confirmação de presença informada
  fora do site. Não afetam acesso nem `session_version`.
- `delete_gift_invitation` apaga o convite dentro de uma transação, devolvendo
  ao estoque as unidades que ele ainda segurava e recusando o convite do casal.
- A coluna `is_active` continua existindo como interruptor de emergência via
  SQL — o acesso e a leitura de sessão a respeitam —, mas nenhuma tela a
  altera.
- A sessão do convidado usa cookie `HttpOnly`, `SameSite=Lax` e `Secure` em
  produção. Reservas pertencem ao convite e podem ser recuperadas em qualquer
  aparelho com o mesmo código. Toda reserva pertence a um convite:
  `gift_reservations.invitation_id` é obrigatório.
- Sessões e tentativas de acesso vencidas são apagadas por
  `purge_expired_invitation_state()`, chamada após cada acesso bem-sucedido.
- Alterar a quantidade bloqueia a linha do presente no Postgres antes de
  verificar o saldo, evitando reserva acima do estoque em concorrência.
- Chaves privilegiadas e a senha administrativa ficam em módulos `server-only`.
- Realtime observa somente dados públicos necessários para atualizar a lista.
