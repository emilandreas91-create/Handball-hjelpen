# Todo – Handball-hjelpen

---

## ✅ Fullført

- [x] Egendefinerte statistikknapper med redigerbare navn
- [x] Mål-visualisering og redning-visualisering
- [x] Lagsiden – registrer lag knyttet til bruker
- [x] Lagre kamp – vises på lagsiden per lag
- [x] Håndballbane-kart for skuddposisjoner
- [x] Klikk inn på lag → statistikk og kamphistorikk
- [x] Terminliste-import fra handball.no

---

## 🔴 Feil – fikses nå

- [x] **Norske tegn vises feil i appen** – `på`, `nå`, `å` vises som `pÃ¥`, `nÃ¥` osv.
  - Søk etter `Ã` i hele prosjektet. Sørg for at editor lagrer filer som UTF-8.

- [x] **"Sist brukte lag" på forsiden fungerer aldri**
  - Koden sammenligner lag-ID mot lagnavn – disse matcher aldri.
  - `pages/Start.tsx` linje ~263: sammenlign mot `team.id`, ikke `team.name`.

- [x] **Hendelser kan få feil tidsstempel ved raske dobbelttrykk**
  - `appendHistory` i `hooks/useMatch.ts` leser `period` og `matchTime` fra en utdatert closure.
  - Bruk refs for disse verdiene i stedet.

---

## 🟡 Teknisk gjeld – prioritert rekkefølge

*Rask (under én time):*
- [x] Fjern dead code i `Tactics.tsx` – `legacyRemoteStatusTitle` og `legacyRemoteStatusText` beregnes og kastes med `void`
- [x] Slå sammen dobbel `import` fra lucide-react i `TeamDetails.tsx`
- [x] Flytt Firebase API-konfigurasjon til `.env`-fil (god vane, ikke sikkerhetsproblem)

*Middels (noen timer):*
- [ ] Flytt Firebase-kall ut av `Start.tsx` og `TeamDetails.tsx` og inn i egne hooks
- [ ] Optimaliser `useTeamMatches` – henter alle kamper og filtrerer lokalt; bruk Firestore-query i stedet

*Stor (planlegg separat):*
- [ ] Del opp `Stats.tsx` – filen er for stor, gjør for mye, og er vanskelig å endre trygt
  - Flytt sky-synklogikk ut i en hook
  - Del UI i separate komponenter for oppsett, scoretavle og lagring

---

## 🎯 Produktforbedringer – prioritert etter verdi

**1. Halvtidsoversikt** *(middels – høy verdi)*
Dedikert skjerm optimalisert for 15-minutterspraten. Store tall, ingenting unødvendig.
Vise: score, skuddeffektivitet, redningsprosent, tekniske feil, scoringsutvikling per omgang.
Åpnes med ett trykk fra kampvisningen. All data finnes allerede.

**2. Tidslinje for kamphendelser** *(liten – høy verdi)*
Hendelser plottet mot kampklokken. Viser hvilke perioder som var gode og dårlige.
Data finnes allerede i `history`-arrayen – dette er primært et visualiseringsproblem.

**3. Sesongoversikt per lag** *(middels – høy verdi)*
Trendvisning over alle kampene til et lag: effektivitet, tekniske feil, resultatutvikling.
Grunnlaget finnes i `useTeamMatches` – trenger grafer og aggregering.

**4. Heatmap-analyse** *(liten – middels verdi)*
Skuddfrekvens og redningsprosent per sone, visualisert over bane og mål.
Data finnes allerede – gjenbruk `GoalVisualizer` med heatmap-modus.

**5. Kampforberedelse** *(liten – middels verdi)*
Knytt en taktikk og korte stikkord til en planlagt kamp.
Vises frem når kampen åpnes i live-visningen.

**6. Eksport av kamprapport** *(middels – middels verdi)*
Enkel tekstbasert oppsummering eller PDF av en lagret kamp.
Nyttig for å dele med spillere og assistenter.

---

## 📋 Fremtid – vurder nøye før du starter

- [ ] **Spillerregistrering** *(stor – usikker verdi)*
  Knytt hendelser til spillernummer. Krever at hele hendelsesmodellen skrives om og at live-registreringen ikke bremses. Ikke start på dette før kjernen er stabil.

- [ ] **Motstanderanalyse** *(stor – lav verdi nå)*
  Statistikk på tvers av kamper mot samme motstander. Krever et annet datagrunnlag enn det som finnes i dag. Utsett.

- [ ] **Kamppåminnelser / notifikasjoner** *(stor – lav prioritet)*
  Krever PWA-oppsett og push-infrastruktur. Gjør dette sist.
