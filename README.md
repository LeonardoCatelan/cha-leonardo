# Chá de Casa Nova — Leonardo

Convite digital construído com Next.js, React, TypeScript, App Router e Supabase.
O projeto usa o runtime oficial do Next.js e o Supabase como único backend.

## Requisitos

- Node.js 22.13 ou superior
- pnpm

## Desenvolvimento local

```bash
pnpm install
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000).

Copie `.env.example` para `.env.local` e preencha:

- `SUPABASE_URL`;
- `SUPABASE_PUBLISHABLE_KEY` (usada somente para a assinatura Realtime);
- `SUPABASE_SECRET_KEY` (somente no servidor);
- `GIFT_ADMIN_CODE` (código de convite do casal, no formato `XXXX-XXXX`);
- `INVITATION_CODE_SECRET` (segredo aleatório de 64 caracteres hexadecimais
  usado para proteger códigos e sessões de convite).
- `PIX_KEY`, `PIX_HOLDER` e `PIX_KEY_KIND` (opcionais: o Pix exibido no convite;
  sem chave ou titular, o cartão de Pix não aparece).

Nunca prefixe a chave secreta com `NEXT_PUBLIC_`.

## Banco de dados

As alterações do Postgres ficam versionadas em `supabase/migrations`. Depois de
criar e vincular um projeto Supabase:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref SEU_PROJECT_REF
pnpm db:push
pnpm db:types
```

Para usar o ambiente local do Supabase, é necessário ter um runtime compatível
com Docker:

```bash
pnpm db:start
pnpm db:reset
pnpm exec supabase gen types --lang typescript --local --schema public > src/types/database.types.ts
```

As migrations criam presentes, convites, sessões e reservas; ativam RLS; negam
acesso público direto aos dados privados e usam funções transacionais para
reservar, confirmar ou cancelar unidades sem ultrapassar a quantidade
disponível, inclusive em acessos simultâneos.

O tutorial completo de conexão do projeto, MCP, migrations, tipos e variáveis
está em [`docs/backend-supabase.md`](docs/backend-supabase.md).

## Validações locais

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

O comando `pnpm check` executa lint, verificação de tipos e build de produção.

## Rotas

- `/` — portão de entrada; com sessão, o convite da audiência do convite
- `/familia` — convite da família
- `/amigos` — convite dos amigos
- `/criar-presentes` — área privada para administrar presentes e convites
- `/api/gifts` — leitura e mutações da lista de presentes
- `/api/invitations/access` — troca um código de convite por uma sessão segura
- `/api/invitations/admin` — administração de convites, protegida no servidor

## Acesso

O código do convite é a porta de entrada do site. Sem sessão, nenhuma das rotas
de convite renderiza data, endereço ou lista de presentes: o visitante recebe
apenas o formulário do código. Por isso essas páginas são dinâmicas.

Cada pessoa, casal ou família recebe um código no formato `XXXX-XXXX`. Ao
digitá-lo, o servidor cria uma sessão persistente em cookie `HttpOnly`; assim,
as reservas ficam ligadas ao convite, e não ao navegador. O mesmo código pode
ser usado em outro aparelho para recuperar as escolhas. Trocar o código de um
convite revoga as sessões anteriores.

No painel, cada convite pode ser marcado como **presença confirmada** — o
registro manual do "vou sim" que chega pelo WhatsApp. É só um marcador: não
mexe em acesso nem em sessões. A lista vem do convite mais novo para o mais
antigo, e tem filtro por família e amigos, com a contagem de confirmados do
grupo selecionado.

Excluir um convite apaga o código, as sessões e as escolhas de presente,
devolvendo as unidades reservadas à lista. É irreversível e serve para convites
criados por engano. O convite do casal não pode ser excluído.

Cada presente pode ser editado no painel — nome, descrição, quantidade e link.
A quantidade total nunca cai abaixo das unidades já escolhidas; o formulário
mostra o mínimo e o banco recusa o resto.

O link é opcional e aparece para o convidado como **"Ver sugestão"**: indica o
modelo que o casal tem em mente, sem obrigar a comprar naquele lugar. Só `http`
e `https` são aceitos, validado no servidor e por constraint no banco, já que o
valor vira um `href` na página do convidado.

