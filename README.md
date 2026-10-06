# TourMatch

An AI-driven React Native (Expo) app for finding local tours and guides. Describe the trip in plain language
("private Vatican tour with a licensed guide for 4, one uses a wheelchair"). Claude turns that into structured
filters, the server searches the tour providers that have APIs, and Claude ranks the results and explains each match.

```
app/     Expo SDK 57 + Expo Router (iOS, Android, web)
server/  Node + Hono. Holds all API keys, calls Claude, fans out to providers
```

## Run it

```sh
# 1. Server
cd server
cp .env.example .env        # add keys; everything is optional
npm install
npm run dev                 # http://localhost:8787

# 2. App (in another terminal)
cd app
npm install
npx expo start              # press i / a / w, or scan the QR with Expo Go
```

The app finds the server on your machine's LAN IP automatically in development. For production, set
`EXPO_PUBLIC_API_URL`.

With no keys at all, the server still runs. It uses keyword matching instead of Claude, and a clearly labelled sample catalog
(Rome, Lisbon, Tokyo, Paris, Mexico City, London, Barcelona, Kyoto).

## Static web preview

`index.html` at the repo root, plus `web/`, is a no-build, no-server version of the app for sharing the design. Drop the
repo on any static host (GitHub Pages, Netlify, Cloudflare Pages) or run `python3 -m http.server` and open it.

- Every screen is there: Explore, search, results, tour detail, Saved, More, partner toolkit and console, advertise,
  Ads Manager (sign up, create/launch/pause/end ads, billing, account), terms and support.
- Search runs in the browser with keyword rules over the sample catalog (`web/js/engine.js`). There's no Claude call.
- Accounts, ads, saved tours and support tickets live in `localStorage`. Partner test requests are simulated, and in-review
  ads have "Approve / Reject" buttons so you can play the reviewer.
- Routes are hash-based (`#/partners`, `#/advertise`), so links work without server rewrites.
- `web/data.js` and `web/terms.js` copy the catalog, partner spec and terms. Regenerate or edit them when the app's
  versions change.

## Providers

