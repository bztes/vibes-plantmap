# Plantmap

Plan where to plant trees and see how much room they need as they grow. Place trees on a vector map, scrub through the years and Plantmap shows each crown's estimated size and warns when trees will end up too close together.

Built with SvelteKit (remote functions), Drizzle (SQLite/libSQL), session-cookie auth, Tailwind + tailwind-variants, Lucide icons and MapLibre GL with [OpenFreeMap](https://openfreemap.org) vector tiles (no API key). Address search uses [Photon](https://photon.komoot.io).

## Getting started

```sh
pnpm install
cp .env.example .env
pnpm dev               # migrations in drizzle/ run on start
```

After changing `src/lib/server/db/schema.ts` run `pnpm db:generate` to add a migration.

**The first account that signs up becomes admin.**

## Features

- **Plans**: one map per garden/property, reopens where you left it
- **Trees**: species, planting date (future dates = planned), size at planting, optional mature size override (e.g. dwarf rootstock), notes. In edit mode, drag the trunk marker to move a tree
- **Sharing**: create share links for a plan (share button next to the plan settings). View links work without an account, edit links ask people to sign in and then let them add, move, change and delete trees. Revoking a link removes access right away
- **Growth timeline**: crown and height for any year from today up to 60 years ahead, with playback
- **Conflicts**: overlapping crowns in the selected year, plus the year when currently separate trees will start to touch
- **Species**: your own custom species catalog, plus shared species added by admins that every user sees
- **Admin** (`/admin`), split into pages:
  - **Users**: promote/demote admins, deactivate/reactivate or delete users
  - **Species**: manage the shared species catalog visible to all users
  - **Settings**: turn sign up on or off
- **Base maps** (`/admin/maps`): manage the maps users can switch between (MapLibre vector styles or XYZ raster tiles), their order and the default. One click adds the defaults (OpenFreeMap Liberty and Esri World Imagery); more presets are in `src/lib/basemaps.ts`

## Docker

```sh
docker compose up -d
```

Serve it over HTTPS through a reverse proxy that passes on the `Host` header. The server takes its origin from the request headers and assumes `https`, so requests that change data are rejected as cross-site when the app is opened over plain `http`. If your proxy rewrites `Host`, set `HOST_HEADER=x-forwarded-host`; to take the protocol from the proxy, set `PROTOCOL_HEADER=x-forwarded-proto`.

The database lives in the `data` volume (`/data/local.db`).

## Releases

Run `pnpm changeset` to describe a change. On push to `main`, `.github/workflows/release.yml` opens a "chore: release" PR; merging it bumps the version, updates `CHANGELOG.md`, tags `vX.Y.Z` and pushes the Docker image (`linux/amd64` and `linux/arm64`) to Docker Hub. The workflow uses the `release` environment with a `DOCKERHUB_USERNAME` variable and a `DOCKERHUB_TOKEN` secret.

## Growth model

Size approaches the mature size exponentially, reaching ~95% at `yearsToMaturity`:

```
size(t) = mature − (mature − sizeAtPlanting) · e^(−3t / yearsToMaturity)
```

See `src/lib/growth.ts`. The numbers are rough estimates, since soil, climate and pruning matter a lot.

## Localisation

Write texts in English as tagged templates, there are no keys to maintain:

```svelte
<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
</script>

<Button label={t`Delete plan`}>{t`${count} trees`}</Button>
```

The vite plugin in `src/lib/i18n/plugin.ts` finds every `` t`…` `` and keeps one file per language in sync, e.g. `locales/de.json`, with the texts grouped by source file and keyed by a short hash of the text:

```json
{
	"lib/components/plans/PlanCard.svelte": {
		"ZhtWdVNB": "Plan löschen",
		"_UAauY-k": "{plan.treeCount} Bäume"
	}
}
```

- New texts show up with an empty translation (falls back to the fallback locale, then to the text in the code), removed ones (and groups of deleted files) disappear. The file is updated while `pnpm dev` runs and fully on every start/build, translation edits hot reload
- Placeholders are named after the expression (`{plan.name}`), or numbered (`{0}`) for anything more complex, so prefer putting computed values in a variable first
- Changing the English text means translating it again
- Plurals: pick the text yourself, e.g. `` n === 1 ? t`1 tree` : t`${n} trees` ``
- Call `t` while rendering or handling a request, not at module top level (e.g. pass valibot messages as `` () => t`…` ``), so it uses the current locale
- Languages are the fallback locale (`i18n({ fallbackLocale: 'en' })` in `vite.config.ts`, `en` by default) plus every `locales/*.json`. To add one, create an empty file, e.g. `touch locales/fr.json`; the dev server restarts and fills it. `locales/_t0n.json` is not a language: it is generated with every text as it is in the code, to look up which text a hash belongs to (don't edit it). The fallback locale is used for missing translations and when none of the browser's languages is supported
- The locale comes from the `locale` cookie (set by the language switcher), then `Accept-Language`. Use `getLocale()` for dates and numbers
- The browser only downloads the translations of the current locale, one small chunk per source file, loaded together with the file. Missing translations are filled from the fallback locale at build time, and texts equal to the one in the code are left out, so no text is sent twice. Switching the language loads the chunks of the new locale first, then updates the page

## Layout

- `src/lib/remote/*.remote.ts`: remote functions (queries, forms, commands)
- `src/lib/server/`: auth, db schema, access guards
- `src/lib/components/ui/`: generic tv-styled components (Button, Input, Dialog, …)
- `src/lib/components/{map,plan,plans,species,admin,layout}/`: feature components
- `src/lib/i18n/`: translation runtime, vite plugin and locale hook
- `src/lib/{growth,geo,plan}.ts`: growth model, geo math, conflict detection
