## Ziel

Eine schnelle, hübsche Suchmaschine für Amazon Warehousedeals (Start: amazon.de / Elektronik). Maximale Conversion: **jeder Klick im Listing → Amazon mit Affiliate-Tag**. Preishistorie & Preiswecker als Modals.

---

## Datenquellen (final)

**Discovery: Keepa Seller Query** — `/seller?seller=A2L77EE7U53NWQ&domain=3` liefert die komplette ASIN-Liste Amazon Warehouse DE. Täglich gegen DB diffen.

**Anreicherung & Preise: Keepa Product Endpoint** — pro ASIN: Titel, Bild, Kategorie, EAN, UVP/NEW, Warehouse-Preis (csv[5]), Zustand, History.

**Live-Aktualität: Keepa Price-Tracking Webhook** — Push bei Preisänderung für getrackte Produkte.

---

## Auth & Preisalarm-Strategie

**Login (optional, nur für Watchlist & Verwaltung)**
- **Google** via Lovable-Broker (`lovable.auth.signInWithOAuth("google")`)
- **Apple** via Lovable-Broker (`signInWithOAuth("apple")`) — wird gleichzeitig via `supabase--configure_social_auth` aktiviert
- Kein Email/Passwort, kein Magic Link nötig

**Preisalarm — Zwei-Wege-System**
1. **Ohne Login (Default-Flow im Modal)**: Email + Ziel-Preis eingeben → Eintrag in `email_watches` mit Bestätigungs-Token → Double-Opt-In-Mail mit Confirm- und Unsubscribe-Link → erst nach Klick aktiv. Jede Alarm-Mail enthält Unsubscribe-Link (one-click via Token).
2. **Mit Login**: Alarm landet in `watches` (an `user_id` gebunden), verwaltbar auf `/watchlist`. Kein Double-Opt-In nötig (Email kommt verifiziert vom OAuth-Provider).

Im Modal: prominenter Email-Input + „Mit Google/Apple anmelden" als Sekundär-Option („…und Wecker auf /watchlist verwalten").

---

## Frontend (Direction: Tech Editorial, dark/zinc/emerald)

### Listing-Seite
- Sticky Filter-Header: Kategorie, Zustand, Mindest-Rabatt %, Preis-Range, Suche
- Sortierung: Rabatt %, Neueste, Preis, Beliebtheit
- **Karten sind komplett ein `<a>` zu Amazon** (Bild, Titel, Preis, Badge) — Affiliate-Deeplink direkt, Klick-Beacon via `sendBeacon`, kein Redirect-Hop
- Zwei dezente Icons oben rechts (`e.preventDefault()`):
  - 📈 Preisverlauf-Modal
  - 🔔 Preiswecker-Modal

### Modals
- **Preishistorie**: Recharts 30/90/365 Tage, min/max/avg, Primary-CTA „Auf Amazon ansehen"
- **Preiswecker**:
  - Ziel-Preis Slider/Input
  - Email-Input (vorausgefüllt wenn eingeloggt)
  - Submit → bei Gast: „Bestätigungsmail gesendet", bei Login: „Wecker aktiv"
  - Secondary: „Mit Google / Apple anmelden – Wecker auf /watchlist verwalten"

### Header
- Logo, Login-Button (öffnet Sheet mit Google/Apple), bei Login: Watchlist + Avatar

### Routen
```
/                          Listing (Filter via Search-Params, SSR)
/kategorie/$slug           Kategorie-Listing
/watchlist                 _authenticated
/auth                      Google/Apple Login (integration-managed)
/email-watches/confirm     Double-Opt-In Bestätigung (public)
/email-watches/unsubscribe Token-basiertes Abbestellen (public)
/api/public/click          Klick-Beacon
/api/public/keepa-webhook  Keepa Price-Change Push
```

---

## Datenmodell

```text
sources           id, slug, seller_id, domain_id, affiliate_tag
categories        id, source_id, external_id, slug, name, parent_id
products          id, source_id, external_id (ASIN), title, brand, image_url,
                  category_id, ean, msrp_cents, currency, first_seen_at,
                  last_seen_at, is_active
offers            id, product_id, condition, price_cents, new_price_cents,
                  discount_pct, in_stock, fetched_at
price_history     product_id, condition, price_cents, observed_at
watches           id, user_id, product_id, target_price_cents, condition,
                  active, created_at                  -- eingeloggte User
email_watches     id, email, product_id, target_price_cents, condition,
                  confirm_token, unsubscribe_token, confirmed_at, active,
                  created_at                          -- Gast-Wecker (Double-Opt-In)
alert_events      id, watch_id|email_watch_id, triggered_price_cents,
                  sent_at, channel
suppressed_emails (vom Email-Infra-Setup)
refresh_jobs      id, tier, product_id, scheduled_for, last_run_at
clicks            id, product_id, user_id (nullable), referrer, ts
user_roles        (user_id, role) — separate Tabelle, has_role()
```

