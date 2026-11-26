# Vermogensplanner

Een moderne, responsive webapp om vermogensopbouw via **beleggen** en **sparen** op lange
termijn te simuleren – gemaakt voor persoonlijke financiële planning en
FIRE-scenario’s. Gebouwd met React, TypeScript, Vite en Recharts.
Alle berekeningen gebeuren in de browser; er is geen backend en er wordt niets verstuurd.

## Functies

- **Beleggen** – start- en einddatum, startinleg, maandelijkse inleg, onbeperkt aantal
  extra eenmalige stortingen (datum + bedrag + omschrijving), jaarrendement en inflatie.
  Toont totale inleg, behaald rendement (€ en %), eindvermogen en reële eindwaarde.
- **Sparen** – startsaldo, maandelijkse inleg, spaarrente en inflatie. Toont totale
  inleg, ontvangen rente, eindsaldo en reële eindwaarde.
- **Maandbudget** – één vrij besteedbaar maandbedrag dat via slider, percentage of
  snelkeuzes (80/20, 70/30, …) over beleggen en sparen wordt verdeeld. Alles herberekent
  direct. Uit te zetten voor handmatige invoer per module.
- **Indexatie** – laat de maandinleg jaarlijks meegroeien, gelijk aan de inflatie of met
  een eigen percentage.
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

1. **Looptijd** – kies start- en einddatum, of een snelkeuze van 10–40 jaar.
2. **Maandbudget** – vul je vrij besteedbare bedrag in en schuif de verdeling.
   Zet de schakelaar uit om de maandinleg per module zelf in te vullen. Zet
   *Maandinleg jaarlijks indexeren* aan om de inleg elk jaar te verhogen: laat
   *Gelijk aan inflatie* aangevinkt, of vink het uit en vul een eigen percentage in.
3. **Beleggen / Sparen** – vul startbedragen, rendement/rente en inflatie in en voeg
   eventuele extra stortingen toe (bonus, erfenis, vakantiegeld). Stortingen buiten de
   looptijd worden rood gemarkeerd en niet meegeteld.
4. Bekijk het **dashboard**, schakel de grafiek tussen *Nominaal* en *Reëel* en hover
   voor details per maand.
5. Vergelijk **scenario’s** en pas onder “Scenario-aannames aanpassen” de afwijkingen aan.
6. Met **Voorbeelddata** (rechtsboven) zet je alles terug naar het voorbeeld.

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
    │   ├── model.ts           # State-types, voorbeelddata, beleggen+sparen-model
    │   ├── dates.ts           # Tijdzone-veilige datumhulpjes
    │   ├── format.ts          # nl-NL valuta/percentage-notatie en invoerparser
    │   └── chartTheme.ts      # Grafiekkleuren per thema
    ├── hooks/
    │   ├── usePersistentState.ts
    │   └── useTheme.ts
    └── components/
        ├── ui/                # Card, Stat, NumberField, DateField, Segmented, iconen
        ├── inputs/            # Looptijd, Maandbudget, Beleggen, Sparen
        ├── dashboard/         # KPI-rij, groeigrafiek, resultaten per module
        └── analysis/          # Scenariovergelijking, financiële inzichten
```

## Rekenmodel in het kort

Maandelijkse simulatie met samengestelde rente. Het effectieve jaarpercentage `R` wordt
omgezet naar `r = (1+R)^(1/12) − 1`; maandinleg wordt aan het begin van elke maand
gestort; reële waarde = nominaal / `(1+i)^(maanden/12)`. Zie
[`docs/FORMULES.md`](docs/FORMULES.md) voor alle formules, conventies en
vereenvoudigingen.

## Disclaimer

Dit is een rekenmodel met constante gemiddelde rendementen, geen financieel advies.
Werkelijke rendementen schommelen; belasting (box 3) en kosten zijn niet apart
gemodelleerd.
