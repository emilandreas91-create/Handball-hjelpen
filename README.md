# Handball-hjelpen

Handball-hjelpen er en webapp for trenere som vil føre kampstatistikk live og samle kampdata på lagnivå uten å bytte mellom flere verktøy. Målet er å gi en rask flyt på benken under kamp og en enkel oversikt når laget skal evalueres i pausen eller etter kamp.

## Produktet i korte trekk

- Registrer kampstatistikk live fra mobil eller nettbrett.
- Lagre kamper per bruker og følg utvikling på tvers av lag.
- Få en enkel lagoversikt med siste kamp, trender og kamphistorikk.

## Viktige sider

- `/`: landingsside som forklarer produktet og leder brukeren videre
- `/login`: innlogging med e-post/passord eller Google
- `/stats`: live registrering av kampstatistikk
- `/teams`: oversikt over lag brukeren følger
- `/teams/:teamId`: lagdetaljer med kampoversikt og enkle analyser

## Teknologi

- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router
- Firebase Auth + Firestore

## Kom i gang

```bash
npm install
npm run dev
```

Bygg produksjonsversjon:

```bash
npm run build
```

## Struktur

- `src/components/`: layout, autentisering og domenekomponenter
- `src/hooks/`: datatilgang og match-state
- `src/pages/`: rutebaserte sider
- `src/lib/firebase.ts`: Firebase-oppsett

## Fokus for videre arbeid

- videreføre mer kampdata inn i laganalysen
- utvide pauserapporter og tidslinjevisning
- styrke validering rundt lag- og kampnavn