RLS:
- `products`, `offers`, `categories`, `price_history`: `TO anon SELECT`
- `watches`: scoped `auth.uid()`
- `email_watches`: kein direkter Client-Access, nur Server-Functions mit Token-Validierung
- `clicks`: INSERT für anon, kein SELECT

---

## Backend (Tech-Sektion)

**Server Functions** (`src/lib/api/*.functions.ts`)
- `listDeals({ filters, sort, page })` — public
- `getPriceHistory(productId, range)` — public
- `createEmailWatch({ email, productId, targetPrice, condition })` — public, sendet Double-Opt-In-Mail
- `confirmEmailWatch({ token })` — public
- `unsubscribeEmailWatch({ token })` — public
- `createWatch / deleteWatch / listWatches` — `requireSupabaseAuth`
- `buildDeeplink(asin)` — Affiliate-Tag anhängen

**Server Routes** (`src/routes/api/public/*`)
- `POST /api/public/click` — Beacon
- `POST /api/public/keepa-webhook` — HMAC, Update offers/history, Alert-Check
- Cron via pg_cron: discovery (täglich), refresh-tier-a (täglich), refresh-tier-b (15 min)

**Alert-Flow**
- Keepa-Webhook → Preis-Diff → Match gegen `watches` UND `email_watches.confirmed_at IS NOT NULL`
- Alarm via Lovable App-Emails (React-Email-Template, Queue)
- Anti-Spam: max 1 Mail / Watch / 24h
- Jede Mail mit Unsubscribe-Link (Token)

**Auth-Setup**
- Google + Apple via `supabase--configure_social_auth`
- Login-Sheet mit `lovable.auth.signInWithOAuth("google" | "apple")`
- Email-Domain via Lovable Emails (für Alarm- und Bestätigungsmails)

---

## Build-Phasen

**Phase 1 — Frontend mit Mock-Daten (jetzt)**
- Tokens (zinc/emerald, Instrument Serif + Inter + JetBrains Mono)
- Listing, Filter, Cards, beide Modals, Login-Sheet (Stub)
- Mock-Daten für 15 Geräte
- Klick-Tracking als No-Op-Stub
- **Kein Backend nötig** — Look & Feel sofort prüfbar

**Phase 2 — Lovable Cloud + Auth (Google + Apple)**
- Schema + RLS
- Google/Apple via Broker konfigurieren
- `_authenticated/route.tsx` (integration-managed)
- Watchlist persistiert

**Phase 3 — Keepa-Integration**
- `KEEPA_API_KEY` Secret
- Seller-Query-Discovery-Job
- Product-Fetch-Mapper, erstes Befüllen

**Phase 4 — Freshness & Webhook**
- pg_cron Tier A/B
- Keepa-Webhook-Route mit Signaturprüfung

**Phase 5 — Email-Infra + Preisalarm (Gast & User)**
- Lovable Email-Domain Setup
- Templates: Double-Opt-In, Preisalarm, Unsubscribe-Page
- `email_watches`-Flow inkl. Confirm/Unsubscribe-Routen
- Alarm-Trigger im Webhook

**Phase 6 — i18n, Legal, Admin**

---

## Phase 1 — konkrete Files

- `src/styles.css` — Tokens
- `src/lib/mock-deals.ts` — 15 Deals
- `src/lib/affiliate.ts` — `buildDeeplink(asin)`
- `src/components/DealCard.tsx` — gesamte Karte als `<a>`
- `src/components/ConditionBadge.tsx`, `DiscountBadge.tsx`, `PriceSparkline.tsx`
- `src/components/FilterBar.tsx`
- `src/components/PriceHistoryModal.tsx` — Recharts
- `src/components/PriceAlertModal.tsx` — Email-Input + Ziel-Preis + Google/Apple-CTAs
- `src/components/LoginSheet.tsx` — Google + Apple Buttons (Stub bis Phase 2)
- `src/components/Header.tsx`
- `src/routes/index.tsx`, `src/routes/__root.tsx`

Dependencies: `recharts`, `framer-motion`

---

## Offene Punkte (bewusst später)

- Affiliate-Tag-Secret: kommt von dir in Phase 3
- Email-Domain: setzt du in Phase 5 auf
- Apple Developer Account (für Apple Sign-In): brauchst du in Phase 2, ich erinnere dich dann
