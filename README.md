# Vermogensplanner

Een moderne, responsive webapp om vermogensopbouw via **beleggen** en **sparen** op lange
termijn te simuleren – gemaakt voor persoonlijke financiële planning en
FIRE-scenario’s. Gebouwd met React, TypeScript, Vite en Recharts.
Alle berekeningen gebeuren in de browser; er is geen backend en er wordt niets verstuurd.

## Functies

- **Beleggen en sparen** – startinleg/startsaldo, maandelijkse inleg en onbeperkt veel
  eenmalige stortingen (datum, bedrag, omschrijving) voor beide modules in één tabel.
  Toont per module totale inleg, rendement/rente (€ en %), eindwaarde en reële eindwaarde.
- **Rendement & inflatie** – één generiek rendement, spaarrente en inflatie voor de hele
  app, met optionele afwijkende waarden per kalenderjaar.
- **Maandbudget** – één vrij besteedbaar maandbedrag dat via slider, percentage of
  snelkeuzes (80/20, 70/30, …) over beleggen en sparen wordt verdeeld. Alles herberekent
  direct. Uit te zetten voor handmatige invoer per module.
- **Indexatie** – laat de maandinleg jaarlijks meegroeien, gelijk aan de inflatie of met
  een eigen percentage.
- **Box 3-belasting** – forfaitair stelsel (2026, 2027) en werkelijk-rendementstelsel
  (beoogd vanaf 2028), met per periode aanpasbare grondslagwaarden: heffingsvrij
  vermogen/resultaat, forfaits, tarief en verliesdrempel. Optie voor fiscale partners en
  de tegenbewijsregeling. Overzicht van de belasting per jaar en het effect op het
  eindvermogen.
- **Dashboard** – belegd vermogen, spaarsaldo, totaal vermogen en koopkrachtgecorrigeerd
  vermogen, plus een interactieve grafiek (nominaal/reëel) van beleggingen, sparen,
  totaal vermogen en eigen inleg.
- **Scenariovergelijking** – conservatief, realistisch en optimistisch (aanpasbare
  afwijkingen) met staafdiagram en tabel van eindvermogen en reële waarde.
- **Financiële inzichten** – aandeel eigen inleg vs. rendement, inflatie-impact,
  effect van +10%/+25%/+50% maandinleg, FIRE-indicatie (4%-regel) en het kantelpunt
  waarop rendement de maandinleg overstijgt.
- Euro-notatie en Nederlandse locale, licht/donker/automatisch thema, voorbeelddata bij
  eerste start, invoer wordt lokaal (localStorage) onthouden.

## Installatie

