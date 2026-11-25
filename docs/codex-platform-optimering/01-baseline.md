# Baseline og afgrænsning

Måledato: 25. november 2026. Arbejdsbranch: `optimering-oprydning-ci-cd`. Udgangspunkt: seneste `origin/main`, `b69df9b0cee9d2a284824c8c5d6a07159fa30f0b`. Denne version indeholder den nyere, forenklede forside og alle tre spil. Den er bevaret. Intet merges eller udgives som led i denne opgave.

## Repository ved start

| Kategori | Filer | Bytes | Egne kodelinjer |
|---|---:|---:|---:|
| Produktionsfiler, public | 105 | 1.658.112 | 23.324 |
| Node-tests/fixtures | 42 | 270.340 | 4.149 |
| Browsertests/hjælpere | 41 | 332.379 | 7.219 |
| Scripts | 5 | 19.208 | 243 |
| Workflow | 1 | 4.420 | 120 |
| Øvrig konfiguration | 8 | 17.224 | 6 |
| Historisk dokumentation | 509 | 217.569.436 | separat |
| **I alt** | **711** | **219.871.119** | **35.061** |

Kodelinjer er fysiske linjer i egne JS/CJS/CSS/HTML/YML-filer, inklusive kommentarer og blanklinjer, eksklusive Three.js og historisk dokumentation. Dokumentationen fylder 207,49 MiB. Den indeholder 335 PNG, 29 MP4, 14 WebM, 72 JSON, 31 Markdown, 8 HTML, 19 TXT og ét DOCX.

Det delte lokale Git-objektlager viste cirka 203,58 MiB løse objekter og 467,77 KiB pakker. Dette er en observation fra et miljø med flere worktrees/referencer, ikke en universel klonstørrelse. Ingen `gc`, historikomskrivning eller force-push er udført. En faktisk fuld CI-klon i miljøforsøget havde 199.558 KiB pakkede objekter; sparse checkout med blob-filtrering havde 773 KiB.

## Faktisk seneste main-udgivelse

[Actions 45366303009](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/runs/45366303009), commit `b69df9b`, gennemført 24. november:

| Del | Målt varighed |
|---|---:|
| Samlet forløb | 57 min. 47 sek. |
| Build-job inklusive browserkontrol | 57 min. 28 sek. |
| Checkout | 9 sek. |
| Setup Node | 3 sek. |
| Node-tests, 233 tests | 23 sek. |
| Produktionsbuild | 3 sek. |
| npm, Chromium og systemafhængigheder samlet | 29 sek. |
| Sekventielle browsertests | 56 min. 13 sek. |
| Configure Pages / upload | 1 / 2 sek. |
| Deploy-job / selve deploy-trinnet | 10 / 6 sek. |

Job- og trintider kommer fra Actions-API; de inkluderer ikke nødvendigvis samme overhead og skal ikke summeres ukritisk. Historiske npm- og browserinstallationer er ét trin og kan derfor ikke opdeles præcist efterfølgende. Det nye miljøforsøg måler dem separat. Runnerkø og jobovergange registreres i måleresultaterne, når API'et giver dem; den samlede ventetid pr. matrixjob er også afhængighedsventetid, ikke alene kø efter ledig maskine.

Omkring 97 % af den observerede udgivelsestid lå i den sekventielle browserpakke. De største forløb var fordøjelsens seks komplette rejser (~19 min.), checkpoint/genoptag (~10 min.) og fordøjelseslyd (~7 min.). De reelle læse-, pause-, lyd- og checkpointintervaller er funktionelle testkrav og bevares.

Lokalt bestod alle 233 eksisterende Node-tests før ændringerne (33,265 sek., Node 24.22.1, CPU-kvote 2 kerner). Baseline-buildets faktiske `dist` var 1.658.272 bytes i 106 filer; hash `0f3ca54c9959`.

[Reproducerbar evidens og checksums](audit-data.json) · [Før/efter-målinger](08-performance-foer-efter.md).

Varige job-/trintider og efterfølgende sammenligninger findes i [maalinger.json](maalinger.json). De gamle 19 browserfilers omtrentlige grænsetider er udledt fra loggenes afsluttende PASS-tidsstempler; den nye runner måler hver fil direkte.
