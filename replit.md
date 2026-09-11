# LayoutView Sender

Dashboard Node.js cho phép kết nối bot Discord, nhập và xem trước LayoutView Components V2, chọn server/kênh rồi gửi ngay hoặc hẹn giờ.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/layoutview-sender run typecheck` — check the web dashboard
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

 - `artifacts/layoutview-sender/src/App.tsx` — composer, live LayoutView preview, routing controls, scheduling and activity UI.
 - `artifacts/layoutview-sender/src/index.css` — dark animated command-center visual system.
 - `artifacts/api-server/src/lib/discord-bot.ts` — Discord client lifecycle, server/channel discovery, and Components V2 send path.
 - `artifacts/api-server/src/lib/message-scheduler.ts` — in-memory immediate/scheduled activity and timers.
 - `artifacts/api-server/src/routes/` — API handlers backed by the OpenAPI contract.
 - `lib/api-spec/openapi.yaml` — source of truth for generated client and validation types.

## Architecture decisions

 - Discord bot tokens are held only in the running API process; they are not written to PostgreSQL or returned by any API response.
 - LayoutView messages are sent as Discord Components V2 payloads with `IsComponentsV2` and mention parsing disabled.
 - Scheduling is intentionally runtime-only for this first build; scheduled timers reset when the API process restarts.

## Product

Users can paste LayoutView JSON, see a live Discord-style rendering, connect a bot, discover servers and text channels, send immediately, schedule a future send, and review recent activity.

## User preferences

 - Preserve the uploaded futuristic dark UI atmosphere and motion effects, but replace the original site's content completely.
 - The product is specifically for LayoutView/Components V2 messages, not regular embeds.

## Gotchas

 - The Discord bot needs the `Guilds` intent and permission to view/send in target channels.
 - The server workflow supplies `PORT`; manual Vite production builds need `PORT` and `BASE_PATH`.
- For Vercel, deploy the web artifact as a static SPA and set `VITE_API_BASE_URL` to the public URL of an always-on API deployment. Vercel serverless functions should not host the Discord Gateway client or in-memory scheduler.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
