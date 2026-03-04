# Handball-hjelpen (Håndball Statistikk App)

## Utvikler & Modell Kontekst
Dette prosjektet er en webapplikasjon utviklet for å registrere, overvåke og analysere statistikk i håndballkamper. Den retter seg mot trenere eller støtteapparat som trenger et raskt verktøy på benken for å føre statistikk underveis i kamper.

For å hjelpe en LLM (som Gemini, Claude eller ChatGPT) med å forstå prosjektet, her er hovedkomponentene og arkitekturen:

### Teknologistakk
- **Frontend Framework:** React (med TypeScript)
- **Byggeverktøy:** Vite
- **Styling:** Tailwind CSS (bruker `clsx` for dynamiske klasser)
- **Ikoner:** `lucide-react`
- **Routing:** `react-router-dom` (HashRouter er brukt)
- **Backend/Database:** Firebase Firestore
- **Autentisering:** Firebase Auth (Støtter E-post/Passord og Google Login via signInWithPopup)

### Kjernestruktur (`src/`)
- `App.tsx`: Definerer routing med en `RequireAuth` komponent som beskytter private ruter.
- `components/features/AuthProvider.tsx`: Context provider som lytter på Firebase Auth state og gir `currentUser` til resten av applikasjonen.
- `lib/firebase.ts`: Initialisering av Firebase App, Auth og Firestore.

### Sider (`src/pages/`)
1. **Home (`/`)**: Landingsside.
2. **Login (`/login`)**: Innlogging og registrering, inkludert Google OAuth.
3. **Teams (`/teams`)**: En oversikt over brukerens registrerte lag. Brukeren kan opprette nye lag og slette eksisterende.
4. **TeamDetails (`/teams/:teamId`)**: Detaljside for et spesifikt lag. Viser en "hurtigmeny" som sammenligner snittet av tidligere kamper med den *siste* kampen. Viser også en liste over alle spilte kamper.
5. **Stats (`/stats`)**: Hoveddashboardet for live kampregistrering. 
   - Har en nedtelling/stoppeklokke.
   - Lar brukeren velge Hjemme- og Bortelag fra sine registrerte lag.
   - "Lagre"-knapp pusher hele kampobjektet til Firebase.

### Viktige Hooks (`src/hooks/`)
1. **`useAuth`**: Tilgang til innlogget bruker.
2. **`useTeams`**: Lytter sanntid (onSnapshot) på brukerens lag i Firestore (`users/{uid}/teams`).
3. **`useTeamMatches`**: Henter alle lagrede kamper hvor et spesifikt lag spilte (`users/{uid}/matches`).
4. **`useMatch`**: Den mest komplekse hook-en. Håndterer *live* state for en kamp:
   - Stoppeklokke og omganger.
   - HomeState og AwayState (inkluderer antall mål, skuddbom, tekniske feil, etc).
   - `saves`, `goalLocations` og `shotLocations`: Lister av xy-koordinater med id og count for visuell representasjon.
   - `undoLastStat`: Angrefunksjon som reverserer den siste handlingen (fjerner mål, teller ned xy-koordinater, etc).

### Visualiserings-komponenter
Ligger under `src/components/features/`:
- **`GoalVisualizer.tsx`**: Viser et håndballmål. Forelderen videresender en array med `{x, y, count}` objekter som plottes oppå målet. Brukes både for redninger (gult merke/Målvakt-view) og mål (grønt merke/Skytter-view). Trykk på komponenten regner ut %, og sender koordinatene tilbake til parent for å lagre formen.
- **`CourtVisualizer.tsx`**: Viser halve/hele banen med oppmerking (6m, 9m, 7m). Fungerer på samme måte; klikk på banen registrerer et skudd-koordinat plottet som blå prikker.

### Datastruktur i Firestore
```
/users/{UserUID}/
  /teams/
    {TeamDocumentID}: { name: "G14", createdAt: Timestamp }
  /matches/
    {MatchDocumentID}: {
        name: "G14 vs G15",
        date: Timestamp,
        homeTeam: "G14" (String name),
        awayTeam: "G15" (String name),
        homeScore: Number,
        awayScore: Number,
        period: String,
        detailedStats: {
             home: { goal: Number, miss: Number, tech: Number, [customName]: Number },
             away: { goal: Number, miss: Number, tech: Number, [customName]: Number }
        }
    }
```
*(Merk: Selve xy-koordinatene (`goalLocations`, `saves`, `shotLocations`) lagres foreløpig kun lokalt i useMatch mens kampen pågår, og er ikke nødvendigvis flyttet inn i Firebase enda om de ikke ligger i mappedCustomStats)*

### HVA VI JOBBER MED NÅ
- Vi jobber ut fra en lokal `todo.md` fil i prosjektroten.
- Nylige implementasjoner inkluderer `TeamDetails`-dashboard for å analysere form, samt visuelle skjema for skudd på mål (`GoalVisualizer`) og fra bane (`CourtVisualizer`).