| Provider | Integration | What you need |
|---|---|---|
| **GuruWalk** | Live search via their [affiliate MCP server](https://github.com/guruwalk/affiliates-mcp) | Affiliate API key → `GURUWALK_API_KEY` |
| **Viator** | Live search via [Partner API v2](https://docs.viator.com/partner-api/affiliate/technical/) (Basic access) | Affiliate key → `VIATOR_API_KEY` |
| **ToursByLocals** | Deep link to their search | None. Swap in affiliate links once approved |
| **Withlocals** | Deep link to their search | None. Has a [partner program](https://www.withlocals.com/info/partners/) |
| **Showaround** | Deep link to their search | None |

ToursByLocals, Withlocals and Showaround don't publish a search API, so the app opens a pre-filled search on their
site instead. I couldn't find any developer API for Tourist New App, Kokart or VibeGuide. Add them as link providers in
`server/src/providers/links.ts` if you have URLs, or as `ApiProvider`s if you get partner access.

To add a provider, implement `ApiProvider` (`server/src/providers/types.ts`), normalize its results to `Tour`, and
add it to `apiProviders` in `server/src/index.ts`.

## "Licensed" guides

None of these APIs has a "licensed guide" field. `Tour.licensedGuide` is `true`/`false` only when a source says so,
and `null` (unknown) otherwise. When a user asks for licensed guides, tours marked `false` are dropped. Unknown ones are
kept, and the detail screen tells the user to check with the provider. Claude is told never to claim a license
that the data doesn't show.

## AI

`server/src/ai.ts` makes two calls to `claude-opus-5` (override with `CLAUDE_MODEL`). Both use structured outputs
with Zod schemas and low effort:

1. **parseIntent**: prompt → `SearchIntent` (destination, dates, group size, budget, style, languages, accessibility…).
   If the destination is missing, it returns a follow-up question, which the app shows.
2. **rankTours**: scores each result from 0 to 100 and writes a one-line "why it's a match".

Server-side refusal fallbacks (`fallbacks: "default"`) are enabled.

## For business

Two areas in the app, linked from the bottom of **Explore** and from the **Sources** tab. Both work on web too, e.g. `/partners`
and `/advertise`, so you can share them with businesses as plain URLs.

### Tour companies: Partner toolkit (`/partners`, `/partners/console`)

Any tour company can plug its own booking system into TourMatch by building **one HTTPS endpoint**:

1. TourMatch parses a traveller's request into a `SearchIntent` (destination, dates, group size, budget, style,
   licensing, languages, accessibility).
2. We `POST` it to the partner's endpoint, signed with HMAC-SHA256 (`X-TourMatch-Signature` over `timestamp.rawBody`).
3. They reply `{ tours: [...] }`. We validate it against the schema, rank it with everything else, and send travellers to
   their `bookingUrl`.

The toolkit page renders the live spec from `GET /partners/spec` (headers, request/response examples, field table, JSON
Schema), with Node, Python and curl samples. In the **console**, partners register to get a partner ID and secret, and
**send test requests** that report HTTP status, latency, schema errors and the parsed tours.

A working reference endpoint lives at `server/examples/partner-endpoint.ts`:

```sh
TOURMATCH_SECRET=tmsk_... npm run example:partner   # http://localhost:8790/tourmatch/search
```

New partners start as **pending**. They're only included in traveller searches once an admin approves them.

**Safety:** partner URLs come from the public, so outbound calls are guarded against SSRF (https only, no
private/loopback/link-local IPs, including via DNS; no redirects; 5 s timeout; 2 MB cap). Set
`ALLOW_LOCAL_PARTNER_URLS=true` only in development to test against `localhost`.

### Advertisers: self-serve Ads Manager (`/advertise`, `/advertiser/*`)

Advertisers create an account (email + password, accepting the Advertiser Terms), then manage everything in
**Ads Manager**:

- **Create ads** with a live preview: headline, description, button, landing page, image, **category**
  (attractions, tours, food & drink, transport, accommodation, events, shopping, services), destination and interest
  targeting, and optional start/end dates.
- **Launch & pay**: set a prepaid budget. It's charged to the card on file and each click deducts the CPC
  (`AD_CPC_CENTS`, default $0.60). Minimum budget $20.
- **Lifecycle**: `draft → in review → live ⇄ paused → ended`. Editing a live or paused ad's creative sends it back to
  review. Rejected ads are refunded and can be edited and resubmitted. Ending early refunds unspent budget.
- **Past ads**: grouped by outcome (Completed, Budget spent, Stopped early, Rejected) and filterable by category.
  **Re-enable** tops up the budget. If that exact creative was approved before, it goes live immediately without
  another review.
- **Billing**: card on file, plus charge and refund history. **Account**: business details, password change (signs out
  other sessions), sign out.

**Payments** use Stripe. Card numbers never touch the app or server: iOS/Android use Stripe's native `CardField`,
and web uses Stripe Elements. The card is saved with a SetupIntent, and budgets are charged off-session with a
PaymentIntent. Without `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` the server runs in **test mode**: ads launch
without charging, and charges are recorded as "not billed". To test real card flows, add Stripe *test* keys and use
card `4242 4242 4242 4242`.

Passwords are hashed with scrypt. Session tokens are stored hashed on the server, and in the Keychain/Keystore on
devices (localStorage on web).

A "talk to sales" inquiry form remains on `/advertise` for larger campaigns.

## Terms of service & support

- **Terms** (`/legal/traveler`, `/legal/advertiser`, `/legal/partner`): a document for each audience in
  `app/src/legal/terms.ts`. Advertisers and partners must accept theirs to sign up, and the accepted version is
  stored on the account. **These are drafts:** have counsel review them, fill in the `[bracketed]` placeholders, then set
  `LEGAL_REVIEWED = true` to remove the "pending legal review" banner. When you change a document, bump its version in
  both `app/src/legal/terms.ts` and `server/src/legal.ts`.
- **Support** (`/support/traveler|advertiser|partner`): a form with topics per audience, prefilled for signed-in
  advertisers. It returns a ticket ID like `SR-4F2A91`. Requests are stored in `server/data/support-requests.json` and
  logged to the console. **Email notification isn't wired up yet.**

Links to both are in the **More** tab, on the Ads Manager and toolkit pages, and at signup.

### Admin API

Enabled when `ADMIN_TOKEN` is set. Send `Authorization: Bearer $ADMIN_TOKEN`.

```sh
# Partners
curl localhost:8787/admin/partners -H "Authorization: Bearer $ADMIN_TOKEN"
curl -X POST localhost:8787/admin/partners/p_123/status -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'content-type: application/json' -d '{"status":"approved"}'       # or pending | suspended

# Ad review queue, then approve or reject (rejection refunds unspent budget)
curl "localhost:8787/admin/campaigns?status=in_review" -H "Authorization: Bearer $ADMIN_TOKEN"
curl -X POST localhost:8787/admin/campaigns/c_123/review -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'content-type: application/json' -d '{"approve":true}'
curl -X POST localhost:8787/admin/campaigns/c_123/review -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'content-type: application/json' -d '{"approve":false,"reason":"Unverifiable claim in headline."}'

# Unbilled house ads
curl -X POST localhost:8787/admin/campaigns -H "Authorization: Bearer $ADMIN_TOKEN" -H 'content-type: application/json' \
  -d '{"advertiser":"TourMatch","headline":"List your tours","url":"https://example.com"}'

# Sales inquiries and support tickets
curl localhost:8787/admin/inquiries -H "Authorization: Bearer $ADMIN_TOKEN"
curl "localhost:8787/admin/support?audience=advertiser" -H "Authorization: Bearer $ADMIN_TOKEN"
curl -X POST localhost:8787/admin/support/SR-4F2A91/status -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'content-type: application/json' -d '{"status":"closed"}'
```

Accounts, sessions, charges, partners, campaigns, inquiries and support requests are stored as JSON files in `server/data/` (gitignored). That's fine for one instance;
move to a database before running more than one server.
