# Afsluttende rapport

Arbejdet er gennemført på `optimering-oprydning-ci-cd` med udgangspunkt i `b69df9b0cee9d2a284824c8c5d6a07159fa30f0b`. **Main er ikke ændret eller udgivet. Merge og udgivelse afventer din godkendelse.**

Den nye CI bruger en fælles kvalitetskontrol, konservativt valgte regressioner, isolerede runners og en main-afgrænset Pages-deploy. Alle oprindelige tests er bevaret, og iltspillet er nu med. To fulde grønne forsøg tog 17:47 med otte runners og **11:39 med 16**; den tidligere main-udgivelse tog 57:47. Sidste kontrol af `f0d347a`: **BESTÅET**, 12:35. Den nye valideringstid omfatter ikke Pages-deployment.

## Før og efter

| Parameter | Før | Efter | Vurdering |
|---|---:|---:|---|
| Versionerede arbejdsfiler | 711 / 219.871.119 bytes | 746 / 220.333.791 bytes i sluttræet | Flere CI-værktøjer, tests og rapporter; ingen historiske filer er slettet |
| Egne produktionskodelinjer | 23.324 | 23.320 | Fire færre netto; otte ubrugte importbindinger fjernet |
| CI-checkout, miljøforsøg | 7 sek. / 219.885.726 bytes | 1 sek. / 2.316.290 bytes | Sparse checkout, 98,95 % færre arbejdsbytes i forsøget |
| Produktionsbuild, faktiske bytes | 1.658.272 | 1.652.578 | −0,34 %, uden tab af runtime-indhold |
| Byggetid, lokal median under samme betingelser | 2,6681 sek. | 0,9464 sek. | −64,5 %, samme syntaks-/vendorkrav |
| npm-installation | 2 sek. i separat native benchmark | 1–3 sek. med cache/container | Lille gevinst; ikke hovedflaskehalsen |
| Browser-/OS-klargøring | 29 sek. inkl. npm i gammel workflow | 20–30 sek. image-opstart i udvalgte CI-jobs | Versionslåst image; spejlworkaround bevares som alternativ |
| Node-tests | 233 tests / 23 sek. i gammel CI | 247 tests / 26,693 sek. i sidste CI | Flere tests; runnerstøj gør en generel hastighedsgevinst udokumenteret |
| Browserdækning | 19 filer sekventielt, 56:13 | 29 filer / 38 kørsler i isoleret matrix | Flere funktioner kontrolleres |
| Mindre tekstrettelse | Udløste hele pakken | Fælles pakke målt til 135 sek. + 14 sek. analyse i 16-runner-forsøget | Komplet tekstudgivelse endnu ikke isoleret målt |
| Almindelig kodeændring | Udløste hele pakken | Målrettet pakke efter indirekte afhængigheder | 5–10 min. er et mål; ikke bekræftet for alle spilændringer |
| Fuld regression | Gammelt buildjob 57:28, uden deployjob | 11:39 i matrixforsøg; sidste kontrol 12:35 | Ingen tests fjernet for at gøre pakken hurtig |
| Samlet offentlig udgivelse | 57:47 | Ikke gennemført | Afventer godkendt merge/deployment |
| Aktiv runner-tid, fuld matrix | 57:38 | 107:36 i 16-runner-forsøget | +86,7 %, især tilføjet iltdækning og setup; ventetid og forbrug er forskellige mål |
| API-faktureret Actions-tid i målingerne | 0 | 0 | Faktisk API-observation, ikke nul computerarbejde |
| Fjernede fil-dubletter / kildefiler | 0 | 0 | Historik og dokumentation bevares |
| Udeladte test-/historikmoduler i dist | 0 | 3 | Kilder og Node-tests bevares; runtime-reference geninkluderer automatisk |

Sluttræets størrelse tæller alle versionerede filer, inklusive de afsluttende rapporter og måletal. Git-objekter og historik kommer derudover. Kodecheckpoint f0d347a havde til sammenligning 745 filer og 220.166.663 bytes. Hele kodebasens linjetal falder ikke, fordi der kommer CI og regressionstests til. Det er de fire produktionslinjer og de otte importbindinger, der er fjernet som dokumenteret ubrugt kode.

