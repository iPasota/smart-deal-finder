
# whdfinder — DE-Start mit Multi-Country & Multi-Shop-Architektur

Wir launchen **nur DE sichtbar**, bauen die darunterliegenden Strukturen aber so, dass weitere Länder (FR/IT/UK) und weitere Refurbished-Shops (Backmarket, Rebuy, Refurbed, …) später ohne Refactor angedockt werden können.

---

## 1. Was der Nutzer am Ende sieht (MVP, nur DE)

- Startseite unter `/` zeigt **deutsche Amazon-WHD-Deals** (wie heute).
- Neue **Shop-Filter-Chips** in der Filterbar: aktuell nur `[🟠 Amazon Warehouse ✓]` aktiv, weitere Shops als „demnächst" disabled (oder erst sichtbar, wenn Feeds da sind).
- Jede Deal-Karte trägt ein **Shop-Badge** (oben links neben dem Zustand), damit das Konzept „mehrere Quellen" ab Tag 1 sichtbar ist.
- Wenn dasselbe Produkt (gleiche EAN/GTIN/MPN-Match) in **weiteren Shops** verfügbar ist: kleine Zeile unter dem Preis — z. B.

  ```
  Auch bei: Rebuy 289 € · Backmarket 305 € · Refurbed 312 €
  ```

  Die 3 günstigsten Alternativen, jeweils klickbar (Affiliate-Linkout).
