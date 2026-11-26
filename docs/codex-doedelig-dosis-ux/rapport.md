# Dødelig dosis – UX-optimering og intuitiv navigation

Udgangspunkt: seneste stabile `main`, **6818b56e82d690d4efc209c010985f49ab8092e1**. Arbejdsbranch: `doedelig-dosis-ux`. Dato: 26. november 2026.

## Problemer og ændringer

Den tidligere værktøjslinje viste otte ligeværdige valg, næste scene lå efter dokumenterne, alle noter var redigeringsformularer, og kildebesøg flyttede den aktive efterforskning. Afslutningen samlede ni fritekstfelter og derefter hele den strukturerede vurdering på lange sider.

- Fire permanente hovedfaner med ikon og dansk tekst: **Efterforskning, Notesbog, Sporetavle, Sagsarkiv**. Mobil har fast bundnavigation med safe-area. Hypoteser, opslag, hjælp, afslutning, eksport og udskrift ligger i menuen. Nulstilling ligger under Administrér sagen og kræver bekræftelse.
- Næste handling åbner med ét tryk fra hele scenen. Første fire tilgængelige muligheder vises i original rækkefølge, resten under Se øvrige efterforskningsmuligheder. Ingen rangering efter afgørende spor eller korrekte svar.
- Scenen prioriterer titel, sted/tid, kompakt fuldt billede og kildetekst. Alle originale fotos kan forstørres. Ingen oplysninger er beskåret ud af billedfilerne. Førstegangshjælp er kort og kan afvises.
- Ensartet éttryksgemning, deduplikering, enkeltprøver og tekstmarkering bevarer kilden. Hurtig scenenote kræver ikke værktøjsskift. Gemning udskifter ikke dokumentets DOM og flytter ikke læsepositionen.
- Notesbogen viser læsekort. Redigering, kommentar og kategori åbnes på kortet. Kategori er valgfri; nye noter får den generelle kategori, indtil brugeren vælger andet. Søgning opdateres direkte og bevarer fokus og tekstmarkør. Eksport/kopi/udskrift er sekundære handlinger.
- Sporetavlen kan forbinde to valgte noter uden obligatorisk forklaring. Forklaringen kan tilføjes/redigeres senere. Træk, tastaturflytning, formularalternativ, kilde, redigering og sletning bevares. Nye kort får ledige pladser; tidligere gemte koordinater ændres ikke. Intern rulning og størrelsesvalg supplerer en fuld liste på mobil. Ingen faglige forbindelser oprettes automatisk.
- Sagsarkivet grupperer og søger i undersøgte kilder. **Kildevisning ændrer hverken aktiv scene, besøgte scener eller fund.** Betingede blokke, som endnu ikke er undersøgt, er skjult. Et eksplicit genbesøg følger de oprindelige regler. Retur til efterforskningen gendanner læsepositionen.
- Hypoteser bruger fortællende navne. Sikkerhed og evidens kan foldes ud; muligheder, tærskler og historik er bevaret. Hjælp åbnes uden sceneskift. De oprindelige hints vises ét niveau ad gangen efter eksplicit valg, uden tidsstyring eller pointstraf.
- Afslutningen viser egen konklusion i grupper på højst tre spørgsmål, derefter valgfri evidens og den oprindelige strukturerede vurdering i mindre trin. Tilbage, kladde, genoptagelse og retur til efterforskningen virker. Ingen faglige svar vises før aflevering. Efter aflevering findes alle oprindelige svar, forklaringer, kritiske spor, rekonstruktion, refleksioner og kilder. Rekonstruktionen kan foldes ud; simuleret UTH er valgfri.

## Narrativ og fagligt indhold: uændret

**`public/dose-case-001.js` er ikke ændret, heller ikke formatteret. `public/dose-engine.js` er ligeledes byte-identisk.** Caseversionen er fortsat 1. Alle 30 scener, 41 blokke, 19 billeder, ni fritekstspørgsmål og 11 strukturerede spørgsmål er bevaret. Dialoger, kritiske og vildledende spor, alternative ruter, laboratorieværdier, doser, enheder, referencer, hypoteser, hints, korrekte svar, forklaringer, UTH og point ligger fortsat i casefilen.

Den [maskinlæsbare baseline](../../test/fixtures/dose-ux/narrative-baseline.json) blev oprettet før UI-ændringerne. Den indeholder hele den normaliserede case, SHA-256 for case, engine og billeder samt fire identiske handlingsforløb med 59 tilstandsbilleder. Regressionen sammenligner tilgængelige scener, viste blokke, fund, historik og alle tre hints ved hver overgang samt den endelige bedømmelse.

- Case SHA-256: `c1447d25fcbb5cc38bcb2b7e1ddcb6a722a84dc8ea2afc18d9e5c83caaa436c7`.
- Engine SHA-256: `ac28d69ce70826c22ee08f809ff85b28146405458b629d53f82b4b3338472c7e`.

