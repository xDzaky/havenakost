~/Desktop/ProjectWebsite-bersama/havenakost main*
❯ npx next-api-analyzer analyze --security
ℹ️ 🚀 Starting API analysis...
ℹ️ Starting API routes analysis...
ℹ️ Found 66 API files
✅ Analyzed 66 API routes
ℹ️ 📊 Analysis Summary:
  Routes: 66
  Security Score: 0.0%
  Performance Score: 100.0%
  Maintainability Score: 100.0%
  Recommendations: 0
✅ ✅ Analysis complete in 274ms! Report saved to: ./api-analysis-report.md

~/Desktop/ProjectWebsite-bersama/havenakost main* 10s
❯ npx claustra .
Need to install the following packages:
claustra@1.6.1
Ok to proceed? (y) y
[claustra] scanning /home/dzaky/Desktop/ProjectWebsite-bersama/havenakost

claustra found 50 issues in 50 files

  ⚠ high      src/app/api/admin/dashboard/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/dashboard" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/dashboard". No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/dashboard/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/health/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/health" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/health". No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/health/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/listings/[id]/approve/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/listings/:id/approve" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/listings/:id/approve"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/listings/:id/approve/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/listings/[id]/reject/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/listings/:id/reject" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/listings/:id/reject"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/listings/:id/reject/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/listings/[id]/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/listings/:id" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/listings/:id". No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/listings/:id/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/listings/[id]/status/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/listings/:id/status" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/listings/:id/status"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/listings/:id/status/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/listings/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/listings" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/listings". No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/listings/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/logs/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/logs" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/logs". No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/logs/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/owners/[id]/approve/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/owners/:id/approve" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/owners/:id/approve"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/owners/:id/approve/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/owners/[id]/reject/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/owners/:id/reject" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/owners/:id/reject"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/owners/:id/reject/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/owners/[id]/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/owners/:id" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/owners/:id". No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/owners/:id/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/owners/[id]/status/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/owners/:id/status" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/owners/:id/status"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/owners/:id/status/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/owners/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/owners" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/owners". No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/owners/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/reviews/[id]/hide/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/reviews/:id/hide" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/reviews/:id/hide"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/reviews/:id/hide/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/reviews/[id]/override-owner-reject/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/reviews/:id/override-owner-reject" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/reviews/:id/override-owner-reject"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/reviews/:id/override-owner-reject/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/reviews/[id]/publish/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/reviews/:id/publish" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/reviews/:id/publish"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/reviews/:id/publish/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/reviews/[id]/reject/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/reviews/:id/reject" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/reviews/:id/reject"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/reviews/:id/reject/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/reviews/[id]/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/reviews/:id" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/reviews/:id". No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/reviews/:id/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/reviews/[id]/verify/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/reviews/:id/verify" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/reviews/:id/verify"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/reviews/:id/verify/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/reviews/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/reviews" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/reviews". No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/reviews/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/subscription-payments/[id]/approve/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/subscription-payments/:id/approve" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/subscription-payments/:id/approve"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/subscription-payments/:id/approve/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/subscription-payments/[id]/reject/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/subscription-payments/:id/reject" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/subscription-payments/:id/reject"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/subscription-payments/:id/reject/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/subscription-payments/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/subscription-payments" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/subscription-payments". No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/subscription-payments/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/subscription-plans/[id]/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/subscription-plans/:id" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/subscription-plans/:id"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/subscription-plans/:id/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/subscription-plans/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/subscription-plans" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/subscription-plans"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/subscription-plans/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/subscriptions/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/subscriptions" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/subscriptions". No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/subscriptions/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/admin/users/[id]/revoke-sessions/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/admin/users/:id/revoke-sessions" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: path under sensitive segment "/api/admin/users/:id/revoke-sessions"; exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/admin/users/:id/revoke-sessions/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/auth/[...all]/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/auth/:all*" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE; performs DB/FS mutation. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/auth/:all*/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/finances/[id]/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/finances/:id" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/finances/:id/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/finances/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/finances" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/finances/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/listings/[id]/facilities/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/listings/:id/facilities" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/listings/:id/facilities/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/listings/[id]/photos/confirm/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/listings/:id/photos/confirm" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/listings/:id/photos/confirm/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/listings/[id]/photos/presign/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/listings/:id/photos/presign" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/listings/:id/photos/presign/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/listings/[id]/rooms/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/listings/:id/rooms" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/listings/:id/rooms/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/listings/[id]/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/listings/:id" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/listings/:id/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/listings/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/listings" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/listings/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/notifications/[id]/read/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/notifications/:id/read" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/notifications/:id/read/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/notifications/read-all/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/notifications/read-all" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/notifications/read-all/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/occupancies/[occupancyId]/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/occupancies/:occupancyId" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/occupancies/:occupancyId/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/photos/[photoId]/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/photos/:photoId" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/photos/:photoId/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/reviews/[reviewId]/reject/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/reviews/:reviewId/reject" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/reviews/:reviewId/reject/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/reviews/[reviewId]/reply/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/reviews/:reviewId/reply" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/reviews/:reviewId/reply/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/reviews/[reviewId]/verify/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/reviews/:reviewId/verify" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/reviews/:reviewId/verify/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/rooms/[roomId]/occupancies/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/rooms/:roomId/occupancies" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/rooms/:roomId/occupancies/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/rooms/[roomId]/qr/regenerate/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/rooms/:roomId/qr/regenerate" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/rooms/:roomId/qr/regenerate/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/rooms/[roomId]/qr/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/rooms/:roomId/qr" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/rooms/:roomId/qr/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/rooms/[roomId]/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/rooms/:roomId" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/rooms/:roomId/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/owner/subscription/payment/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/owner/subscription/payment" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/owner/subscription/payment/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/public/reviews/[reviewId]/report/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/public/reviews/:reviewId/report" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/public/reviews/:reviewId/report/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

  ⚠ high      src/app/api/public/reviews/route.ts:1
    C05-MIDDLEWARE-COVERAGE - Sensitive route "/api/public/reviews" is not protected by middleware or an inline auth check
    Reasons this route is sensitive: exports POST/PUT/PATCH/DELETE. No `middleware.ts`/`.js` file is present at the project root or under `src/`. The file itself does not call a recognized auth helper, and no ancestor `layout.tsx` calls one either. Anyone can hit this URL - including indexers and unauthenticated bots.
    → Either (a) add a matcher entry like `'/api/public/reviews/:path*'` to `middleware.ts`'s `config.matcher` and ensure the middleware body calls `auth()` (or your provider's equivalent), or (b) call `auth()` / `currentUser()` / `validateRequest()` at the top of this handler and redirect/throw on missing session, or (c) add the auth call to a shared ancestor `layout.tsx` so the whole subtree inherits it.