Vereist: [Node.js](https://nodejs.org) 18 of nieuwer.

```bash
npm install
```

```bash
npm run dev
```

Open daarna de URL die Vite toont (standaard <http://localhost:5173>).

### Overige scripts

| Script | Doel |
|---|---|
| `npm run build` | Typecheck + productiebuild naar `dist/` |
| `npm run preview` | Productiebuild lokaal bekijken |
| `npm test` | Unit-tests van de rekenkern (Vitest) |
| `npm run typecheck` | Alleen TypeScript-controle |

De map `dist/` is een statische site en kan op elke webserver of statische host
(GitHub Pages, Netlify, …) worden gezet; paden zijn relatief.

### Online versie (GitHub Pages)

De workflow `.github/workflows/deploy.yml` test, bouwt en publiceert de app bij elke
push naar `main`. Eenmalig instellen: **Settings → Pages → Build and deployment →
Source: GitHub Actions**. De app staat daarna op
<https://sepph-sys.github.io/vermogensplanner/>.

## Gebruik

De app heeft vier tabbladen (ook direct te openen via `#dashboard`, `#inleg`,
`#rendement` en `#belasting` achter de URL):

**Dashboard**
1. Kies bovenaan de **analyseperiode** (start- en einddatum, of 10–40 jaar). Die geldt
   voor alle berekeningen.
2. Bekijk de kerncijfers, de grafiek (schakel tussen *Nominaal* en *Reëel*, hover voor
   details per maand), de resultaten per module en het box 3-overzicht.
3. Vergelijk **scenario’s** en pas onder “Scenario-aannames aanpassen” de afwijkingen aan.
4. Lees de **financiële inzichten**: herkomst van je vermogen, inflatie, FIRE en het
   effect van een hogere inleg.

**Inleg**
1. **Maandbudget**: vul je vrij besteedbare bedrag in en schuif de verdeling. Zet
   *Verdeel automatisch* uit om de maandinleg voor beleggen en sparen zelf in te vullen.
   Zet *Maandinleg jaarlijks indexeren* aan om de inleg elk jaar te verhogen: laat
   *Gelijk aan inflatie* aangevinkt, of vink het uit en vul een eigen percentage in.
2. **Eenmalige inleg**: bovenaan twee vaste regels voor de **startinleg beleggen** en het
   **startsaldo sparen** (op de startdatum). Daaronder extra stortingen (bonus, erfenis,
   vakantiegeld) voor beleggen én sparen; per regel kies je bestemming, datum, bedrag en
   omschrijving. Onderaan staat het totaal per bestemming. Stortingen buiten de looptijd
   worden rood gemarkeerd en niet meegeteld.

**Rendement & inflatie**
1. Bovenaan de **generieke** waarden: jaarrendement beleggen, spaarrente en inflatie. Deze
   gelden overal in de app (reële waarde, indexatie, box 3, scenario’s).
2. In de tabel **Waarden per jaar** vul je desgewenst per kalenderjaar een afwijkende
   waarde in. Een leeg veld betekent: generieke waarde. Met *Alle jaren looptijd* maak je
   in één keer een regel voor elk jaar van de looptijd.

**Belasting**
- Stel bij **Box 3-belasting** in of je alleenstaand bent of fiscale partners hebt. De
  grondslagwaarden staan in een tabel met één regel per periode (kolommen die niet bij het
  gekozen stelsel horen tonen ‘–’). Voeg een regel toe als de regels wijzigen.
  Een periode geldt vanaf haar jaar tot de volgende periode; jaren daarna gebruiken de
  laatste periode, met (optioneel) met inflatie geïndexeerde heffingsvrije bedragen.

Met **Voorbeelddata** (rechtsboven) zet je alles terug naar
het voorbeeld.

Getallen mogen in Nederlandse (`10.000`, `7,5`) of internationale notatie (`7.5`)
worden ingevoerd. Pijltje omhoog/omlaag verhoogt/verlaagt, met Shift in stappen van 10.

## Mappenstructuur

```
vermogensplanner/
├── index.html                 # HTML-shell (zet thema vóór eerste render)
├── docs/FORMULES.md           # Documentatie van alle financiële formules
├── public/favicon.svg
└── src/
    ├── main.tsx               # Entry point
    ├── App.tsx                # Layout, state en centrale berekening
    ├── styles.css             # Design tokens (licht/donker) en componentstijlen
    ├── lib/
    │   ├── finance.ts         # Rekenkern: maandsimulatie, rente, inflatie
    │   ├── finance.test.ts    # Tests (o.a. tegen gesloten annuïteitenformule)
    │   ├── box3.ts            # Box 3: perioden, forfaitair en werkelijk rendement
    │   ├── box3.test.ts       # Tests van de box 3-berekening
    │   ├── model.ts           # State-types, voorbeelddata, beleggen+sparen-model
    │   ├── dates.ts           # Tijdzone-veilige datumhulpjes
    │   ├── format.ts          # nl-NL valuta/percentage-notatie en invoerparser
    │   └── chartTheme.ts      # Grafiekkleuren per thema
    ├── hooks/
    │   ├── useHashTab.ts      # Actief tabblad ↔ URL-hash
    │   ├── usePersistentState.ts
    │   └── useTheme.ts
    └── components/
        ├── ui/                # Card, Stat, Tabs, NumberField, DateField, Segmented, iconen
        ├── inputs/            # Analyseperiode, Maandbudget, Eenmalige inleg, Rendement & inflatie, Box 3
        ├── dashboard/         # KPI-rij, groeigrafiek, resultaten per module
        └── analysis/          # Scenario's, inzichten, box 3-overzicht
```

## Rekenmodel in het kort

Maandelijkse simulatie met samengestelde rente. Het effectieve jaarpercentage `R` (per
kalenderjaar) wordt omgezet naar `r = (1+R)^(1/12) − 1`; maandinleg wordt aan het begin
van elke maand gestort; reële waarde = nominaal / prijsindex (opgebouwd uit de inflatie
per jaar). Zie
[`docs/FORMULES.md`](docs/FORMULES.md) voor alle formules, conventies en
vereenvoudigingen.

## Disclaimer

Dit is een rekenmodel met constante gemiddelde rendementen, geen financieel of fiscaal
advies. Werkelijke rendementen schommelen. Box 3 wordt vereenvoudigd berekend en de
cijfers voor 2027 en later zijn nog niet definitief; fondskosten zijn niet apart
gemodelleerd.
