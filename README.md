# Recovery Plate

Nigerian meal and macro planner: daily calorie/macro tracker, 150+ Nigerian and everyday foods, 60+ raw ingredients (soups, swallows, rice, beans, proteins, fruits, vegetables, Twinings green teas), a recipe builder that calculates calories from your own ingredients, a goal-weight timeline, a weight log, offline mode (installable PWA) and Supabase sync across devices.

Stack: React 19, Tailwind CSS 4, built with Bun. Zero other runtime dependencies (Supabase is called over plain `fetch`).

## 1. Supabase (sync)

1. Create a project at supabase.com.
2. SQL Editor: paste and run `supabase/schema.sql` (creates `user_state` with row-level security).
3. Authentication > Providers: keep **Email** on. Decide whether to require email confirmation.
4. Authentication > URL Configuration: set **Site URL** to your Cloudflare URL (e.g. `https://recovery-plate.pages.dev`) and add it under **Redirect URLs**. Confirmation and password-reset links return there.
5. Project Settings > API: copy the **Project URL** and the **anon / publishable** key. Never use the `service_role` / secret key; the build refuses it.

## 2. Cloudflare Pages

**Git deploy (recommended)**: push this folder to GitHub, then Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git.

| Setting | Value |
|---|---|
| Build command | `bun install && bun run build` |
| Build output directory | `dist` |
| Environment variables | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |

Cloudflare's build image includes Bun. If you ever see "bun: not found", add `BUN_VERSION` = `1.3.14` as a variable.

**Direct upload (no Git)**: run the build locally, then `bunx wrangler pages deploy dist --project-name recovery-plate`.

Add a custom domain under the project's Custom domains tab, then update the Supabase Site URL to match.

## 3. Local development

```bash
bun install
cp .env.example .env      # fill in the two values (optional: app runs without sync)
bun run build && bun run serve   # http://localhost:4173
bun test                         # data checks, energy maths, sync-merge tests
```

## How sync works

* Local-first: everything is saved in the browser immediately and works offline.
* Each record (log entry, recipe, weigh-in, food, setting) carries an `updatedAt`. Deletes are stored as tombstones.
* Sync = pull the cloud copy, merge record by record (newest edit wins), push if the cloud is behind. It runs about 1.5 s after an edit, when the app returns to the foreground, when the network comes back, and once a minute while open.
* Two devices editing at once converge on the next sync, and nothing is lost unless both change the same record.

## Updating the food data

* Built-in foods: `src/data/foods.ts` (per serving). Ingredients for recipes: `src/data/ingredients.ts` (per 100 g).
* `bun test` checks that every food's calories roughly match its protein/carbs/fat (4/4/9 kcal per gram), so a typo is caught before you publish.
* Defaults for a brand-new user (age, weight, goal, dates): `DEFAULT_PROFILE` in `src/lib/state.ts`. Change these before sharing the app with other people.
* App name: `src/config.ts`, `index.html`, `public/manifest.webmanifest`.

## Notes

* The service worker is network-first for pages (3.5 s timeout, then cache) and cache-first only for hashed files in `/assets`, so a new deploy shows up on the next load and the app still opens offline.
* This is a planning aid, not medical advice. The in-app note about eating below resting BMR after surgery should stay.
