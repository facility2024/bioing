<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Commands (bun, not npm/pnpm)

- `bun install` · `bun run dev` · `bun run build` · `bun run build:dev` · `bun run preview`
- `bun run lint` = eslint **including prettier rules** (formatting is enforced through eslint, so there is no separate format check).
- **There is no test suite and no `typecheck` script.** Verification is: scoped lint + `bun run build` (passes on a clean checkout, ~10s). `bunx tsc --noEmit` works but reports ~8 pre-existing implicit-`any` errors — don't chase those unless they're in code you touched.
- **`bun run lint` fails on a clean checkout**: ~1000 pre-existing errors (~976 auto-fixable) across ~44 files, mostly `prettier/prettier`. Never run a repo-wide `--fix`/`format` to "make lint pass" — it rewrites dozens of untouched files. Lint only the files you changed (`bunx eslint path/to/file.tsx`).
- `bunfig.toml` sets `minimumReleaseAge = 86400` (deps published <24h are skipped) with an exclude list for `@lovable.dev/*`. Adding an exclude entry requires user confirmation.

## Build wiring — easy to break

- `vite.config.ts` must keep using `defineConfig` from `@lovable.dev/vite-tanstack-config`. That package already registers tanstackStart, react, tailwind, tsconfig paths, the `@` alias, VITE_* env injection, sandbox/port detection and **Nitro (default preset: Cloudflare Workers)**. Never add those plugins manually — duplicates break the app. Pass extra config via `defineConfig({ vite: {...} })`.
- Nitro deploy target is chosen by `NITRO_PRESET`: default Cloudflare Workers (`.output/`); Netlify sets `NITRO_PRESET=netlify` in `netlify.toml` (publish dir `dist` — must stay empty in the Netlify UI); Docker/EasyPanel sets `NITRO_PRESET=node-server` → run `node .output/server/index.mjs`.
- SSR entry is `src/server.ts` (wired via `tanstackStart.server.entry: "server"`); it converts h3-swallowed 500s into an HTML error page. `src/start.ts` holds global middleware — `attachSupabaseAuth` must stay registered there or server functions never get a bearer token.

## Routing / code layout

- File-based routes in `src/routes/`; conventions (`$` params, `{-}` optional, splat, `__root.tsx`) are in `src/routes/README.md`. No `src/pages/`, no Next.js/Remix layout patterns.
- `src/routeTree.gen.ts` is auto-generated — never hand-edit; it regenerates on `dev`/`build`.
- HTTP endpoints are routes too: `src/routes/api/**/*.ts` using `server.handlers` (see `api/public/mp-webhook.ts`).
- Server functions live in `src/lib/*.functions.ts` (`createServerFn` + `.middleware`); server-only modules are named `*.server.ts` and are `await import`-ed inside handlers. Importing the `server-only` package is an eslint error.
- Admin pages: `src/routes/_authenticated/admin/*` (gates in `_authenticated/route.tsx` and `admin/route.tsx`). shadcn/ui (new-york) components in `src/components/ui`, aliases per `components.json`, Tailwind v4 in `src/styles.css`.
- UI copy, error messages and many comments are in **Brazilian Portuguese** — user-facing strings should be too.

## Supabase

- Browser queries use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; server code uses `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` where privileged access is required.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client code or commit `.env` files. Set deployment secrets in the hosting provider.
- `types.ts` is generated; schema changes belong in timestamped `supabase/migrations/*.sql` files.
- Runtime integration secrets are read via `process.env`: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, and `MELHOR_ENVIO_TOKEN`.

## Versions

- `@tanstack/react-router`, `@tanstack/react-start`, `@tanstack/router-plugin` are pinned exact (no `^`) while most deps are not — don't bump them casually; the trio must stay compatible.
