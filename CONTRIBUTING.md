# Contributing

## Setup

```sh
pnpm install
cp .env.example .env
pnpm dev
```

The dev server runs on `http://localhost:5173`. The database (`local.db`) goes into `./data`, change it with `DATA_DIR`.

## Checks

```sh
pnpm check   # types
pnpm lint    # prettier + eslint
pnpm test    # unit tests
```

## Database

Schema changes: edit `src/lib/server/db/schema.ts`, then `pnpm db:generate` to add a migration under `drizzle/`. Migrations are applied on server start.

## Releases

Add a changeset with `pnpm changeset` for user-facing changes. Merging to `main` opens a release PR; merging that tags the version and publishes the Docker image to GHCR.
