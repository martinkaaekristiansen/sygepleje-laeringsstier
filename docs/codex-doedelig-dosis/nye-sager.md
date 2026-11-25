# Datastruktur og tilføjelse af nye sager

Spilmotoren består af `public/dose-engine.js` (rene deterministiske funktioner), `dose-game.js` (DOM og interaktion), `dose-storage.js` (isoleret localStorage og revisionskontrol) og `dose.css`. Der findes ingen lægemiddelspecifik logik i motoren.

`public/dose-catalog.js` indeholder den lille læringssti og caseregisteret. Hver registerpost indeholder et stabilt `id`, titel, spoilerfri introduktion, `version` og en **bogstavelig dynamisk import**, f.eks. `() => import('./dose-case-002.js').then(m => m.case002)`. Bogstavelige importstier bevarer CI's analyse af afhængigheder. Indlæs kun færdigudviklede sager i registeret.

## Arbejdsgang

1. Kopiér [caseskabelonen](case-template.js) til et nyt `public/dose-case-002.js`. Behold ID'er stabile ved senere rettelser.
2. Tilføj caseindhold, kontrollerede kliniske dokumenter, neutrale prøveforklaringer, lokalt opslagsværk, alternative veje og mindst tre hypotesestop.
3. Læg optimerede billeder som flade filer i `public/`. Det eksisterende build bruger en flad, hashbaseret assetmappe. En billedmappe kræver en særskilt kontrolleret udvidelse af build-kontrakten og er ikke nødvendig for en ny sag.
4. Tilføj en registerpost, når sagen er færdig. Tilføj ingen tomme spilbare mapper.
5. Kør de automatiske datavalideringer og tilføj mindst tre UI-gennemspilninger for den nye sag. Unit-testen indlæser automatisk **alle** registrerede cases og kontrollerer deres billedfiler.
6. Kontroller kilder, enheder, kronologi, mobil, tastatur, gemmeversion og afslutning før udgivelse.

## Obligatoriske data og UI-felter

| Felt | Funktion |
| --- | --- |
| `id`, `version`, `history` | Identitet, positiv caseversion og versionshistorik |
| `title`, `semester`, `intro`, `learningGoals` | Præsentation og læringsmål |
| `start`, `phases` | Startscene og narrative faser |
| `images` | Nøgle → `{src, alt}`. Brug `new URL('./fil.webp', import.meta.url).href` |
| `characters` | `{id, name, role, image}`. Et portræt kan matche scenens illustration |
| `scenes` | Scene-ID, titel, fase, illustration, sted, tidspunkt, intro og blokke |
| `scenes[].when` | Oplåsningsregel; uden regel er scenen tilgængelig fra start |
| `scenes[].reason` | En klinisk/narrativ grund til at undersøge netop denne kilde |
| `scenes[].kind` | `reference` placerer scenen i opslagsværket |
| `blocks` | Informationsblokke med stabile ID'er, titel og tekst. Hver blok kan gemmes særskilt |
| `blocks[].when` | Betinget tekst ved genbesøg, f.eks. nye interviewoplysninger |
| `blocks[].neutral` | Neutral forklaring på, hvad en blodprøve måler |
| `blocks[].table` | `{headers, rows}` med kontrolleret klinisk tekst |
| `blocks[].chart` | `{label, values, labels}`. Enkel graf med tekstligt alternativ |
| `critical` | Kritiske blok-ID'er, der gennemgås efter afslutning |
| `hypothesisOptions`, `hypothesisThresholds` | Mulige hypoteser og tre naturlige tidspunkter målt i besøgte scener |
| `hints` | Progressionsbetingelse og præcis tre niveauer. Sidste opfyldte gruppe anvendes |
| `freeQuestions` | Først den studerendes egen forklaring; bedømmes ikke automatisk |
| `assessment` | Strukturerede spørgsmål, facit, forklaringer og point; tilsammen 100 |
| `reconstruction`, `reflection`, `uthFields` | Kronologi, videre refleksion og simuleret rapport |
| `sources` | Stabile reference-ID'er, titel og kontrolleret HTTPS-adresse |

## Betingelser

```js
{ seen: 'medicinliste' }
{ found: 'nyrefunktion' }
{ hypothesis: 'laegemiddelpavirkning' }
{ all: [ { seen: 'medicinliste' }, { any: [
  { found: 'symptom' }, { seen: 'sygeplejerske' }
] } ] }
```

Betingelser er monotone: fund og besøg mistes ikke ved nye valg. Hypoteser må foreslå relevante undersøgelser, men kritiske spor skal kunne nås uden en bestemt hypotese. Dermed kan en forkert mistanke aldrig lukke sagen permanent. Motoren opretter ikke fagligt korrekte forbindelser på den studerendes tavle.

Valideringen finder ukendte referencer, dublerede ID'er, manglende billeddefinitioner, ugyldige regler, selvafhængigheder/cirkulære låse, utilgængelige scener/kritiske spor, hypoteselåste kritiske spor, manglende facit/kilder og ugyldige point. Unit-testen kontrollerer derudover, at de registrerede billedfiler findes. OR-regler med en gyldig alternativ vej accepteres.

## Evaluering

Spørgsmålstyper: `choice`, `multi`, `number`, `order`, `match`. `correct` er henholdsvis et muligheds-ID, en ID-liste, et tal, en rækkefølge af ID'er eller et objekt fra par-ID til muligheds-ID. Forklaring, point og facit ligger i casedata. Flervalg, rækkefølge og forbindelser kræver et fuldt korrekt svar for spørgsmålets point. Der gives ingen point for hastighed, fritekstens nøgleord eller blot besøgte scener.

## Gemning og privatliv

Hver sag bruger `doedelig-dosis:v1:<case-id>`. Sagsdata, noter, tavle, hypoteser, hints, kladder og UTH gemmes lokalt efter handlinger og tekstredigering. Tidligere spils IndexedDB-schema ændres ikke. Platformens eksisterende backupformat omfatter ikke disse separate sager; brug spillets **Eksportér notesbog og sag** for en lokal kopi. Eksport er et læsbart JSON-dokument; import af en sådan fil er ikke implementeret.

Ved stigende caseversion bevares noter og gyldige scene-/spor-ID'er. En forældet automatisk slutvurdering nulstilles. Ved beskadigede data bevares originalen og lagring stoppes, indtil brugeren bevidst nulstiller den berørte sag. UTH sendes aldrig til et virkeligt system. Konflikter mellem faner blokerer overskrivning og beder om genindlæsning.

En statisk læringsplatform kan ikke hemmeligholde facit for nogen, der bevidst åbner JavaScript-kilden eller browserens udviklerværktøjer. Den almindelige UI viser ikke facit eller den målrettede lægemiddelkoncentration før de relevante overgange.

## De næste seks sager

Den verificerede officielle liste består af diabetesmedicin, blodfortyndende medicin, opioider, digoxin, gentamicin, kalium og methotrexat i lavdosis. Sag 001 dækker digoxin. Bed om en ny, selvstændig sag med eget patientforløb og kilder for én af de øvrige grupper. Grupperne må ikke bruges som afslørende titler på sagsmapperne.

Den ikke-offentlige fixture `test/dose-fixture.js` om en infusionsundersøgelse verificerer, at samme motor fungerer med andet indhold end sag 001. Fixture og skabelon indgår ikke i det publicerede build.