- Country-Switcher im Header zeigt nur 🇩🇪 DE (andere disabled, „kommt bald"), URL bleibt `/`.

---

## 2. Architektur — was wir jetzt schon mitbauen

### 2.1 Routing (vorbereitet, nicht aktiv genutzt)

```
src/routes/
  index.tsx               → /  (DE-Default, MVP-Listing)
  $country/index.tsx      → /de, /fr, /it, /uk  (Gate: nur 'de' rendert, Rest → 404 oder Coming-Soon)
  $country/produkt/$slug.tsx  (später)
```

Damit ist die Routenform schon richtig — beim FR/IT/UK-Launch nur Gate öffnen, kein Refactor.

### 2.2 Datenmodell (Lovable Cloud / DB)

Wir trennen sauber zwischen **Produkt** (gleich über alle Shops) und **Angebot** (shop- & landesspezifisch).

```
products             — kanonisch, 1× pro Produkt
  id, gtin (EAN/UPC), mpn, brand, title, category, image_url

offers               — pro shop × country × condition
  id, product_id (FK), shop_id (FK), country_code ('DE'|'FR'|'IT'|'UK'),
  external_id (z. B. ASIN bei Amazon, SKU bei anderen),
  condition, price_cents, currency ('EUR'|'GBP'),
  list_price_cents, in_stock, ships_to (text[]),
  deeplink_template, affiliate_tag_override,
  first_seen_at, last_seen_at

shops                — Stammdaten
  id, slug ('amazon-warehouse'|'backmarket'|'rebuy'|'refurbed'),
  display_name, logo_url, color, link_rel ('sponsored nofollow'),
  active boolean

price_history        — pro offer_id, täglich
  offer_id, price_cents, observed_at

affiliate_tags       — pro shop × country
  shop_id, country_code, tag, deeplink_pattern
  (DE startet mit shop='amazon-warehouse', country='DE', tag='whdfinder-21')
```

**Matching-Logik (Produkt ↔ mehrere Shops):**
1. Primär: GTIN/EAN-Match (zuverlässig).
2. Fallback: `brand + normalized(mpn)`.
3. Letzter Fallback: Fuzzy-Match auf normalisiertem Titel + Brand (manuell bestätigbar).

Wenn ein Produkt nur in einem Shop existiert → normale Karte, kein „Auch bei"-Teaser. Wenn ≥ 2 → Teaser mit den günstigsten 3 Alternativen (sortiert nach Preis pro vergleichbarem Zustand).

### 2.3 Frontend-Abstraktion

- `src/lib/marketplace.ts` — Country/Currency/Tag-Auflösung, kapselt Amazon-Spezifika.
- `src/lib/shops.ts` — Shop-Registry (slug → name/logo/linkRel/deeplinkBuilder).
- `src/lib/affiliate.ts` (bereits da) erweitern: `buildDeeplink(offer)` statt nur `(asin)`.
- `DealCard` bekommt:
  - `ShopBadge` (oben links)
  - `AlsoAvailableAt` (unter Preisblock, max. 3, nur wenn vorhanden)
- `FilterBar` bekommt `shops: ShopSlug[]`-Filter (initial nur Amazon aktivierbar).

### 2.4 Feeds für weitere Shops (Vorbereitung, kein Bau jetzt)

- Geplant: täglicher Cron-Job (TanStack Server Route unter `/api/public/hooks/ingest-feed`), der pro Shop einen Feed (CSV/XML/JSON via Awin, Tradedoubler, Daisycon o. ä.) lädt und in `offers` upsertet.
- Schnittstelle pro Shop = `FeedAdapter` (`fetch() → normalize() → upsert()`), sodass neue Shops nur einen Adapter brauchen.
- Im MVP **nicht aktiv** — wir bauen nur die Tabellen + Registry, kein Ingest-Job.

---

## 3. Was wir in diesem Schritt bauen

1. **DB-Migration** (Lovable Cloud): `shops`, `products`, `offers`, `price_history`, `affiliate_tags` inkl. GRANTs + RLS (öffentlich lesbar, schreibend nur service_role).
2. **Seed**: `shops` mit `amazon-warehouse` aktiv; `backmarket`, `rebuy`, `refurbed` als `active=false` (Platzhalter); `affiliate_tags` mit DE/Amazon = `whdfinder-21`.
3. **Mock-Adapter**: bestehende `MOCK_DEALS` werden auf die neue Form (`product + offer`) gemappt; zusätzlich für ~30 % der Produkte 1–3 **synthetische Alternativangebote** in den anderen Shops, damit der „Auch bei"-Teaser sofort sichtbar ist.
4. **Frontend**:
   - `ShopBadge`-Komponente
   - `AlsoAvailableAt`-Teaser auf `DealCard`
   - Shop-Filter-Chips in `FilterBar` (Amazon aktiv, Rest disabled mit Tooltip „kommt bald")
   - Country-Switcher im `Header` (DE aktiv, FR/IT/UK disabled)
5. **Routing-Skelett**: `/$country/*` angelegt, intern nur `de` zugelassen, `/` rendert weiter den DE-Index.

Was wir **bewusst noch nicht** bauen: echter Amazon-PA-API-Ingest, echte Feed-Ingestion, Cross-Border-Filter, Preisverlauf-Persistenz (bleibt Mock).

---

## 4. Technische Details (für später)

- Preisanzeige der Alternativen: **Originalwährung**, keine Umrechnung (so vereinbart).
- Linkout: `rel="sponsored nofollow noopener"` für alle Affiliate-Links; pro Shop konfigurierbar.
- Versandfähigkeit: `offers.ships_to` als Array von Ländercodes; Filter „nur in mein Land lieferbar" greift hierauf, sobald Cross-Border-Toggle live geht.
- ASIN-Feld lebt nicht mehr direkt auf der Karte, sondern als `offers.external_id` bei `shop=amazon-warehouse`. Suche nach ASIN bleibt möglich.
- SEO: `/` behält Canonical `/`, später `/de` als Canonical und `/` als Redirect auf `/de` — heute noch nicht.

---

## 5. Offene Frage vor dem Start

Soll ich die Mock-Alternativangebote bei **allen** passenden Karten zeigen oder nur bei **einer bewussten Auswahl** (~30 %), damit man das Feature realistisch sieht, aber das Listing nicht überfrachtet wirkt?

Wenn alles passt: bestätige kurz, dann lege ich mit der DB-Migration los.
