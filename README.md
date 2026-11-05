# Naija Sportsbook — Back office

The admin dashboard for the [Naija Sportsbook API](https://github.com/shem4soul/Node-Bet-casino-sportsbook). Deploy it separately from the player website, ideally on its own subdomain such as `admin.yourdomain.com`.

Built with **Next.js 16**, **TypeScript**, **Tailwind CSS 4** and **TanStack Query**.

## Features

| Section | What you can do |
| --- | --- |
| Dashboard | 30-day GGR, deposits, open liability, customer balances; queues for matches awaiting results and withdrawals awaiting review; latest bets |
| Events & results | Filter fixtures (league, status, needs result); create fixtures with a market builder; edit, feature, postpone or reschedule; **record the final score** (with optional half-time) and see the settlement summary, including markets that need manual settlement; cancel or abandon (voids and refunds) |
| Markets & odds | Per market: suspend, reopen, add selections, edit prices inline, activate or deactivate selections, **manual settlement** (single winner, per-selection won/lost/void, or void the market) |
| Leagues & odds feed | Create and edit leagues, featured/visible/sort order, browse odds-api.io provider leagues to set `providerSlug`, enable sync, run a sync per league or all at once |
| Liability | Open exposure per selection (singles exact, accumulators as an upper bound), also shown on each event |
| Bets | Search by status, user or event |
| Users | Search by name/email/phone, status and KYC filters; detail page with lifetime stats; change status (with reason), set KYC, credit or debit the balance (audited) |
| Withdrawals | Review queue: approve (sends a Paystack transfer) or reject with a reason (refunds); view Paystack responses |
| Reports | GGR, margin, payments and player activity for today, 7/30/90 days or a custom range |
| Audit log | Every privileged action with actor, entity, IP and metadata |

Only accounts with the `admin` role can sign in. Player accounts are rejected and their session is revoked straight away.

## Quick start

```bash
npm install
cp .env.example .env.local     # set NEXT_PUBLIC_API_URL
npm run dev                    # http://localhost:3001
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | API base URL including `/api/v1` |

Create the first admin with the API's seed (`ADMIN_EMAIL` / `ADMIN_PASSWORD`, at least 12 characters). Then remove those variables from the API environment.

Add this site's origin to the API's `CORS_ORIGINS`.

## Deploy

**Vercel:** import the repo, set `NEXT_PUBLIC_API_URL`, and deploy.

**Docker:**

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1 -t naija-bet-admin .
docker run -p 3001:3001 naija-bet-admin
```

### Hardening the back office

* Put it on its own subdomain and, if you can, restrict access by IP or put it behind your VPN, Cloudflare Access or similar.
* Pages send `noindex` headers, and `robots.txt` disallows everything.
* Settlement and payouts move real money. The UI asks for confirmation before recording results, settling markets, approving withdrawals and adjusting balances, and the API audits every action.
* "Awaiting results" lists matches the API marks as live, and the API's background worker does that at kick-off. Make sure the worker is running (`npm run start:worker`, or `RUN_JOBS_IN_API=true`).

## Scripts

`npm run dev` (port 3001) · `npm run build` · `npm start` · `npm run lint`

## Author

Emmanuel Seun Shittu · [@shem4soul](https://github.com/shem4soul) · shem4soul@gmail.com
