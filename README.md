# Monthly Audit App (Next.js)

A simple kitchen audit + deep clean scheduler. Built with **Next.js 14**, **Tailwind**, **lucide-react**, **Recharts**, and **jsPDF**.

## 1) Run Locally

```bash
# 1. Install Node.js 18+ (LTS recommended)
# 2. In this folder, install deps:
npm install

# 3. Start dev server
npm run dev

# 4. Open in your browser
http://localhost:3000
```

## 2) Deploy to Vercel (Recommended)

1. Create a new GitHub repo and push this folder to it.
2. Go to https://vercel.com/import and choose your repo.
3. Framework is auto-detected as **Next.js**. Use the defaults:
   - Build Command: `next build`
   - Output Directory: `.vercel/output` (auto-managed) or leave blank for Next.js
4. Click **Deploy**. First build takes ~1–2 minutes.
5. When it’s live, copy the URL and share it with your team.

### Custom Domain (optional)
- In Vercel project → **Settings → Domains** → add `audit.yourdomain.com`.
- Point your DNS CNAME to `cname.vercel-dns.com`.

## Notes
- Data is saved to `localStorage` (per browser). No backend needed.
- `public/mamas-logo.png` is a placeholder—replace with your brand asset.
- If you want Microsoft login/email later, we’ll add API routes + a small DB.
