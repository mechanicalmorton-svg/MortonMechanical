# Morton's Mechanicals

Mobile mechanic marketing website with a full staff portal dashboard.

## Stack

- **Next.js 16** — frontend + API routes
- **Supabase** — PostgreSQL database (content, auth, quotes, shop data)
- **Vercel** — hosting
- **GitHub** — source control

---

## 1. Supabase setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** → **New query**
3. Paste and run the entire contents of [`supabase/schema.sql`](./supabase/schema.sql)
4. Go to **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`

5. Enable Realtime (should be automatic after schema):
   - **Database → Replication** — confirm `site_content` is listed

---

## 2. Local development

```bash
cp .env.example .env.local
# Fill in your Supabase keys in .env.local

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — public site  
Open [http://localhost:3000/admin](http://localhost:3000/admin) — staff portal (first visit runs setup)

> Without Supabase env vars, the app falls back to local JSON files in `data/` for development.

---

## 3. GitHub setup

```bash
git init
git add .
git commit -m "Initial commit: Morton's Mechanicals website + staff portal"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/mortonsmechanicals.git
git branch -M main
git push -u origin main
```

---

## 4. Vercel deployment

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Add **Environment Variables** (same as `.env.local`):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

4. Click **Deploy**

Your live site will be at `https://your-project.vercel.app`

---

## 5. Owner workflow (live updates)

1. Visit **`/admin`** on the live Vercel URL
2. Complete one-time setup (create owner account)
3. Use **Page Customizer** to edit website content → **Save changes**
4. Open the public site in another tab — changes appear immediately via Supabase Realtime

---

## Project structure

```
src/
  app/           # Pages + API routes
  components/    # Public site + admin dashboard
  lib/           # Auth, content, shop data, Supabase clients
supabase/
  schema.sql     # Database schema — run once in Supabase
```

## Security notes

- Never commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` in client code
- The service role key is server-only (API routes)
- Rotate keys if accidentally exposed
