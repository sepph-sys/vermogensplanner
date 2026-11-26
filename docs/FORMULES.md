# Financiële formules

Dit document beschrijft precies hoe de Vermogensplanner rekent. Alle code staat in
[`src/lib/finance.ts`](../src/lib/finance.ts) en [`src/lib/model.ts`](../src/lib/model.ts);
de formules worden gecontroleerd door de tests in [`src/lib/finance.test.ts`](../src/lib/finance.test.ts).

## 1. Notatie

| Symbool | Betekenis |
|---|---|
| `P`   | Startinleg (beleggen) of startsaldo (sparen) |
| `PMT` | Maandelijkse inleg |
| `R`   | Effectief jaarrendement / jaarrente (als fractie, 7% → 0,07) |
| `r`   | Equivalent maandpercentage |
| `i`   | Gemiddelde jaarlijkse inflatie (fractie) |
| `g`   | Jaarlijkse indexatie van de maandinleg (fractie; 0 = vast bedrag) |
| `n`   | Looptijd in hele maanden |
| `B_m` | Saldo aan het eind van maand `m` |

## 2. Aannames: één bron, generiek en per jaar

Rendement beleggen `R`, spaarrente `R_s` en inflatie `i` bestaan één keer in de app
(tabblad *Rendement & inflatie*). Elk veld dat ze toont, leest en schrijft dezelfde
waarde, en alle berekeningen gebruiken die waarde.

Per kalenderjaar `y` geldt:

```
R(y)   = R_jaar(y)   als ingevuld in de jaartabel, anders R_generiek
R_s(y) = R_s,jaar(y) als ingevuld,                 anders R_s,generiek
i(y)   = i_jaar(y)   als ingevuld,                 anders i_generiek
```

Elke kolom valt afzonderlijk terug op de generieke waarde. Scenario’s tellen hun
afwijking (procentpunten) op bij de waarde van elk jaar. Het kalenderjaar van maand `m`
is het jaar van de begindatum van die maand.

## 2a. Van jaar- naar maandrendement

Het ingevoerde percentage is een **effectief** jaarpercentage. Het maandpercentage is
het meetkundige (niet het rekenkundige) twaalfde deel:

```
r = (1 + R)^(1/12) − 1
```

Daardoor geldt exact `(1 + r)^12 = 1 + R`: een bedrag dat een jaar lang belegd is,
groeit met precies het opgegeven jaarrendement. (Bij `r = R/12` zou 7% per jaar in
werkelijkheid 7,23% opleveren.)

Voor sparen wordt dezelfde conventie gebruikt: de opgegeven spaarrente is het effectieve
jaarlijkse rendement, ongeacht of de bank maandelijks of jaarlijks rente bijschrijft.

## 3. Maandelijkse simulatie

De looptijd `n` is het aantal volle maanden tussen start- en einddatum (max. 100 jaar).
Per maand `m = 0 … n−1`:

```
B ← B + PMT_m + E_m      (stortingen aan het begin van de maand)
B ← B · (1 + r)          (groei over de maand)
```

met `PMT_m` de periodieke inleg en `E_m` de eenmalige stortingen in maand `m` (zie §6), beginwaarde `B = P`.

* **Maandelijkse inleg** wordt aan het *begin* van elke maand gestort (annuïteit
  *vooruitbetaald*), dus de eerste inleg valt op de startdatum.
* **Indexatie**: de maandinleg wordt op elke ‘verjaardag’ van de startdatum met `g`
  verhoogd; binnen een looptijdjaar is hij constant. Zonder indexatie is `g = 0` en is
  `PMT_m = PMT`.
* **Extra eenmalige stortingen** worden toegewezen aan de maand waarin hun datum valt,
  gerekend vanaf de startdatum: `m = volle maanden(startdatum → stortingsdatum)`.
  Stortingen vóór de startdatum of op/na de einddatum vallen buiten de looptijd; de UI
  markeert ze en ze tellen niet mee.

### Controle met de gesloten formule

Zonder extra stortingen en zonder indexatie is de simulatie gelijk aan de bekende formule voor toekomstige
waarde met vooruitbetaalde annuïteit:

```
FV = P·(1 + r)^n  +  PMT · [((1 + r)^n − 1) / r] · (1 + r)
```

(bij `r = 0`: `FV = P + PMT·n`). De test *“komt overeen met de gesloten annuïteitenformule”*
verifieert dit tot op 6 decimalen.

## 4. Resultaatgrootheden

| Grootheid | Formule |
|---|---|
| Totale inleg | `P + Σ PMT_m + Σ E_m` (zonder indexatie: `P + n·PMT + Σ E_m`) |

Extra eenmalige stortingen `E_m` bestaan voor beleggen én sparen; elke storting telt
alleen mee in de module die als bestemming is gekozen.
| Eindvermogen / eindsaldo | `B_n` |
| Behaald rendement / ontvangen rente (€) | `B_n − totale inleg` |
| Rendement (%) | `(B_n − totale inleg) / totale inleg` |

