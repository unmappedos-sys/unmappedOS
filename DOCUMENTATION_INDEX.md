# 📚 Unmapped OS - Documentation Index

**Your complete guide to the Unmapped OS repository.**

---

## 🚀 Quick Start

**New to the project?** Start here:

1. **[README.md](README.md)** - Project overview, tech stack, quick install
2. **[BOOTSTRAP_GUIDE.md](BOOTSTRAP_GUIDE.md)** - Detailed step-by-step setup from scratch
3. **[PRD.md](PRD.md)** - Product requirements and feature specifications

**Want to verify everything works?**

4. **[ACCEPTANCE_TESTS_COMPLETE.md](ACCEPTANCE_TESTS_COMPLETE.md)** - Test every feature with exact commands

---

## 📖 Documentation by Purpose

### For Developers Setting Up

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[BOOTSTRAP_GUIDE.md](BOOTSTRAP_GUIDE.md)** | Complete setup from zero to running | First time setup, troubleshooting |
| **[README.md](README.md)** | Quick reference and architecture | Daily development, reference |
| **[.env.example](.env.example)** | Environment variables template | Configuring deployment |

### For Product Managers / Stakeholders

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[PRD.md](PRD.md)** | Product requirements & Strategy 6.0 features | Understanding scope, planning v2 |
| **[DELIVERY_REPORT.md](DELIVERY_REPORT.md)** | Complete delivery summary with metrics | Project review, handoff |
| **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** | Feature checklist and status | Tracking completion |

### For QA / Testing

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[ACCEPTANCE_TESTS_COMPLETE.md](ACCEPTANCE_TESTS_COMPLETE.md)** | Full test scenarios with commands | Manual testing, regression |
| **[tests/unit/](tests/unit/)** | Jest unit test specs | Automated unit testing |
| **[tests/integration/](tests/integration/)** | Playwright E2E specs | Automated integration testing |

### For DevOps / Deployment

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[.github/workflows/ci.yml](.github/workflows/ci.yml)** | CI pipeline configuration | Setting up CI/CD |
| **[.github/workflows/packgen_cron.yml](.github/workflows/packgen_cron.yml)** | Weekly pack regeneration | Scheduled tasks |
| **[infrastructure/supabase/](infrastructure/supabase/)** | Database schemas | Database setup |

### For Troubleshooting

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[AUTH_TROUBLESHOOTING.md](AUTH_TROUBLESHOOTING.md)** | Auth debugging guide | OAuth issues |
| **[AUTH_FIXED.md](AUTH_FIXED.md)** | Auth fixes history | Reference for solved issues |
| **[AUTH_SETUP.md](AUTH_SETUP.md)** | OAuth provider setup | Configuring Google/GitHub/Apple |

### For Understanding the Codebase

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[REPO_SUMMARY.md](REPO_SUMMARY.md)** | Code organization and patterns | Navigating codebase |
| **[packages/lib/src/](packages/lib/src/)** | Shared library code | Understanding algorithms |
| **[apps/web/](apps/web/)** | Next.js application | Frontend development |

---

## 🎯 By User Role

### I'm a **New Developer** joining the project

**Start here (in order)**:
1. [README.md](README.md) - Get context
2. [BOOTSTRAP_GUIDE.md](BOOTSTRAP_GUIDE.md) - Setup environment
3. [REPO_SUMMARY.md](REPO_SUMMARY.md) - Understand code structure
4. [PRD.md](PRD.md) - Learn product requirements
5. Start coding!

### I'm a **Product Manager** reviewing deliverables