## Gemte spil og generisk opbygning

Lagringsnøgle, schema og caseversion er uændrede. UI-trin og filtre gemmes som JSON-tekst under en ny nøgle i det eksisterende `drafts`-objekt. Nye noter kan have en additiv placeringsmarkør; gamle noteobjekter og koordinater bevares. Intet nulstilles ved opdateringen. En versionsmeddelelse ved en fremtidig faktisk caseopdatering forsvinder nu ikke efter første vellykkede gemning.

[Fem syntetiske v1-fixtures](../../test/fixtures/dose-ux/legacy-saves.json) er fremstillet med den oprindelige motor: indledning, interview, rig efterforskning med noter/links/hypotese/hint/UTH, igangværende afslutning og afsluttet sag med 100 point. De er ikke kopier af virkelige brugeres data. Alle bevarer scene, fund, noter/kommentarer/kategorier/pins/koordinater, forbindelser, hypoteser, hints, kladder, rapport, UTH og resultat. Browseren tester desuden genindlæsning midt i den nye afslutning.

Registry, caseindhold, motor og lagring er fortsat adskilt. `dose-ux.js` indeholder kun præsentation og kender ingen lægemiddelspecifik løsning. En alternativ infusionscase testes både i motoren og i den faktiske UI via en injicerbar registry. Der er ikke tilføjet seks nye sager, backend, AI-kald eller nye afhængigheder.

## Ændrede filer

| Fil | Formål |
|---|---|
| `public/dose-game.js` | Navigation, kildevisning, kontekst/scroll/fokus, notesbog, tavle, hjælpedialoger, afslutning og genoptagelse |
| `public/dose-ux.js` | Generiske værktøjer, kildegrupper, neutrale valg, nye kortplaceringer og afslutningstrin |
| `public/dose.css` | Responsivt layout, bundnavigation, læsekort, dialoger, kompakte billeder og tavle |
| `public/dose-storage.js` | Bevar meddelelsen om en faktisk caseversionsændring |
| `test/dose-ux.test.js` + `test/fixtures/dose-ux/` | Blokerende indholdsbaseline, ruter, ældre saves og generisk præsentation |
| `tests-browser/dose-investigation.cjs` | Eksisterende fire fulde ruter tilpasset den nye navigation og trinopdelte aflevering; faglige assertions bevaret |
| `tests-browser/dose-ux.cjs` | Kildeadskillelse, scroll/fokus, søgning, tavle, gamle saves, rapportgenoptagelse og responsive kontroller |
| `scripts/ci/test-registry.js` | Ny UX-regression i eksisterende casegruppe |
| `docs/codex-doedelig-dosis-ux/` | Målinger, reproducerbare værktøjer, rapport og visuel dokumentation |

Andre læringsspils kode, platformens indhold, byggesystemet, dependencies og workflows er ikke ændret. Den eksisterende risikobaserede CI og genbrug af build er bevaret. Kun én browserregression er tilføjet i den eksisterende gruppe. Ingen ny permanent workflow i main.

## Tests og kvalitet

- **282 Node-tests består**, inklusive 16 nye UX-/indholdsregressioner og alle 266 eksisterende tests.
- Syntakskontrol, build og `git diff --check` består.
- Fire komplette sagsruter: hustru, indlæggelse, stue og vildledende spor; to på emuleret mobil. Alle afleverer korrekt til 100 point uden krav om alle valgfrie scener.
- Eksisterende kontroller af tekstmarkering, enkeltprøve, egne noter, kommentarer, pins, muse-/touchtræk, piletaster, hypoteser, alle farmakologiske opslag, hints, eksport, UTH, XSS, korrupt lager, versionsskift, billedfejl og genoptagelse består.
- Nye browserkontroller: fire hovedfaner, arkiv uden fremdriftsændring, ingen skjulte blokke i preview, kilde-retur med læseposition, dubletbeskyttelse, bevaret dokument-DOM og scroll ved gemning, levende søgning med fokus og caret, valgfri linktekst/redigering, browserens Tilbage, rapportens Tilbage/genindlæsning, fem gamle saves, 30 pins, 200 % tekst, reduceret bevægelse og alternativ infusionscase.
- Ti størrelser: 320×568, 375×667, 390×844, 430×932, 568×320, 844×390, 768×1024, 1024×768, 1280×800 og 1920×1080. Ingen dokumentbredde-overflow; tavle/tabeller ruller internt. Næste handling er tilgængelig med ét tryk.
- Platformens fire browser-smoketests består, herunder quiz, migration, backup, navigation og alle tre eksisterende spil på desktop og mobil.

[Ruter og resultater](after/browser-results.json) · [UX-kontroller](ux-results.json) · [18 opgaver før/efter](opgavemaalinger.md) · [Rå opgavemålinger](task-metrics.json).

## Målbar UX og afvejninger

