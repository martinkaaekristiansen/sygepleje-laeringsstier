# Fase B.1 – performanceoptimering

Arbejdsbranch: `forbedringer-fordoejelse`. Implementeringsgrundlag: fase A-commit `a664d434e9773c9d3cccbbbd0421af8b577cb207`. Fase B og B.1 er godkendt af brugeren den 17. november 2026 og gemmes samlet med commit-beskeden `Fase B: Anatomiske 3D-forbedringer og performanceoptimering`. Fase C er ikke påbegyndt.

## Resultat ved samme kamera og opløsning

Den afsluttende sammenligning bruger spillets faktiske `mountDigestion` og 3D-renderer med en isoleret progress record: Stanley ved route-spørgsmålet i jejunum. Samme indledende kamera, FOV 74°, DPR 1, pixelratio 0,8, lyd fra og bevægelse til. Chromium/ANGLE/SwiftShader udfører software-rendering. Der køres kun én målevariant ad gangen, fem sekunders opvarmning og to runder med 90 billedintervaller pr. variant og skærmstørrelse. Testens faste pixelratio erstatter kun budgetmodulet i browserens netværkssvar; spillets normale automatiske tilpasning er bevaret.

| Måling | Mobil før | Mobil efter | Desktop før | Desktop efter |
|---|---:|---:|---:|---:|
| Vindue | 390 × 844 | 390 × 844 | 1280 × 800 | 1280 × 800 |
| Renderbuffer | 312 × 675 | 312 × 675 | 1024 × 640 | 1024 × 640 |
| Median FPS | 2,86 | 3,33 | 1,76 | 2,00 |
| Median billedtid | 350,0 ms | 300,0 ms | 566,6 ms | 500,0 ms |
| Gennemsnitlig billedtid | 371,2 ms | 311,0 ms | 578,3 ms | 522,2 ms |
| 95-percentil billedtid | 1333,2 ms | 883,3 ms | 1499,9 ms | 1100,0 ms |
| Trekanter, repræsentativ median | 288.628 | 256.988 | 289.636 | 257.852 |
| Tegnekald, interval | 52–58 | 60–66 | 57–62 | 65–70 |
| Villi i scenen | 3.200 | 3.200 | 3.200 | 3.200 |

FPS stiger **16,7 % på mobil** og **13,3 % på desktop**. Median billedtid falder henholdsvis 14,3 % og 11,8 %. Det er en moderat, gentaget forbedring; software-renderingen er fortsat langsom. Resultaterne siger ikke, hvor hurtigt en fysisk telefon eller hardwareaccelereret desktop kører.

FPS er 1000 divideret med medianen af de samlede 180 billedintervaller. Trekanttal er medianen af de to runders medianer; enkelte partikler kommer ind og ud af synsfeltet, så rendererens tællere varierer. Kamera, buffer, pixelratio og villusantal er kontrolleret ens i alle runder. Rå intervaller, tællerintervaller, kameradata og rendereridentitet findes i `fase-b1/before-1.json`, `before-2.json`, `after-1.json` og `after-2.json`. Sammenfatning og kildefingeraftryk findes i [performance-summary.json](fase-b1/performance-summary.json).

## Beholdte ændringer

- **Statiske geometrigrænser genbruges.** `computeBoundingSphere()` udføres ikke længere ved hver diagnostisk projektion. Oesophagus får fortsat opdateret sine bounds, når peristaltikken faktisk deformerer væggen, før rendering.
- **Overflødige matrixopdateringer fjernes.** Rendererens opdaterede scene-/kameramatricer bruges direkte. Kameraets projektionsmatrix opdateres ved resize i stedet for hvert billede.
- **Generel diagnostik begrænses til højst fem gange i sekundet under løbende animation.** Sceneskift og trækbetjening markerer data til opdatering ved næste rendering; stillestående scener opdateres også. Synkepose og fysiologiske lydhændelser følger fortsat animationen. Ingen læringstekst eller inputfunktion afhænger af den langsommere diagnostik.
- **Villi opdeles i otte længdesektioner og tre afstandsniveauer.** Instancing bevares. Three.js kan fravælge sektioner uden for synsfeltet. Bounds er udvidet til også at rumme shaderens bølgebevægelse. Alle villusrødder findes fortsat i scenen, også når kameraet drejes bagud.
- **LOD ændrer kun polygonantal.** Afstandsgrænser er 3,5 og 6 sceneenheder fra stationens kamera. Høj kvalitet bruger afrundede kapsler med henholdsvis `(4,10)`, `(3,8)` og `(2,6)` cap-/radialsegmenter; det eksisterende begrænsede budget bruger `(3,8)`, `(2,8)` og `(2,6)`. Radius, længde, placering, farvevariation og shaderens langsomme faseforskudte bevægelse bevares.
- **Tyndtarmens væg frasorterer bagsider.** Fladernes forside vender ind mod lumen. 1.152 jævnt fordelte stråler fra de tre stationers kamerapositioner kontrollerer, at nærmeste synlige væg/fold er den samme med enkeltsidet og dobbeltsidet materiale. Øvrige organer beholder dobbeltsidet materiale. Lys, PBR-materialetype og slimhindetekstur er bevaret.

