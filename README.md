AMOH JUSTICE AI VIDEO

This is the first deployable website build using the exact supplied AMOH JUSTICE logo.

Rules in this version:
- 6 sec = 10 app credits
- 10 sec = 15 app credits
- 100 starting credits in the browser demo
- Optional referral after 3 generated videos, reward 10 credits
- WhatsApp help +233 546 389 770
- Paystack-ready payment UI
- Netlify Function prepared for Runway AI

LIVE SETUP REQUIRED:
1. Deploy to Netlify.
2. Set RUNWAYML_API_SECRET in Netlify environment variables.
3. For production, replace browser localStorage credits with a real database/server ledger.
4. Add a server-side Paystack initialize + webhook/verification flow before granting purchased credits.
5. Add anti-abuse controls for free/referral credits.

Never put secret keys in index.html or browser JavaScript.