Målingerne bruger samme case/saves på samme maskine og to skærmstørrelser. **De er automatiserede UI-kontroller og en faglig heuristisk vurdering, ikke en brugertest med studerende.** Rådata registrerer også skærmskift, brugeråbnede dialoger, antal synlige handlinger, obligatoriske felter, fokusmål og udskiftning af dokument-DOM. Maskinens køretid er ikke den menneskelige løsningstid. Kliktallene inkluderer ikke alle handlinger i native select eller indtastning.

| Kontrol | Før | Efter |
|---|---:|---:|
| Permanente hovedvalg | 8 | 4 |
| Synlige redigeringsfelter på tre eksisterende notekort | 9 | 0 |
| Fritekstfelter ved start på afslutning | 9 | 3 |
| Obligatorisk forklaring til en forbindelse | Ja | Nej |
| Næste handling fra dokumentstart | Rul til bunden | 1 tryk, 0 rulning |
| Søgning i noter | Indtast + Anvend filter | Direkte, med bevaret fokus |
| Kildevisning | Skift af aktiv scene | Aktiv scene og fund bevares |

Afslutningen kræver flere videre-tryk, og sekundære værktøjer får et ekstra menutryk. Kategoriseret arkiv og fuld tavleliste kan gøre siden længere; søgning og intern rulning er alternativer. De 18 opgavemålinger viser også disse forværringer frem for kun de forbedrede tal. Eksisterende, brugerplacerede tavlekort kan fortsat overlappe; de flyttes ikke automatisk. Efter cirka 40 tæt placerede nye kort bruges listen som supplement. Der foretages ingen løsningstolkning af brugerens noter eller forbindelser.

## Performance

Se [rå performance](performance.json). Samme Chromium/Playwright 1.56.1, 1280×800, lokal statisk server med Pages-understi, ny browserkontekst og tre samples pr. version. Forsiden indlæser stadig ingen casebilleder eller case-UI. Korte tidsforskelle på denne maskine kan skyldes støj og skal ikke læses som en dokumenteret forbedring på en fysisk telefon.

| Kontrol | Før | Efter |
|---|---:|---:|
| Samlet build, ukomprimerede kildebytes | 2825625 | 2849199 |
| Kildeaktiver | 127 | 128 |
| Forside, dekodede ressourcebytes | 1475096 | 1475096 |
| Forside, ressourceforespørgsler | 87 | 87 |
| Forside, casebilleder | 0 | 0 |
| Forside DOMContentLoaded, median ms | 193 | 152 |
| Sagsstart interaktiv, median ms | 180 | 151 |
| Sagsstart inkl. billeddecode, median ms | 198 | 169 |
| Sagsstart, heap bytes, median | 5377980 | 5499544 |
| Build, median ms | 784 | 910 |

UI-udvidelsen koster 23574 ukomprimerede bytes (ca. 0.83 % af hele buildet). Forsidens bytes og forespørgsler er identiske. Sagsstartens median-heap stiger ca. 2.3 %. De lavere tidsmålinger er ikke en statistisk dokumenteret hastighedsforbedring. Billeddecode/preload er ens for begge versioner; decodedBodySize inkluderer cache-resourceregistreringer. Ingen tung afhængighed eller genberegning af caseindhold er tilføjet.


## Visuel dokumentation

[Se billederne direkte på GitHub](billedoversigt.md) eller [åbn galleriets HTML-fil](galleri.html). Hent mappen med `galleri.html`, `before/` og `after/`, og åbn HTML-filen lokalt; desktop/mobil kan vælges øverst. 15 sammenlignelige tilstande ved to viewports giver **60 kuraterede før/efter-billeder**. Derudover er screenshots fra de komplette ruter og layoutkontrollen bevaret. Galleri og rapport indeholder caseoplysninger og kopieres ikke til det offentlige Pages-build.

Sagsmapper, indledning, interview, journal, blodprøver, administration, næste handling, notesbog, tavle, arkiv, hypotese, hjælp, afslutning, rekonstruktion og UTH har alle før/efter-billeder. Forklaringer står ved hvert billedpar.

## Begrænsninger

Ingen kendte blokerende fejl i de gennemførte tests. Browsermålingerne er Chromium på desktop og emuleret mobil; der er ikke udført en fysisk iPhone-/VoiceOver-/skærmtastaturtest eller undervisningsforsøg med studerende. Semantik, tastatur, fokus, Escape, safe-area, text zoom og reduceret bevægelse er kontrolleret, men dette er ikke en fuld ekstern WCAG-audit. Clipboard kræver browserens tilladelse; lokal eksport og print er alternativer. Ingen brugerdata er hentet fra andre enheder.

## Udgivelse

Se [udgivelseskontrol](publicering.md). Backupbranch `backup-main-foer-doedelig-dosis-ux` peger på det ovenstående udgangspunkt. Main er opdateret gennem PR #14 efter alle beståede kontroller. Pages og den offentlige version er efterfølgende verificeret. Ingen force-push eller sletning af udviklings-/backupbranches.