Het rendementspercentage is het **totale** rendement op het ingelegde geld over de hele
looptijd (geen jaarlijks percentage): omdat inleg gespreid binnenkomt, is dit iets anders
dan het jaarrendement.

## 5. Inflatie en reële waarde

De reële waarde drukt een toekomstig bedrag uit in euro’s van de startdatum
(koopkrachtgecorrigeerd):

```
D_0 = 1,   D_{m+1} = D_m · (1 + i(y_m))^(1/12)      (prijsindex)
Reëel(t) = Nominaal(t) / D_t
```

Bij constante inflatie is `D_t = (1 + i)^(t/12)`.

* **Koopkrachtverlies** = nominaal − reëel.
* **Koopkrachtverlies (%)** = verlies / nominaal.
* “Wat nu € 1.000 kost, kost straks” = `1000 · D_n`; de UI toont daarbij de gemiddelde
  inflatie `D_n^(12/n) − 1`.

Beleggen en sparen gebruiken dezelfde inflatie; de totale reële waarde is de som van
beide reële waarden.

> Let op: “reëel t.o.v. inleg” vergelijkt de reële eindwaarde met de nominale som van
> de inleg. Dat is een eenvoudige, conservatieve vuistregel – latere stortingen hebben
> door inflatie in werkelijkheid ook minder koopkracht.

## 6. Inlegregels (periodiek en eenmalig)

Code: [`src/lib/contributions.ts`](../src/lib/contributions.ts). Alle inleg bestaat uit
regels met bestemming (beleggen/sparen), frequentie, datum/vanaf, optioneel t/m, bedrag
`A`, indexatie en omschrijving. Startinleg en startsaldo zijn vaste regels op de
startdatum (`P`). Elke regel wordt omgezet naar een bedrag per simulatiemaand; dat bedrag
wordt aan het begin van die maand gestort.

| Frequentie | Stortingsmomenten | Bedrag in maand `m` |
|---|---|---|
| Eenmalig | datum | `A` |
| Maandelijks | vanaf, vanaf + 1 mnd, … t/m | `A · I` |
| Per kwartaal | vanaf, vanaf + 3 mnd, … t/m | `A · I` |
| Per jaar | vanaf, vanaf + 12 mnd, … t/m | `A · I` |
| Dagelijks | elke kalenderdag vanaf … t/m | `A · dagen_m · I` |

`dagen_m` = aantal kalenderdagen van de regel binnen simulatiemaand `m`. Zonder t/m loopt
de regel door tot het einde van de looptijd. Een regel zonder enige storting binnen de
looptijd wordt gemarkeerd en telt niet mee.

**Indexatie** `I` (per regel): na `k` volle jaren sinds ‘vanaf’ is
`I = Π_{j=1..k} (1 + g_j)`, met

* *Geen*: `g_j = 0`;
* *Inflatie*: `g_j` = inflatie van het kalenderjaar waarin maand `12j − 1` na ‘vanaf’ valt
  (inclusief afwijkingen per jaar en scenario-afwijking) – de inleg blijft reëel ongeveer
  constant;
* *Eigen %*: `g_j` = het ingevulde percentage.

**Maandequivalent** (samenvatting): maandelijks `A`, per kwartaal `A/3`, per jaar
`A/12`, dagelijks `A · 365,25/12`. Het dashboard toont daarnaast de gemiddelde periodieke
inleg per maand in het eerste en het laatste jaar van de looptijd.

**Hogere inleg (+10/25/50%)** vermenigvuldigt alle periodieke bedragen; startbedragen en
eenmalige stortingen blijven gelijk.

## 7. Scenario’s

Elk scenario past procentpunt-afwijkingen toe op de invoer en draait het volledige model
opnieuw:

| Scenario | Rendement | Spaarrente | Inflatie |
|---|---|---|---|
| Conservatief | −3 pp | −1 pp | +1 pp |
| Realistisch | ±0 | ±0 | ±0 |
| Optimistisch | +2 pp | +0,5 pp | −0,5 pp |

De afwijkingen zijn in de app aan te passen (“Scenario-aannames aanpassen”).

## 8. Inzichten

* **Herkomst vermogen**: aandeel eigen inleg = `totale inleg / totaal vermogen`; de rest
  komt uit rendement en rente.
* **Hogere inleg (+10/+25/+50%)**: alle periodieke inleg wordt met de factor
  vermenigvuldigd en het model wordt opnieuw doorgerekend. “Elke extra euro groeit uit tot”
  = `Δ eindvermogen / Δ inleg` bij +10%.
* **FIRE – 4%-regel**: duurzaam maandinkomen ≈ `reëel totaal vermogen × 4% / 12`.
  Gebaseerd op de *Trinity-study*-vuistregel; geen garantie.
* **Kantelpunt**: de eerste maand waarin de maandelijkse groei van de beleggingen
  (`B · r`) groter is dan de maandelijkse inleg.

## 9. Box 3-belasting

