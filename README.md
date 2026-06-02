# Mom's Kitchen PWA

Mom's Kitchen is a React + Vite + TypeScript PWA. Supabase is the cloud source of truth. The existing `moms_*` localStorage keys and IndexedDB image stores remain as read cache only.

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run typecheck
npm run lint
npm run build
```

## Supabase Setup

Copy `.env.example` to `.env` and fill in the public Supabase client values:

```bash
cp .env.example .env
```

Required browser-safe variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server-side Cloudflare Pages Function variable:

- `UPLOADTHING_TOKEN` for UploadThing image hosting. Keep this server-side only; do not add a `VITE_` prefix.

Cloud sync requires:

- Google provider enabled in Supabase Auth.
- Localhost and deployed origins allowed as redirect URLs.
- Real user accounts created through Google or magic link.
- A `profiles` row for each user with `role`, `household_id`, `is_superadmin`, `display_name`, and `email`.

Bootstrap the first household and admin manually from a privileged SQL session. Do not add client-side self-elevation.

```sql
insert into public.households (name, created_by)
values ('Mom''s Kitchen', '<user-uuid>')
returning id;

update public.profiles
set role = 'admin', household_id = '<household-uuid>'
where id = '<user-uuid>';
```

Roles:

- `admin`: household admin, can edit and use `/admin`.
- `editor`: can edit household data.
- `member`: read-only.
- `is_superadmin = true`: platform admin access for `/admin`.

## Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref fpqivcgavpmdmqszgtqq
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

Do not run `npx supabase db push --linked` without explicit approval.

## Cloudflare Pages Deployment

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repo root
- Framework preset: `Vite`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `UPLOADTHING_TOKEN`

The repo includes `public/_redirects`:

```text
/* /index.html 200
```

After deploy, add the Pages production URL and preview URLs to Supabase Auth redirect URLs, then test `/login`, `/dashboard`, `/admin`, and direct refresh on protected routes.

For local UploadThing image upload testing, use Cloudflare Pages Functions:

```bash
npx wrangler pages dev dist
```

Plain `npm run dev` runs Vite only and cannot exercise `functions/api/uploadthing.ts`.