En særskilt instrumenteret CPU-måling over cirka 31 renderinger fandt 31 gentagne geometriberegninger før mod nul efter ved jejunum. De tog samlet 5,9 ms før, cirka 0,19 ms pr. rendering. Rodgruppens matrixkald faldt fra 62 til 31. Denne oprydning giver målbar reduktion i CPU-arbejdet, men gav isoleret ingen sikker FPS-gevinst i SwiftShader. Rå profiler findes i `fase-b1/experiments/profile-before.json` og `profile-cpu.json`.

Ved et separat **180° tilbageblik** på mobil faldt tegnede trekanter fra 146.496 til 93.376, cirka 36 %, med uændrede 3.200 villi i scenen. Tegnekald steg fra 2 til 4. Median FPS lå omkring 30 i begge varianter; gennemsnitlig billedtid faldt fra 46,4 til 35,0 ms. Dette viser sektionsopdelingens gevinst, når store dele af slimhinden er uden for synsfeltet; det er en separat kameravinkel og kan ikke sammenlignes direkte med hovedmålingens 3 FPS. Se `fase-b1/back-before.json` og `back-after.json`.

## Fravalgte forsøg

En indledende LOD-variant med fire vinkelsektorer gav omkring 92 tegnekald og kun en lille forbedring. Den er erstattet af længdesektionerne med lavere tegneomkostning. Et forsøg med Phong-materiale gav ikke tilstrækkelig gevinst til at retfærdiggøre ændret lysrespons. Forudberegnede sinus-/cosinuskoefficienter til bølge-shaderen forbedrede heller ikke den valgte model og er udeladt. Shaderens oprindelige bevægelsesberegning og PBR-materialer er derfor bevaret. Forsøgsmålinger ligger i `fase-b1/experiments/`; de er ikke de afsluttende før/efter-resultater.

## Anatomi og visuelle kompromiser

Duodenum har fortsat 2.200 villi, jejunum 3.200 og ileum 1.500. Der er ingen udtynding eller ændring i forankring, højde, radius eller bevægelsesparametre. Jejunums høje folder og lange villi samt ileums lavere folder, kortere villi og lymfoide væv bevares. Epiglottis/synkning, caecum, appendix, ileocøkalovergangen og kameravinklerne er ikke ommodelleret.

Det visuelle kompromis er lavere tessellering af fjerne villi: små silhuetter kan blive lidt mere facetterede ved kraftig forstørrelse af et screenshot. De nærmeste villi beholder fase B's afrundede detaljegrad ved det pågældende budget. Sektionsopdelingen øger tegnekald lidt, men forbedrer samlet performance i målingerne. Der er ikke indført yderligere sænkning af renderopløsningen: den automatiske tilpasning starter fortsat ved enhedens budget og har samme minimum på 0,8.

De tre molekylerejser, progression, kropskort, lyd, indstillinger, knapvalg, gemte fremskridt og testindhold er bevaret. `performance-summary.json` angiver de centrale filer, som er byte-identiske med fase B.

## Screenshots

