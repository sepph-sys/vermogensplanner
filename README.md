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
- **Inleg** – één tabel met startinleg/startsaldo (vaste regels), periodieke inleg
  (dagelijks, maandelijks, per kwartaal of per jaar, met optionele einddatum en indexatie
  met inflatie of een eigen percentage) en eenmalige stortingen, naar beleggen of sparen.
  Bovenaan een samenvatting van de vaste inleg in het model.
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
1. Kies bovenaan de **analyseperiode** (start- en einddatum, of 5–40 jaar). Die geldt
   voor alle berekeningen.
2. Bekijk de kerncijfers, de grafiek (schakel tussen *Nominaal* en *Reëel*, hover voor
   details per maand), de resultaten per module en het box 3-overzicht.
3. Vergelijk **scenario’s** en pas onder “Scenario-aannames aanpassen” de afwijkingen aan.
4. Lees de **financiële inzichten**: herkomst van je vermogen, inflatie, FIRE en het
   effect van een hogere inleg.

**Inleg**
1. Bovenaan staat een korte **samenvatting van de vaste inleg**: totaal per maand,
   verdeling beleggen/sparen en alle periodieke regels.
2. In de tabel **Inleg** staan alle regels:
   - **Startbedragen**: twee vaste regels voor startinleg beleggen en startsaldo sparen.
   - **Periodieke inleg**: kies bestemming, frequentie (dagelijks, maandelijks, per
     kwartaal, per jaar), ‘vanaf’, optioneel ‘t/m’ (leeg = tot het einde van de
     looptijd), bedrag en indexatie (*Geen*, *Inflatie* of *Eigen %*).
   - **Eenmalige stortingen**: bestemming, datum, bedrag en omschrijving.
   Onderaan staat per bestemming het totaal aan start- en eenmalige inleg en de
   periodieke inleg per maand. Regels zonder storting binnen de looptijd worden rood
   gemarkeerd en tellen niet mee.

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

**Datums** typ je in of kies je met de kalenderknop; ze worden altijd getoond als
dd/mm/jjjj. Herkend worden dd/mm/jjjj, mm/dd/jjjj (als dd/mm niet kan, bv. 12/31/2030),
jjjj/mm/dd en – zonder scheidingstekens – ddmmjjjj. Ook `-`, `.` of een spatie mogen als
scheidingsteken. Een ongeldige datum wordt rood gemarkeerd met een melding; de vorige
waarde blijft dan in de berekening staan. Bevestig met Enter of door het veld te
verlaten; Esc herstelt de vorige waarde.

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
    │   ├── contributions.ts   # Inlegregels → kasstroom per maand (frequentie, indexatie)
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
        ├── inputs/            # Analyseperiode, inlegtabel + samenvatting, Rendement & inflatie, Box 3
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