**Read these**:
1. [DELIVERY_REPORT.md](DELIVERY_REPORT.md) - Complete delivery summary
2. [PRD.md](PRD.md) - Verify all Strategy 6.0 features
3. [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Check feature status

### I'm a **QA Engineer** testing features

**Use these**:
1. [ACCEPTANCE_TESTS_COMPLETE.md](ACCEPTANCE_TESTS_COMPLETE.md) - Test scenarios
2. [BOOTSTRAP_GUIDE.md](BOOTSTRAP_GUIDE.md) - Setup test environment
3. `pnpm test` and `pnpm test:integration` - Run automated tests

### I'm a **DevOps Engineer** deploying

**Read these**:
1. [BOOTSTRAP_GUIDE.md](BOOTSTRAP_GUIDE.md) - Environment setup
2. [.env.example](.env.example) - Required variables
3. [infrastructure/supabase/](infrastructure/supabase/) - Database setup
4. [.github/workflows/](.github/workflows/) - CI/CD configuration

### I'm a **Stakeholder** doing project review

**Executive summary**:
1. [DELIVERY_REPORT.md](DELIVERY_REPORT.md) - High-level overview
2. [PRD.md](PRD.md) - Feature specifications
3. [ACCEPTANCE_TESTS_COMPLETE.md](ACCEPTANCE_TESTS_COMPLETE.md) - Validation evidence

---

## 📂 File Structure Reference

```
unmapped-os/
├── 📄 README.md                          # Project overview & quick start
├── 📄 BOOTSTRAP_GUIDE.md                 # Step-by-step setup guide ⭐
├── 📄 PRD.md                             # Product requirements ⭐
├── 📄 DELIVERY_REPORT.md                 # Complete delivery summary ⭐
├── 📄 ACCEPTANCE_TESTS_COMPLETE.md       # Full test scenarios ⭐
├── 📄 IMPLEMENTATION_SUMMARY.md          # Feature checklist
├── 📄 REPO_SUMMARY.md                    # Code organization
├── 📄 AUTH_SETUP.md                      # OAuth configuration
├── 📄 AUTH_TROUBLESHOOTING.md            # Auth debugging
├── 📄 AUTH_FIXED.md                      # Auth fixes history
├── 📄 .env.example                       # Environment template
├── 📄 package.json                       # Root dependencies
├── 📄 tsconfig.json                      # TypeScript config
├── 📄 jest.config.js                     # Jest config
├── 📄 playwright.config.ts               # Playwright config
│
├── 📁 apps/web/                          # Next.js application
│   ├── 📁 pages/                         # Next.js pages
│   │   ├── 📁 api/                       # API routes ⭐
│   │   │   ├── search.ts                 # Search with ranking
│   │   │   ├── comments.ts               # Submit intel
│   │   │   ├── comments/
│   │   │   │   ├── list.ts               # Get comments
│   │   │   │   ├── verify.ts             # Verify intel
│   │   │   │   └── flag.ts               # Flag comments
│   │   │   ├── reports.ts                # Hazard reports
│   │   │   └── agg-check.ts              # Kill-switch logic
│   │   ├── index.tsx                     # Landing page
│   │   ├── map/[city].tsx                # Tactical display
│   │   ├── cities.tsx                    # Pack selection
│   │   └── operative.tsx                 # Profile
│   ├── 📁 components/                    # React components
│   │   ├── MapComponent.tsx              # Map renderer
│   │   ├── StatusPanel.tsx               # HUD
│   │   ├── TerminalLoader.tsx            # Progress loader
│   │   ├── CommentModal.tsx              # Intel submission ⭐
│   │   ├── CommentsList.tsx              # Intel display ⭐
│   │   └── SearchBar.tsx                 # Advanced search ⭐
│   ├── 📁 hooks/                         # Custom hooks ⭐
│   │   ├── useSnapshotGPS.ts             # GPS snapshot
│   │   ├── useActiveTrip.ts              # Trip timer
│   │   ├── useVibration.ts               # Haptics
│   │   ├── useTheme.ts                   # Theme switcher
│   │   └── useOfflineQueue.ts            # Offline sync
│   └── 📁 lib/                           # Utilities
│       ├── supabase.ts                   # Supabase client
│       ├── idb.ts                        # IndexedDB
│       ├── cityPack.ts                   # Pack loading
│       └── i18n/                         # Translations
│
├── 📁 packages/lib/                      # Shared library
│   └── 📁 src/
│       ├── anchor.ts                     # Anchor algorithm ⭐
│       ├── overpass.ts                   # OSM queries
│       ├── scoring.ts                    # Zone scoring
│       └── types.ts                      # Shared types
│
├── 📁 scripts/                           # Automation scripts
│   ├── 📁 packgen/
│   │   ├── generate_pack.ts              # Pack generator
│   │   └── generate_all.ts               # Batch generator
│   └── 📁 seed/
│       └── seed_database.ts              # DB seeding
│
├── 📁 infrastructure/
│   ├── 📁 supabase/                      # Database schemas ⭐
│   │   ├── schema.sql                    # Base schema
│   │   └── schema_extensions.sql         # Strategy 6.0
│   └── 📁 .github/workflows/             # CI/CD
│       ├── ci.yml                        # Lint, test, build
│       └── packgen_cron.yml              # Weekly regen
│
├── 📁 tests/                             # Test suites
│   ├── 📁 unit/                          # Jest unit tests
│   └── 📁 integration/                   # Playwright E2E
│
├── 📁 data/
│   ├── 📁 packs/                         # Generated packs
│   │   ├── bangkok_pack.json             # Bangkok ~800KB
│   │   └── tokyo_pack.json               # Tokyo ~750KB
│   └── 📁 seed/                          # Seed polygons
│       ├── bangkok_zones.json
│       └── tokyo_zones.json
│
└── 📁 i18n/
    └── en.json                           # Mission lexicon
```

⭐ = Key files for Strategy 6.0

---

## 🔍 Quick Find

### Need to...

**Set up the project?**  
→ [BOOTSTRAP_GUIDE.md](BOOTSTRAP_GUIDE.md)

**Understand what was built?**  
→ [DELIVERY_REPORT.md](DELIVERY_REPORT.md) or [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

**Test all features?**  
→ [ACCEPTANCE_TESTS_COMPLETE.md](ACCEPTANCE_TESTS_COMPLETE.md)

**Fix auth issues?**  
→ [AUTH_TROUBLESHOOTING.md](AUTH_TROUBLESHOOTING.md)

**Understand product requirements?**  
→ [PRD.md](PRD.md)

**Deploy to production?**  
→ [BOOTSTRAP_GUIDE.md](BOOTSTRAP_GUIDE.md) + [.env.example](.env.example)

**Find API endpoints?**  
→ `apps/web/pages/api/` or [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) (API section)

**Understand anchor algorithm?**  
→ `packages/lib/src/anchor.ts` or [PRD.md](PRD.md) (Architecture section)

**See database schema?**  
→ `infrastructure/supabase/schema.sql` + `schema_extensions.sql`

**Run tests?**  
→ `pnpm test` (unit) + `pnpm test:integration` (E2E)

---

## 📊 Documentation Quality Checklist

All documents in this repository are:

- ✅ **Complete** - No TODOs or placeholders
- ✅ **Tested** - Commands verified to work
- ✅ **Up-to-date** - Reflects current codebase
- ✅ **Comprehensive** - Covers all Strategy 6.0 features
- ✅ **Searchable** - Clear headings and structure
- ✅ **Production-ready** - No debug/dev notes

---

## 🎯 Recommended Reading Order

### For First-Time Setup (3 docs):
1. [README.md](README.md) - 5 min read
2. [BOOTSTRAP_GUIDE.md](BOOTSTRAP_GUIDE.md) - 20 min read + follow steps
3. [ACCEPTANCE_TESTS_COMPLETE.md](ACCEPTANCE_TESTS_COMPLETE.md) - 30 min to run all tests

### For Understanding Scope (2 docs):
1. [PRD.md](PRD.md) - 15 min read
2. [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - 10 min read

### For Deployment (2 docs):
1. [BOOTSTRAP_GUIDE.md](BOOTSTRAP_GUIDE.md) - Environment setup
2. [.env.example](.env.example) - Configuration reference

### For Handoff/Review (1 doc):
1. [DELIVERY_REPORT.md](DELIVERY_REPORT.md) - Complete summary

---

## 🔗 External Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Mapbox GL JS**: https://docs.mapbox.com/mapbox-gl-js/
- **OpenStreetMap Overpass**: https://wiki.openstreetmap.org/wiki/Overpass_API
- **Playwright**: https://playwright.dev/

---

## 📞 Support

**Questions?** Check the relevant document above first, then:
1. Search existing GitHub Issues
2. Open a new Issue with reproduction steps
3. Contact maintainers (if direct contact available)

---

## ✅ Documentation Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| README.md | ✅ Complete | Dec 12, 2025 |
| BOOTSTRAP_GUIDE.md | ✅ Complete | Dec 12, 2025 |
| PRD.md | ✅ Complete | Dec 12, 2025 |
| DELIVERY_REPORT.md | ✅ Complete | Dec 12, 2025 |
| ACCEPTANCE_TESTS_COMPLETE.md | ✅ Complete | Dec 12, 2025 |
| IMPLEMENTATION_SUMMARY.md | ✅ Complete | Dec 12, 2025 |
| REPO_SUMMARY.md | ✅ Existing | (Earlier) |
| AUTH_SETUP.md | ✅ Existing | (Earlier) |
| AUTH_TROUBLESHOOTING.md | ✅ Existing | (Earlier) |
| AUTH_FIXED.md | ✅ Existing | (Earlier) |

**All documentation is production-ready. ✅**

---

**Happy building! 🚀**
