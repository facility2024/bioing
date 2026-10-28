# Bioing

Loja virtual e painel administrativo da Bioing, construídos com TanStack Start, React, Vite e Supabase.

## Requisitos

- Bun (use Bun, não npm ou pnpm).
- Acesso ao projeto Supabase `uyzexrxngtucjsdovhlz`.
- Variáveis do Supabase e, para operações de servidor, a chave secreta configuradas no ambiente.

## Desenvolvimento local

1. Instale as dependências:

   ```powershell
   bun install --frozen-lockfile
   ```

2. Crie o arquivo local de ambiente e preencha os valores no seu computador:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Inicie o servidor:

   ```powershell
   bun run dev
   ```

Comandos disponíveis: `bun run build`, `bun run build:dev`, `bun run preview` e `bun run lint`.

## Supabase

### Projeto conectado

- Projeto: `uyzexrxngtucjsdovhlz`
- URL: `https://uyzexrxngtucjsdovhlz.supabase.co`
- Painel: <https://supabase.com/dashboard/project/uyzexrxngtucjsdovhlz>
- Arquivo local do CLI: `supabase/config.toml`

O banco conectado já tem o schema da aplicação e estas tabelas no schema `public`:

| Área           | Tabelas                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| Catálogo       | `categorias`, `produtos`                                                 |
| Pedidos        | `clientes`, `enderecos`, `pedidos`, `itens_pedido`                       |
| Loja e envio   | `configuracoes_empresa`, `configuracoes_envio`, `configuracoes_whatsapp` |
| Página inicial | `home_slides`, `home_secoes`, `oferta_popup`                             |
| Acesso         | `user_roles`                                                             |

As tabelas têm Row Level Security (RLS). Visitantes podem ler os dados públicos do catálogo e da loja; operações administrativas são limitadas a usuários com papel `admin`. O schema também contém funções internas de autorização e estoque. O bucket privado `pedidos-pdf` armazena PDFs de pedidos.

Os dados públicos copiados do banco anterior incluem 21 produtos, 1 categoria, 5 banners, 6 seções e configurações da loja, envio e oferta. As URLs atuais das imagens apontam para os provedores de origem. Clientes, endereços, pedidos, itens de pedidos e credenciais do WhatsApp não foram migrados porque exigem acesso administrativo ao banco anterior.

### Variáveis de ambiente

Use `.env.local` para desenvolvimento e configure os mesmos nomes na hospedagem. O arquivo `.env.example` contém apenas nomes e placeholders; não coloque chaves reais no Git.

| Variável                        | Onde é usada          | Observação                                                                                                        |
| ------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Navegador e build     | URL do projeto Supabase.                                                                                          |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Navegador e build     | Chave publicável; pode estar no bundle do navegador. Nunca use uma chave secreta aqui.                            |
| `SUPABASE_URL`                  | Servidor              | URL do mesmo projeto.                                                                                             |
| `SUPABASE_PUBLISHABLE_KEY`      | Servidor e middleware | Chave publicável usada para validar sessões.                                                                      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Apenas servidor       | Chave privilegiada para pedidos, PDFs e operações internas. Nunca exponha ao navegador nem a prefixe com `VITE_`. |
| `CLEANUP_CRON_SECRET`           | Apenas servidor       | Segredo aleatório exigido pelo endpoint de limpeza de PDFs.                                                       |
| `MP_ACCESS_TOKEN`               | Apenas servidor       | Token privado do Mercado Pago.                                                                                    |
| `MP_PUBLIC_KEY`                 | Aplicação             | Chave pública do Mercado Pago.                                                                                    |
| `MELHOR_ENVIO_TOKEN`            | Apenas servidor       | Token privado do Melhor Envio.                                                                                    |

`SUPABASE_PROJECT_ID` e `VITE_SUPABASE_PROJECT_ID` podem ser usados por ferramentas auxiliares; o cliente da aplicação usa as variáveis de URL e chave acima.

### Acesso administrativo

O e-mail solicitado para acesso é **tavinhocasartelli@gmail.com**. Ele ainda não consta como usuário no Auth do projeto. O administrador existente verificado é `gustavoescudeiro@gmail.com`.

Para conceder acesso ao novo e-mail:

1. No painel Supabase, abra **Authentication → Users** e convide `tavinhocasartelli+vida@gmail.com`.
2. Depois que o usuário aparecer na lista, abra **SQL Editor** e execute:

   ```sql
   INSERT INTO public.user_roles (user_id, role)
   SELECT id, 'admin'::public.app_role
   FROM auth.users
   WHERE lower(email) = lower('tavinhocasartelli@gmail.com')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

3. O usuário define a própria senha pelo convite e entra em `/auth` na loja.

Não coloque senha ou token de convite neste README. O primeiro usuário criado em um banco novo recebe papel `admin` pelo trigger; usuários seguintes recebem papel `user` até um administrador conceder acesso.

### Migrations e segurança

O projeto Supabase conectado já recebeu migrations de bootstrap do schema, políticas públicas, bucket de PDFs e controles de admin. A lista aplicada deve ser consultada no Supabase antes de qualquer alteração de banco.

O histórico remoto atual contém `bootstrap_bioing_schema`, `fix_public_read_rls`, `create_private_order_pdf_bucket`, `complete_admin_table_access`, `harden_admin_role_functions` e `move_role_check_to_private_schema`. Os arquivos SQL versionados localmente ainda incluem migrations históricas do projeto anterior e **não representam esse histórico remoto consolidado**. Não execute `supabase db push` nem todas as migrations antigas às cegas: algumas contêm ações específicas sobre usuários antigos ou cron vinculado ao domínio anterior. Para reproduzir o banco em outro projeto, primeiro reconcilie e versione uma baseline SQL que corresponda ao schema ativo; não use `supabase db reset` em produção.

Antes de mudanças de schema em produção, faça backup, revise RLS e use uma migration versionada. Nunca use a chave `service_role` em código cliente, commits, tickets ou mensagens.

## Publicação

### Netlify

O deploy usa `netlify.toml`, Bun e o preset Nitro para Netlify. Configure as variáveis de ambiente na área de configuração do site, para os contextos de build e função. As variáveis `VITE_*` precisam existir durante a build; as chaves privadas precisam estar disponíveis apenas no runtime das funções.

Deixe o campo **Publish directory** vazio na interface do Netlify; a configuração do projeto já define o destino. Depois de salvar as variáveis, faça uma nova build e publique.

### Docker / servidor Node

O `Dockerfile` usa o preset `node-server`. Passe `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` como build args. Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CLEANUP_CRON_SECRET` e as integrações privadas como variáveis de runtime no orquestrador. Não grave segredos em camadas da imagem.

## Rotas úteis

- Loja: `/`
- Login administrativo: `/auth`
- Painel: `/admin/dashboard`
- Webhook Mercado Pago: `/api/public/mp-webhook`
- Limpeza de PDFs: `/api/public/cron/cleanup-pedidos-pdf` (exige `Authorization: Bearer <CLEANUP_CRON_SECRET>`)

## Verificação

```powershell
bunx eslint src/integrations/supabase src/routes/api/public/cron/cleanup-pedidos-pdf.ts
bun run build
```

Não há suíte de testes automatizados configurada no momento.
