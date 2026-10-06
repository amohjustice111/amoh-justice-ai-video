# AMOH JUSTICE AI VIDEO — Vercel build

This version is configured for Vercel, not Netlify.

## Vercel setup
1. Import/upload the project to the GitHub repository used by the Vercel project.
2. In Vercel → Settings → Environment Variables, add `RUNWAYML_API_SECRET` as a Secret for Production (and Preview/Development if desired).
3. Redeploy after changing the environment variable.
4. The frontend calls `/api/generate`, which is the Vercel serverless function in `api/generate.js`.

The Runway key is never exposed to the browser.

## Runway
The backend uses the official `@runwayml/sdk` and Gen-4.5 text/image-to-video API. Text-to-video supports landscape and portrait ratios; square is available when an input image is supplied.

## Important production work still needed
- Replace localStorage credits with a real database/ledger.
- Add authenticated users.
- Add secure Paystack initialize/verify endpoints and webhook handling.
- Add rate limiting and abuse prevention.
- Store generated video references in a database.
- Add referral anti-abuse checks.