## Ændret, fjernet og foreslået arkiv

- Nye workflows deler plan, fælles kontroller, målrettet/fuld regression og deploy. Dokumentation alene udgiver ikke. Node-/browsercache og sparse checkout er målt; en versions-/digestlåst Playwright-container er valgt.
- Build bruger én V8-parserproces frem for 96 Node-opstarter, bevarer checksums, relative hash-URL'er og licens og udelader kun tre dokumenterede testmoduler.
- Otte ubrugte importnavne er fjernet. Én reel dublet i udviklingsserverne er samlet. Ingen tests, fagtekster, anatomi, animationer eller brugerdata er fjernet.
- Én nødvendig CSS-værdi i iltens landskabslayout er rettet efter en afsløret én-pixel-afklipning. Alle 27 layoutspørgsmål på ni viewports består.
- Historiske medier udgør størstedelen af de 207,49 MiB dokumentation. Der er ni byte-dubletgrupper med 6,17 MiB ekstra kopier. **Intet er arkiveret eller slettet.** [Arkiveringsplanen](06-arkiveringsplan.md) kræver særskilt konkret godkendelse.

## Tests og begrænsninger

247 Node-tests, build, syntaks, platform/data/backup/quiz og alle tre spil på desktop/mobil består i de grønne CI-forsøg. Alle seks iltrejser, alle seks fordøjelsesrejser, gamle gemte forløb, genoptag, pause, lyd og sluttests indgår. Sidste måledata og per-fil-resultater findes i [testresultater](07-testresultater.md) og [maalinger.json](maalinger.json).

Eksisterende offentlige Pages gav HTTP 200, og alle 104 assets matcher uændret main. Direkte live-Chromium kunne ikke fuldføres på grund af miljøets CA/proxy; den nye udgave skal kontrolleres live efter godkendt deployment. Fysisk iPhone/Safari og hardwareaccelereret GPU er ikke testet her.

Cloudmiljøet blev utilgængeligt efter push af kode og rapportudkast. Afslutningen sker gennem GitHub med normale, kontrollerede fast-forward-commits. Den afsluttende lokale arbejdstræstatus kan derfor ikke bekræftes. Ingen force-push eller historikomskrivning er brugt.

## Fremover, efter godkendt merge

- Merge normalt til `main`; CI vælger automatisk fælles kontrol, relevante spil eller fuld regression. Ukendte ændringer og fælles kernemoduler får omfattende kontrol.
- Dokumentation alene kontrolleres uden build/deploy.
- Brug **Fuld regression og PR-kontrol → Run workflow** til fuld manuel funktionel kontrol. Natlig kontrol aktiveres på default-branchen efter merge. Performance og store visuelle optagelser køres særskilt via deres eksisterende npm-scripts mod de ønskede versioner.
- Brug **Udgiv Læringsstier på GitHub Pages → Run workflow**, branch `main`, ved en fuld manuel udgivelse. Alle påkrævede kontroller skal bestå før deploy.
- Lokalt: `npm ci`, `npm test`, `npm run build`, `npm run test:browser:smoke`. `npm run test:browser` inkluderer den fulde funktionelle pakke og starter egne Pages-testservere.

2–5/5–10-minutters udgivelser skal fortsat efterprøves på den godkendte produktionsworkflow. De målte gevinster i CI og checkout er konkrete; ingen ny offentlig udgivelse påstås.

[Baseline](01-baseline.md) · [Kodeaudit](02-kodeaudit.md) · [Ubrugt kode](03-ubrugt-kode.md) · [Dubletter](04-dubletter.md) · [CI/CD](05-ci-cd-optimering.md) · [Arkivplan](06-arkiveringsplan.md) · [Tests](07-testresultater.md) · [Målinger](08-performance-foer-efter.md) · [Alle ændringer](09-aendringsoversigt.md).