Åbn [før/efter-galleriet](fase-b1/galleri.html). Der er 12 PNG-filer: duodenum, jejunum og ileum før/efter på desktop og emuleret mobil. Kamera og pixelratio er ens; billederne bruger samme stillestående animationspose. Performance måles separat med animationerne slået til. Svarenes rækkefølge kan variere på grund af spillets normale blanding af svarmuligheder.

## Tests

- `npm test`: **137 bestået, 0 fejl**, inklusive alle eksisterende Node-tests og tre nye B.1-tests for villusantal/forankring/bounds, konservativ frustum-culling gennem en hel kamerarotation, kvalitetsbudgettets minimum/genopretning samt synlige vægflader ved backface-culling.
- `npm run build`: **bestået**, inklusive JavaScript-syntakskontrol og vendor-integritet.
- `tests-browser/digestion.cjs`: **bestået**, alle tre molekylerejser på desktop og emuleret mobil, 15 stop, korrekte/forkerte svar, retry, absorption, sluttest/repetition, lagring/genoptagelse, trofæer og WebGL-fallback.
- `tests-browser/digestion-phase-a.cjs`: **bestået**, desktop/tablet/mobil/landskab, kompakt layout, stabile enzym-/ikonidentiteter, ingen svar ved klik på canvas, bevaret trækbetjening og to anatomiske svarknapper.
- `tests-browser/digestion-phase-b.cjs`: **bestået**, hvile/synkning, 1.500–3.200 villi, faktiske screenshots på desktop/mobil, stabilt kamera og tilbageblik via mus/touch; ingen JavaScript-/shaderfejl. Den separate automatiske mobilmåling gav 3,3 FPS ved ratio 0,8.
- `tests-browser/digestion-audio.cjs`: **bestået**, desktop/mobil, brugeraktivering, faktisk gain, tygge-synkronisering, mute, læsepause, oprydning og manglende AudioContext.
- `tests-browser/game-viewport.cjs`: **bestået**, desktop/mobil, start/genoptagelse, rotation, kontroller, indstillinger, scroll lock og oprydning.
- `git diff --check`: **bestået**.

Den første lydtest ramte en timingafhængig gain-assertion. Testen ventede på en tyggehændelse, som kunne være registreret tidligere, og læste derefter en AudioParam med en glidende gain-overgang. Testen venter nu med en timeout på den faktiske målte gainværdi; de eksisterende grænser/assertions er bevaret. Den fulde lydtest er derefter bestået. Produktionskoden til lyd er uændret.

Konsolresultaterne fra de afsluttende tests er samlet i [test-results.txt](fase-b1/test-results.txt).

## Reproduktion

Start serveren med `PORT=3001 npm run dev`. Browser-testen bruger `playwright`; miljøet her anvender `PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright` og `CHROMIUM_PATH=/usr/bin/chromium`.

```sh
APP_URL=http://127.0.0.1:3001/ PERF_LABEL=before PERF_CAPTURE=0 \
PERF_WORLD=docs/codex-fordoejelse/fase-b1/reference/digestion-world.js.txt \
PERF_MUCOSA=docs/codex-fordoejelse/fase-b1/reference/digestion-mucosa.js.txt \
npm run test:browser:digestion-performance

APP_URL=http://127.0.0.1:3001/ PERF_LABEL=after PERF_CAPTURE=0 \
npm run test:browser:digestion-performance
```

Gentag hver variant to gange uden samtidig belastning fra andre browser-tests. Standard er 90 billedintervaller, fem sekunders opvarmning og begge vinduesstørrelser. `PERF_CAPTURE_ONLY=1 PERF_REGIONS=duodenum,jejunum,ileum` tager de statiske sammenligningsbilleder. `PERF_YAW=3.141592653589793 PERF_SIZES=mobile` gentager tilbageblikket. Referencemodulerne er kopier af de lokale fase B-filer før B.1 og indlæses kun af testens netværksinterception.

## Filer ændret i B.1

Produktionsændringerne i B.1 er begrænset til `public/digestion-world.js` og `public/digestion-mucosa.js`. Derudover er `package.json` og lydtestens ventebetingelser opdateret, og der er tilføjet `test/digestion-performance.test.js`, `tests-browser/digestion-performance.cjs` samt denne dokumentation. Fase B's øvrige lokale kodeændringer ligger fortsat oven på fase A-committet; de er ikke nye B.1-ændringer.