50 issues: 50 high
Run with --reporter=json for machine-readable output.

~/Desktop/ProjectWebsite-bersama/havenakost main* 27s
❯ curl -i http://localhost:3000/api/admin/some-endpoint
HTTP/1.1 404 Not Found
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
X-Frame-Options: DENY
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https:; style-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
Cache-Control: no-store
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding
Content-Type: text/html; charset=utf-8
Date: Tue, 17 Nov 2026 13:10:19 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

<!DOCTYPE html><html><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/%5Bturbopack%5D_browser_dev_hmr-client_hmr-client_ts_0fb9-gqu7_t97._.js"/><script src="/_next/static/chunks/1daa_next_dist_compiled_react-dom_cjs_react-dom-client_development_0mp0cp_t-ezj9.js" async=""></script><script src="/_next/static/chunks/1q96_modules_next_dist_compiled_react-dom_cjs_react-dom_development_1sqry0_53krp4.js" async=""></script><script src="/_next/static/chunks/node_modules_next_dist_compiled_react-dom_0grqycjrj6mju._.js" async=""></script><script src="/_next/static/chunks/node_modules_next_dist_compiled_react-server-dom-turbopack_164kp-67asdr9._.js" async=""></script><script src="/_next/static/chunks/node_modules_next_dist_compiled_next-devtools_index_090k2jmam7qwg.js" async=""></script><script src="/_next/static/chunks/node_modules_next_dist_compiled_1amofcmz--cdp._.js" async=""></script><script src="/_next/static/chunks/node_modules_next_dist_client_1165-soo5tfpf._.js" async=""></script><script src="/_next/static/chunks/node_modules_next_dist_05y3oi5z9mc_3._.js" async=""></script><script src="/_next/static/chunks/node_modules_%40swc_helpers_cjs_1r9vbqwj2323d._.js" async=""></script><script src="/_next/static/chunks/_1anvha4rlo79g._.js" async=""></script><script src="/_next/static/chunks/turbopack-_11q0wbt2n0d9y._.js" async=""></script><script src="/_next/static/chunks/_18x7jxupx5rou._.js" async=""></script><script src="/_next/static/chunks/node_modules_next_dist_20wefz_f1k6jn._.js" async=""></script><meta name="robots" content="noindex"/><title>404: This page could not be found.</title><script src="/_next/static/chunks/node_modules_next_dist_build_polyfills_polyfill-nomodule.js" noModule=""></script></head><body><div hidden=""><!--$--><!--/$--></div><div style="font-family:system-ui,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif,&quot;Apple Color Emoji&quot;,&quot;Segoe UI Emoji&quot;;height:100vh;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center"><div><style>body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}</style><h1 class="next-error-h1" style="display:inline-block;margin:0 20px 0 0;padding:0 23px 0 0;font-size:24px;font-weight:500;vertical-align:top;line-height:49px">404</h1><div style="display:inline-block"><h2 style="font-size:14px;font-weight:400;line-height:49px;margin:0">This page could not be found.</h2></div></div></div><!--$--><!--/$--><script id="_R_">self.__next_r="dxQR92r4aWYbI7qkXJRY-";var __nextHmrInitialVersion="0";</script><script src="/_next/static/chunks/%5Bturbopack%5D_browser_dev_hmr-client_hmr-client_ts_0fb9-gqu7_t97._.js" async=""></script><script>(self.__next_f=self.__next_f||[]).push([0])</script><script>self.__next_f.push([1,"6:\"[project]/node_modules/next/dist/next-devtools/userspace/app/segment-explorer-node.js [app-client] (ecmascript)\"\n7:\"/_next/static/chunks/node_modules_next_dist_20wefz_f1k6jn._.js\"\n8:I[\"$6\",[\"$7\"],\"SegmentViewNode\"]\na:\"$Sreact.fragment\"\n1b:\"[project]/node_modules/next/dist/client/components/layout-router.js [app-client] (ecmascript)\"\n1c:I[\"$1b\",[\"$7\"],\"default\"]\n1e:\"[project]/node_modules/next/dist/client/components/render-from-template-context.js [app-client] (ecmascript)\"\n1f:I[\"$1e\",[\"$7\"],\"default\"]\n4d:\"[project]/node_modules/next/dist/lib/framework/boundary-components.js [app-client] (ecmascript)\"\n4e:I[\"$4d\",[\"$7\"],\"OutletBoundary\"]\n50:\"$Sreact.suspense\"\n5e:\"ViewportBoundary\"\n5f:I[\"$4d\",[\"$7\"],\"$5e\"]\n68:\"MetadataBoundary\"\n69:I[\"$4d\",[\"$7\"],\"$68\"]\n74:\"[project]/node_modules/next/dist/client/components/builtin/global-error.js [app-client] (ecmascript)\"\n75:I[\"$74\",[\"$7\"],\"default\",1]\n1:D\"$3\"\n1:D\"$2\"\n1:D\"$4\"\n1:null\nc:D\"$16\"\nc:D\"$d\"\nc:D\"$18\"\n21:D\"$23\"\n21:D\"$22\"\n21:D\"$25\"\n21:D\"$24\"\n21:D\"$26\"\n21:[[\"$\",\"title\",null,{\"children\":\"404: This page could not be found.\"},\"$24\",\"$27\",1],[\"$\",\"div\",null,{\"style\":{\"fontFamily\":\"system-ui,\\\"Segoe UI\\\",Roboto,Helvetica,Arial,sans-serif,\\\"Apple Color Emoji\\\",\\\"Segoe UI Emoji\\\"\",\"height\":\"100vh\",\"textAlign\":\"center\",\"display\":\"flex\",\"flexDirection\":\"column\",\"alignItems\":\"center\",\"justifyContent\":\"center\"},\"children\":[\"$\",\"div\",null,{\"children\":[[\"$\",\"style\",null,{\"dangerouslySetInnerHTML\":{\"__html\":\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\"}},\"$24\",\"$2a\",1],[\"$\",\"h1\",null,{\"className\":\"next-error-h1\",\"style\":{\"display\":\"inline-block\",\"margin\":\"0 20px 0 0\",\"padding\":\"0 23px 0 0\",\"fontSize\":24,\"fontWeight\":500,\"verticalAlign\":\"top\",\"lineHeight\":\"49px\"},\"children\":404},\"$24\",\"$2b\",1],[\"$\",\"div\",null,{\"style\":{\"display\":\"inline-block\"},\"children\":[\"$\",\"h2\",null,{\"style\":{\"fontSize\":14,\"fontWeight\":400,\"lineHeight\":\"49px\",\"margin\":0},\"children\":\"This page could not be found.\"},\"$24\",\"$2d\",1]},\"$24\",\"$2c\",1]]},\"$24\",\"$29\",1]},\"$24\",\"$28\",1]]\nc:[\"$\",\"html\",null,{\"children\":[\"$\",\"body\",null,{\"children\":[\"$\",\"$L1c\",null,{\"parallelRouterKey\":\"children\",\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L1f\",null,{},null,\"$1d\",1],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":[\"$\",\"$L8\",\"c-not-found\",{\"type\":\"not-found\",\"pagePath\":\"__next_builtin__not-found.js\",\"children\":[\"$21\",[]]},null,\"$20\",0],\"forbidden\":\"$undefined\",\"unauthorized\":\"$undefined\",\"segmentViewBoundaries\":[[\"$\",\"$L8\",null,{\"type\":\"boundary:not-found\",\"pagePath\":\"__next_builtin__not-found.js@boundary\"},null,\"$2e\",1],\"$undefined\",\"$undefined\",[\"$\",\"$L8\",null,{\"type\":\"boundary:global-error\",\"pagePath\":\"__next_builtin__global-error.js\"},null,\"$2f\",1]]},null,\"$1a\",1]},\"$d\",\"$19\",1]},\"$d\",\"$17\",1]\n34:X\n38:D\"$3c\"\n38:D\"$39\"\n38:D\"$3e\"\n38:D\"$3d\"\n38:D\"$3f\"\n38:[[\"$\",\"title\",null,{\"children\":\"404: This page could not be found.\"},\"$3d\",\"$40\",1],[\"$\",\"div\",null,{\"style\":\"$21:1:props:style\",\"children\":[\"$\",\"div\",null,{\"children\":[[\"$\",\"style\",null,{\"dangerouslySetInnerHTML\":{\"__html\":\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\"}},\"$3d\",\"$43\",1],[\"$\",\"h1\",null,{\"className\":\"next-error-h1\",\"style\":\"$21:1:props:children:props:children:1:props:style\",\"children\":404},\"$3d\",\"$44\",1],[\"$\",\"div\",null,{\"style\":\"$21:1:props:children:props:children:2:props:style\",\"children\":[\"$\",\"h2\",null,{\"style\":\"$21:1:props:children:props:children:2:props:children:props:style\",\"children\":\"This page could not be found.\"},\"$3d\",\"$46\",1]},\"$3d\",\"$45\",1]]},\"$3d\",\"$42\",1]},\"$3d\",\"$41\",1]]\n47:D\"$4a\"\n47:D\"$48\"\n47:D\"$4c\"\n47:[\"$\",\"$L4e\",null,{\"children\":[\"$\",\"$50\",null,{\"name\":\"Next.MetadataOutlet\",\"children\":\"$@51\"},\"$48\",\"$4f\",1]},\"$48\",\"$4b\",1]\n35:[[\"children\",{\"s\":\"__PAGE__\",\"d\":{\"r\":[\"$\",\"$a\",\"c\",{\"children\":[[\"$\",\"$L8\",\"c-page\",{\"type\":\"page\",\"pagePath\":\"__next_builtin__not-found.js\",\"children\":\"$38\"},null,\"$37\",1],null,\"$47\"]},null,\"$36\",0],\"p\":false,\"v\":null}}]]\n30:[[\"children\",{\"s\":\"/_not-found\",\"d\":{\"r\":[\"$\",\"$a\",\"c\",{\"children\":[null,[\"$\",\"$L1c\",null,{\"parallelRouterKey\":\"children\",\"error\":\"$undefined\",\"errorStyles\":\"$undefined\",\"errorScripts\":\"$undefined\",\"template\":[\"$\",\"$L1f\",null,{},null,\"$33\",1],\"templateStyles\":\"$undefined\",\"templateScripts\":\"$undefined\",\"notFound\":\"$undefined\",\"forbidden\":\"$undefined\",\"unauthorized\":\"$undefined\",\"segmentViewBoundaries\":[\"$undefined\",\"$undefined\",\"$undefined\",\"$undefined\"]},null,\"$32\",1]]},null,\"$31\",0],\"p\":false,\"v\":\"$34\"},\"c\":\"$Q35\"}]]\n53:D\"$56\"\n53:D\"$54\"\n53:D\"$58\"\n53:[\"$\",\"meta\",null,{\"name\":\"robots\",\"conten