Code: [`src/lib/box3.ts`](../src/lib/box3.ts), tests: [`src/lib/box3.test.ts`](../src/lib/box3.test.ts).
Spaargeld en beleggingen zijn de enige box 3-bezittingen; er zijn geen schulden.

### Perioden

De parameters staan in een tabel met perioden. Een periode geldt vanaf haar jaar tot de
volgende periode; de laatste geldt voor alle latere jaren (jaren vóór de eerste periode
gebruiken de eerste). Zo wordt elk jaar van de forecast belast.

**Indexatie na de laatste periode** (optie, standaard aan): voor jaren na het laatst
opgegeven jaar `Y₀` worden het heffingsvrij vermogen en het heffingsvrij resultaat
geïndexeerd met de inflatie per jaar `i(y)` (inclusief scenario-afwijking):

```
vrijstelling_Y = vrijstelling_Y₀ · Π_{y = Y₀+1 … Y} (1 + i(y))
```

Tarief, forfaits en verliesdrempel blijven gelijk aan de laatste periode. In de tabel
‘Berekening per jaar’ staat bij elk geïndexeerd jaar de toegepaste vrijstelling. Standaard (beoogde opbouw, stand november 2026):

| Vanaf | Stelsel | Heffingsvrij | Forfait bank | Forfait overig | Tarief |
|---|---|---|---|---|---|
| 2026 | Forfaitair | € 59.357 vermogen p.p. | 1,28% (voorlopig) | 6,00% | 36% |
| 2027 | Forfaitair | € 60.098 vermogen p.p. (voorlopig) | 1,28% (aanname) | 6,37% (voorlopig) | 36% |
| 2028 | Werkelijk rendement | € 1.800 resultaat p.p.; verliesdrempel € 500 p.p. | – | – | 36% |

Alle waarden zijn in de app aan te passen. Het kabinet heeft op 3 november 2026
voorgesteld het werkelijk-rendementstelsel pas per 2029 in te voeren; simuleer dat door
‘Vanaf jaar’ van de laatste periode op 2029 te zetten. Bij fiscale partners worden het
heffingsvrij vermogen, het heffingsvrij resultaat en de verliesdrempel verdubbeld.

### Belastingjaren en betaling

* Belasting wordt per kalenderjaar berekend. Het kalenderjaar van een maand is het jaar
  van de begindatum van die maand.
* De aanslag wordt aan het einde van elk kalenderjaar (en aan het einde van de looptijd)
  uit het vermogen betaald, verdeeld over beleggen en sparen naar rato van hun bijdrage
  aan het belaste (fictieve of werkelijke) rendement.
* Peildatum is 1 januari; in het eerste jaar is dat het saldo op de startdatum.

### Forfaitair stelsel

```
vermogen      = S + B                         (saldi op de peildatum)
fictief       = (S · f_bank + B · f_overig) · k/12
grondslag     = max(0, vermogen − heffingsvrij vermogen)
voordeel      = fictief · grondslag / vermogen
belasting     = voordeel · tarief
```

`k` = aantal maanden van het kalenderjaar binnen de looptijd (deeljaren naar rato).

**Tegenbewijsregeling** (optioneel): is het werkelijke rendement over het jaar (rente +
waardeverandering) lager dan het fictieve rendement, dan wordt `fictief` vervangen door
`max(0, werkelijk rendement)`.

### Werkelijk rendement

```
resultaat  = rente + waardeverandering in het jaar
als resultaat ≥ 0:
  na_vrijstelling = max(0, resultaat − heffingsvrij resultaat)
  belastbaar      = na_vrijstelling − verrekend verlies uit eerdere jaren
als resultaat < 0:
  verrekenbaar verlies += max(0, −resultaat − verliesdrempel)
belasting  = belastbaar · tarief
```

Ongerealiseerde koerswinst wordt jaarlijks belast (vermogensaanwas), zoals in het
wetsvoorstel voor beleggingen.

### Effect in het dashboard

* Eindvermogen, rendement en reële waarde zijn **na** box 3.
* ‘Effect op eindvermogen’ = eindvermogen met box 3 − eindvermogen zonder box 3. Dit is
  meer dan de betaalde belasting, omdat betaalde belasting ook niet meer meegroeit.
* ‘Belastingdruk op groei’ = dat effect gedeeld door het bruto rendement zonder box 3.

## 10. Bewuste vereenvoudigingen

* Constante gemiddelde rendementen; geen volatiliteit of volgorde-risico (*sequence of
  returns*). Werkelijke rendementen schommelen.
* Box 3 is vereenvoudigd: geen schulden, groene beleggingen, andere bezittingen of
  voorlopige aanslagen gedurende het jaar; de belasting wordt per jaareinde betaald.
  Transactie- en fondskosten zijn niet apart gemodelleerd – verwerk kosten door een netto
  rendement in te voeren.
* Indexatie gebeurt in jaarlijkse stappen, niet maandelijks; extra eenmalige stortingen
  worden niet geïndexeerd.