O link copiado no painel leva o código no fragmento da URL
(`/familia#convite=ABCD-EFGH`). Ele abre o convite direto e vale mesmo em um
aparelho que já tenha outra sessão aberta; o fragmento sai da barra de endereço
assim que é usado.

### Acesso do casal

O casal usa um convite como qualquer convidado. O que o diferencia é a coluna
`is_admin` na sua linha de `gift_invitations`: com ela, a mesma sessão que abre
o convite também libera `/criar-presentes`, as mutações de presentes e a
administração de convites. O casal enxerga tanto `/familia` quanto `/amigos`.

Esse código é o valor de `GIFT_ADMIN_CODE`. O servidor mantém a linha
administrativa em sincronia com a variável: cria na primeira execução e, quando
o valor muda, troca o código e revoga as sessões administrativas anteriores.
Para rotacionar, basta alterar a variável e reiniciar a aplicação. O convite do
casal não aparece na lista do painel, para que ninguém o pause ou troque seu
código por engano.

## Estrutura

```text
src/
├── app/                    # Rotas, layout, API e estilos globais
├── components/invitation/  # Componentes visuais do convite
├── lib/invitations/        # Códigos, criptografia e sessões de convite
├── lib/supabase/           # Cliente privilegiado exclusivo do servidor
└── types/                  # Tipos gerados do schema Supabase
supabase/
├── migrations/             # Schema, funções, políticas e publicação Realtime
└── seed.sql                # Dados locais de desenvolvimento
```

As páginas são Server Components: a sessão é lida do cookie antes de qualquer
renderização, e é ela que decide entre o portão de entrada e o convite. As
interações da lista de presentes usam Client Components e Route Handlers; as
credenciais privilegiadas ficam exclusivamente no servidor.

## Publicação

O frontend pode ser publicado em qualquer plataforma compatível com Next.js.
Banco, API de dados, funções transacionais e Realtime pertencem ao Supabase.
Os segredos devem ser configurados como variáveis de ambiente no provedor de
deploy; nenhuma credencial real deve ser versionada.

### Deploy na Vercel

A Vercel detecta Next.js sozinha: não há `vercel.json`, e os comandos padrão
(`pnpm install` e `pnpm build`) já são os corretos. O `engines.node` do
`package.json` fixa o Node 22.

Antes do primeiro deploy, cadastre em **Settings > Environment Variables**, para
Production, Preview e Development:

| Variável | Onde encontrar |
| --- | --- |
| `SUPABASE_URL` | Supabase > Project Settings > API |
| `SUPABASE_PUBLISHABLE_KEY` | idem — é a chave que pode chegar ao navegador |
| `SUPABASE_SECRET_KEY` | idem — **nunca** prefixe com `NEXT_PUBLIC_` |
| `GIFT_ADMIN_CODE` | o código `XXXX-XXXX` do casal, escolhido por você |
| `INVITATION_CODE_SECRET` | 64 caracteres hexadecimais aleatórios |
| `PIX_KEY` / `PIX_HOLDER` / `PIX_KEY_KIND` | sua chave Pix, o titular e o rótulo do tipo de chave — opcionais |

Dois cuidados que valem para este projeto:

- `INVITATION_CODE_SECRET` protege os códigos por HMAC e cifra os que aparecem
  no painel. Se ele mudar depois de os convites terem sido criados, nenhum
  código antigo será reconhecido e o painel não conseguirá exibi-los. Gere o
  valor uma vez e mantenha o mesmo em produção.
- `GIFT_ADMIN_CODE` pode ser trocado quando quiser: o servidor sincroniza o
  convite do casal e encerra as sessões administrativas anteriores.

O build não precisa das variáveis — todas as rotas de convite são dinâmicas e
só leem o banco durante as requisições —, mas o site não funciona sem elas em
tempo de execução.

Como o ambiente de Preview aponta para o mesmo Supabase de produção, considere
um projeto Supabase separado para Preview caso queira testar sem tocar nos
dados reais.
