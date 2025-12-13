# 🚀 Unmapped OS - Complete Bootstrap Guide

This guide provides step-by-step instructions to get Unmapped OS running from scratch on your local machine.

---

## Prerequisites

Before starting, ensure you have:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **pnpm** >= 8.0.0 (or use npm that comes with Node.js)
- **Supabase Account** ([Free Tier](https://supabase.com/))
- **Mapbox Account** (optional, [Free Tier](https://www.mapbox.com/))
- **Git** ([Download](https://git-scm.com/))

---

## Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/unmapped-os.git
cd unmapped-os
```

---

## Step 2: Install Dependencies

### Option A: Using pnpm (Recommended - Faster)

```bash
# Install pnpm globally if you don't have it
npm install -g pnpm

# Install project dependencies
pnpm install
```

### Option B: Using npm (Slower but works)

```bash
npm install
```

---

## Step 3: Environment Configuration

### 3.1 Copy Environment Template

```bash
cp .env.example .env
```

### 3.2 Configure Supabase (Required)

1. **Create Supabase Project**:
   - Go to [supabase.com/dashboard](https://supabase.com/dashboard)
   - Click "New Project"
   - Name: `unmapped-os`
   - Database Password: Choose a strong password (save it!)
   - Region: Choose closest to you
   - Wait 2-3 minutes for project to spin up

2. **Get API Keys**:
   - In your project dashboard, go to Settings > API
   - Copy the following values:

   ```
   Project URL: https://xxx.supabase.co
   anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (secret!)
   ```

3. **Add to `.env`**:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Keep secret!
   ```

### 3.3 Configure NextAuth (Required)

Generate a secret key:

```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Add to `.env`:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_generated_secret_here
```

### 3.4 Configure Mapbox (Optional but Recommended)

1. **Create Mapbox Account**:
   - Go to [mapbox.com](https://www.mapbox.com/)
   - Sign up for free (50,000 map loads/month free)

2. **Get Access Token**:
   - Go to [account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens/)
   - Copy your "Default public token" (starts with `pk.`)

3. **Add to `.env`**:

   ```bash
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
   ```

   **If you skip Mapbox**, the app will use MapLibre with OpenFreeMap tiles (already configured in `.env.example`).

### 3.5 Configure OAuth Providers (Optional)

To enable Google/GitHub/Apple sign-in, follow the setup guides:

- **Google**: See [AUTH_SETUP.md](AUTH_SETUP.md) - Google OAuth section
- **GitHub**: See [AUTH_SETUP.md](AUTH_SETUP.md) - GitHub OAuth section
- **Apple**: See [AUTH_SETUP.md](AUTH_SETUP.md) - Apple OAuth section

If you skip OAuth setup, users can still use the app anonymously.

---

## Step 4: Database Setup

### 4.1 Run Base Schema

1. **Open Supabase SQL Editor**:
   - In your Supabase dashboard, go to SQL Editor
   - Click "New Query"

2. **Copy and run the base schema**:

   ```bash
   # Copy contents of infrastructure/supabase/schema.sql
   cat infrastructure/supabase/schema.sql
   ```

   - Paste into SQL Editor
   - Click "Run" (or press F5)
   - Wait for "Success. No rows returned" message

3. **Run schema extensions**:

   ```bash
   # Copy contents of infrastructure/supabase/schema_extensions.sql
   cat infrastructure/supabase/schema_extensions.sql
   ```

   - Paste into SQL Editor
   - Click "Run"

### 4.2 Seed Database (Optional)

Seed the database with sample zones, comments, and prices:

```bash
# Using pnpm
pnpm run seed:db

# Using npm
npm run seed:db
```

This will populate:
- Cities: Bangkok, Tokyo
- Sample zones for each city
- Sample comments and prices

---

## Step 5: Generate City Packs

Generate the offline city packs for Bangkok and Tokyo:

```bash
# Generate all packs
pnpm run packgen:all

# Or generate individually
pnpm run packgen:bangkok
pnpm run packgen:tokyo
```

**Expected output**:
- `apps/web/public/data/packs/bangkok_pack.json` (~800KB)
- `apps/web/public/data/packs/tokyo_pack.json` (~750KB)

**Note**: Pack generation queries OpenStreetMap via Overpass API. If you get rate-limited, wait 1 minute and retry.

---

## Step 6: Start Development Server

```bash
# Using pnpm
pnpm dev

# Using npm
npm run dev
```

**Expected output**:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

---

## Step 7: Verify Installation

### 7.1 Open Browser

Navigate to [http://localhost:3000](http://localhost:3000)

You should see the Unmapped OS landing page with cinematic terminal-style UI.

### 7.2 Test Pack Download

1. Navigate to `/cities` page
2. Click **"ACQUIRE CITY BLACK BOX: BANGKOK"**
3. Observe TerminalLoader with progress animation
4. Open DevTools > Application > IndexedDB
5. Verify `city_packs` database contains `bangkok` entry

### 7.3 Test Map Display

1. Navigate to `/map/bangkok`
2. You should see:
   - Map with neon zone polygons
   - Anchor ring icons
   - Status Panel (HUD)
3. Click on a zone to view details

### 7.4 Test Offline Mode

1. Open DevTools > Network tab
2. Select "Offline" from throttling dropdown
3. Reload page
4. Map should still render zones from cached pack

---

## Step 8: Run Tests

### Unit Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Integration Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run integration tests
pnpm test:integration
```

---

## Step 9: Production Build

Test that the app builds for production:

```bash
# Build
pnpm build

# Start production server
pnpm start
```

Navigate to [http://localhost:3000](http://localhost:3000) to verify production build works.

---

## Troubleshooting

### Issue: "Cannot find module '@/hooks/...'"

**Solution**: Ensure `apps/web/tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "paths": {
      "@/hooks/*": ["hooks/*"]
    }
  }
}
```

### Issue: Pack generation fails with "Rate limited"

**Solution**: Overpass API has rate limits. Wait 60 seconds and retry:

```bash
sleep 60
pnpm run packgen:bangkok
```

### Issue: Map doesn't render

**Solutions**:
1. Check DevTools Console for errors
2. Verify `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env` (or use MapLibre fallback)
3. Ensure city pack is downloaded (check IndexedDB)

### Issue: Auth doesn't work

**Solutions**:
1. Verify Supabase URL and keys are correct
2. Check `NEXTAUTH_SECRET` is set
3. See [AUTH_TROUBLESHOOTING.md](AUTH_TROUBLESHOOTING.md) for detailed guide

### Issue: Database queries fail

**Solutions**:
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
2. Check Supabase project is active (not paused)
3. Ensure schemas ran successfully (check SQL Editor for errors)

---

## Next Steps

Once everything is running:

1. **Explore Features**:
   - Download packs for both cities
   - Submit test comments
   - Test search functionality
   - Try export to Google Maps

2. **Read Documentation**:
   - [PRD.md](PRD.md) - Full product requirements
   - [ACCEPTANCE_TESTS_COMPLETE.md](ACCEPTANCE_TESTS_COMPLETE.md) - Feature testing guide
   - [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Complete feature list

3. **Customize**:
   - Add more cities by creating seed polygons in `data/seed/`
   - Customize Mission Lexicon in `i18n/en.json`
   - Adjust themes in `tailwind.config.js`

4. **Deploy**:
   - See [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel/Docker deployment guides (if file exists)
   - Configure GitHub Actions for CI/CD
   - Set up domain and SSL

---

## Quick Reference

### Common Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm start                  # Start production server

# Code Quality
pnpm lint                   # Lint code
pnpm format                 # Format with Prettier
pnpm test                   # Run unit tests
pnpm test:integration       # Run E2E tests

# Data
pnpm packgen:all            # Generate all city packs
pnpm packgen:bangkok        # Generate Bangkok pack only
pnpm seed:db                # Seed Supabase database
pnpm seed:all               # Generate packs + seed DB

# Utilities
pnpm --filter web dev       # Run only web app
pnpm --filter lib build     # Build shared library
```

### Important Files

```
.env                        # Environment variables (create from .env.example)
apps/web/pages/             # Next.js pages
apps/web/components/        # React components
apps/web/hooks/             # Custom React hooks
apps/web/lib/               # Utilities and helpers
packages/lib/src/           # Shared library code
infrastructure/supabase/    # Database schemas
tests/                      # Unit and integration tests
```

### Default Ports

- **Development Server**: http://localhost:3000
- **Supabase Studio**: https://[your-project].supabase.co (online dashboard)

---

## Support

- **Documentation**: [README.md](README.md), [PRD.md](PRD.md)
- **Issues**: Open a GitHub issue with reproduction steps
- **Community**: Join Discord (link in README if available)

---

## Summary Checklist

- [ ] Node.js 18+ installed
- [ ] pnpm installed
- [ ] Repository cloned
- [ ] Dependencies installed (`pnpm install`)
- [ ] `.env` configured with Supabase credentials
- [ ] `NEXTAUTH_SECRET` generated and set
- [ ] Supabase schemas run successfully
- [ ] Database seeded (optional)
- [ ] City packs generated (`pnpm run packgen:all`)
- [ ] Dev server running (`pnpm dev`)
- [ ] Landing page loads at localhost:3000
- [ ] Map page renders zones
- [ ] Tests pass (`pnpm test`)

**If all boxes checked, you're ready to go! 🎉**

---

**Built for urban operatives worldwide. Happy exploring! 🗺️**
