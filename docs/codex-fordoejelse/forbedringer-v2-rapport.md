# Fordøjelsens vilde rejse – forbedringer v2

Arbejdsbranch: `forbedringer-fordoejelse-v2`, oprettet direkte fra den seneste `origin/main` den 18. november 2026: `fc1d75442d0368fb97e97bd000ccb8ed8e13bb84`. De ældre udviklingsbrancher er ikke brugt som kodegrundlag. Brugeren har godkendt denne version til integration og udgivelse via `main`. Kontrollerne og de historiske Git-oplysninger nedenfor dokumenterer arbejdsversionen før udgivelsen.

## Spilforløb og læringsinformation

Alle særskilte animationspaneler og deres replay-/skip-handlers er fjernet. Animationer starter og afsluttes automatisk. Anatomiske, enzymatiske og absorptionsrelaterede spørgsmål kræver fortsat et aktivt svar på en knap. Pause, indstillinger, gemt rejse, sluttest og fejlrepetition fungerer fortsat.

Sekvenser har én annullerbar timer med generationskontrol. Ved bevægelse er den renderede scenetid afgørende: en langsom frame kan ikke få controlleren til at fortsætte, inden sluttilstanden er vist. Reduceret bevægelse viser en stabil pose og bruger en pauserbar læsetid. Sceneopbygning tæller ikke som afspillet animationstid. En genoptaget sekvens bruger sin gemte alder. Introens varighed er den samme ved ny start og genoptagelse.

Den eksisterende informationsboks har fået en kort overskrift og den vigtigste molekylespecifikke forklaring. Synkning, enzymvirkning, pH, galde, absorption og transport bevares. Supplerende tekst gemmes i læringsloggen og er tilgængelig i afslutningens eksisterende afsnit om enzymer og transport. Tekst ved spørgsmål bliver stående indtil en relevant læringshændelse. Korte automatiske forløb har korte forklaringer; eksempelvis har synkningen en kort opsummering, mens den fulde forklaring bevares i oversigten.

Informationsfelt, kropskort og svarpanel deler den tilgængelige plads på små skærme. I portræt reserveres kortets målte højde; på korte landskabsskærme ligger informationsfeltet ved siden af kortet. Spørgsmålets overskrift får tastaturfokus efter en automatisk overgang. Forklaringer og feedback kræver ikke lyd.

## Mavesækken og 3D

Den tidligere x-baserede projektion satte den negative x-side uden for bevægelsens aktive område. Den er erstattet af et kontinuerligt felt omkring en bøjet akse fra fundus/corpus mod antrum og pylorus. For- og bagside får samme længdekoordinat ved samme x/y-position.

Proximale områder har lav, langsom tonus-/accommodationsbevægelse. Den tydeligere peristaltiske bølge vokser mod antrum/pylorus. Perioden er 20 sekunder i undervisningsmodellen. Tracere viser fremadgående bevægelse, retropulsion og intermitterende passage ved pylorus. Der er ikke indført en væske- eller tryksimulation.

Mavevæg og alle 16 afrundede slimhindefolder deformeres med samme felt. Folderne overlapper væggen ved deres tilhæftning. Normale vektorer følger deformationens inverse transponerede Jacobimatrix, så lys og afrunding følger væggen. Regressionstests kontrollerer positiv Jacobideterminant og fysisk kontakt mellem folder og væg fra begge sider ved udvalgte faser gennem en kontraktionscyklus. Statiske bounds beregnes ved opbygning og indeholder en sikker margen til bevægelsen.

Foldernes uændrede triangulering samles i ét mesh i stedet for 16. Mavesækkens særlige normalshader har sin egen cache-nøgle, så den ikke kan genbruges til andre organer. Bølgebredden er en compile-time-konstant og tilføjer ikke en ny uniformdivision i de øvrige organers vertexshadere.

Eksisterende villi, deres LOD og længdesektioner med frustum culling er bevaret. Jejunum har fortsat 3.200 villi. Duodenum, jejunum og ileum har deres forskellige former og tætheder. Epiglottis, caecum, appendix, molekyler, enzymer og de eksisterende kameraer er bevaret. Automatisk renderopløsning er uændret, inklusive gulvet på 0,8 og muligheden for at hæve kvaliteten igen.

## Gemning, genoptagelse og sluttest

Periodiske checkpoints er ændret fra ét sekund til 15 sekunder. Svar, stationsskift, sekvensstart/-afslutning, gennemførsel, indstillinger, pause, skjult dokument og pagehide gemmer fortsat straks. Pageshow genoptager den pauserede tidsstyring. Aktiv tid bruger en monoton sessionsklokke og inkluderer ikke tid i en lukket eller pauseret side.

Appens eksisterende snapshots og serialisering i `app.js`/`storage.js` er bevaret. En fordøjelsesspecifik kø samler overlappende ønsker til den seneste tilstand og har højst én udestående gemmekaldsoperation. En ældre asynkron skrivning kan derfor ikke afslutte efter og overskrive en nyere skrivning. Fejl bevarer retry-muligheden. Også mavesækkens kontinuerlige bevægelsesfase kan genoptages.

Hvert næringsstof har 12 spørgsmål, hvoraf fem udvælges uden dubletter. Nye ID-baserede forsøg får en anden samling end ved det umiddelbart foregående ID-baserede forsøg. Nye spørgsmål omfatter pH, pankreasfunktion, galde, transportproteiner, zymogener og konsekvenser af malabsorption. De kombinerer faktaviden, forståelse og anvendelse.

De fem valgte, stabile spørgsmåls-ID'er gemmes sammen med udkast og resultat. Historiske resultater og gamle udkast uden ID'er beholder den oprindelige, frosne femspørgsmålsrækkefølge. Fejlrepetition bruger præcis det oprindelige forsøgs spørgsmål og ændrer ikke det oprindelige resultat. Repetition kan også genoptages midt i feedback uden at registrere det samme korrekte svar igen.

Sekvensstyring, gemmekø, spørgsmålspulje/-validering og sluttestens visning har hver deres modul. `mountDigestion()` og integrationen med resten af hjemmesiden er bevaret. Ingen andre læringsspils kildefiler er ændret.

## Testresultater

| Kontrol | Resultat |
| --- | --- |
| Alle eksisterende Node-tests og 15 nye regressionstests | **159 bestået, 0 fejl** |
| Build og `git diff --check` | Bestået; build `assets/1fe709894b12` |
| Alle tre molekylerejser fra start til slut på desktop og mobil | Seks fulde rejser bestået |
| Genoptagelse under 11 forskellige animationsforløb, begge skærmtyper | 22 bestået; ingen ekstra point eller automatiske svar |
| Pause, pagehide, aktiv tid og gemt mavefase | Bestået med reelle IndexedDB-checkpoints |
| Nye sluttests, reload, resultat, fejlrepetition og gamle udkast | Bestået for alle tre næringsstoffer |
| Lange quizspørgsmål og feedback ved ni viewports | 54 kontroller bestået |
| Anatomiske svar, enzymidentitet og lange kildebeskrivelser | 28 layoutkontroller bestået |
| Eksisterende fysiologiske animationer, portal-/lymfevej og alle tre afslutninger | Bestået på desktop/mobil samt 320 × 568 og 844 × 390 |
| Lyd, mute, pause, oprydning og manglende AudioContext | Bestået på desktop/mobil og uden understøttet lyd |
| Fælles viewport, navigation, fokus, backup/gendannelse, opgradering og indhold | Eksisterende browserregressioner bestået |
| Mavevæg/folder fra modsatte kameraer | 201 billedposer, fem billedpar og MP4 uden shader-/sidefejl |
| Modulafhængigheder og byggeassets | 72 lokale moduler uden cirkler; HTML og alle 79 assets stemmer byte-for-byte over HTTP |

Layout er kontrolleret ved 320 × 568, 375 × 667, 390 × 844, 568 × 320, 667 × 375, 844 × 390, 768 × 1024, 1024 × 768 og 1280 × 800. Tastaturbesvarelse med Enter, fokus efter automatiske overgange, reduceret bevægelse, lydfri brug, canvas uden svarregistrering og fortsat kameratræk indgår. De komplette afsluttende resultater og kommandoer findes i [testloggen](forbedringer-v2/test-results.txt).

Node-regressionerne dækker blandt andet afbrudte sekvenser uden parallelle timere, billedstyret afslutning, serialiseret/coalescet gemning, fejl og seneste tilstand, gamle og nye tests, afmontering under asynkron gemning, positiv Jacobideterminant og foldernes kontakt med væggen fra begge sider. De oprindelige testkrav er bevaret; browserforventninger til manuelle replay-/fortsætknapper er erstattet af kontrol af automatisk afslutning.

## Performance

Måleprotokollen bruger samme scenetype, kameravinkel, viewport, device pixel ratio 1, renderpixelratio 0,8 og måleprogram for før og efter. Mavesæk og jejunum måles ved 390 × 844 og 1280 × 800 pixels. Renderopløsningen låses kun i benchmarken; animationerne fortsætter. 60 frameintervaller registreres efter opvarmning, inklusive median, gennemsnit, p95, trekanter, tegnekald, bufferstørrelse og renderer. To før-/efterrunder gennemføres sekventielt uden andre samtidige GPU-tests. Lagring måles særskilt med reelle IndexedDB-transaktioner.

Testmiljøet bruger **SwiftShader, ikke hardwareaccelereret WebGL**. Chromium valgte også SwiftShader uden et tvunget softwareflag, og miljøet har ingen tilgængelige `/dev/dri`-rendernoder. Tallene er softwaremålinger ved desktop- og mobilviewport; de er ikke FPS fra en fysisk mobil eller GPU. Se [hardwarekontrol](forbedringer-v2/hardware-probe.json).

Tal nedenfor bruger medianen af de to runders medianbilledtider; FPS beregnes som 1.000 divideret med denne tid. Hver runde har 60 animerede frameintervaller pr. scene og viewport.

| Scene og viewport | FPS før → efter | Billedtid, ms før → efter | Trekanter før → efter | Tegnekald før → efter |
| --- | --- | --- | --- | --- |
| Mavesæk · 390 × 844 | 10,00 → 10,00 | 100,0 → 100,0 | 26196 → 26196 | 51 → 36 |
| Mavesæk · 1280 × 800 | 3,75 → 3,75 | 266,6 → 266,7 | 27052 → 27052 | 53 → 38 |
| Jejunum · 390 × 844 | 3,16 → 3,24 | 316,6 → 308,3 | 252684 → 252684 | 45 → 45 |
| Jejunum · 1280 × 800 | 2,00 → 2,00 | 500,0 → 500,0 | 252684 → 252684 | 45 → 45 |

Der er **ingen dokumenteret stabil FPS-forbedring** i software-renderingen. De små forskelle ligger på niveau med variation mellem kørsler. Mavesækken bruger imidlertid **15 færre tegnekald pr. frame**, svarende til cirka 28–29 %, med samme antal trekanter. Jejunums 3.200 villi, 252.684 synlige trekanter og 45 tegnekald er uændrede. Opløsning, buffer, kamera og geometrimængde er kontrolleret ens i alle runder.

Den reelle lagringskontrol i samme stillestående mavescene viser **31 → 2 IndexedDB-skrivetransaktioner på 31 sekunder**, cirka **94 % færre**. Dette måler selve lagringen. FPS-benchmarken bruger en isoleret gemmefixture, så de færre skrivninger ikke kan bruges som forklaring på dens FPS-tal.

Der er ikke fjernet anatomi, villi, afrunding, tekstur eller læringsanimationer for at øge hastigheden. De eksisterende sektionsopdelte slimhinder, culling, LOD, begrænsede diagnostikopdateringer og automatiske renderbudget er bevaret. Den nye mavespecifikke geometri- og normalberegning forberedes ved opbygning; den er nødvendig for den sammenhængende deformation. Flere generelle grafikreduktioner er undladt, da de ikke er underbygget af disse målinger og kan forringe detaljerne. Mavesækkens ændrede folder og tracere er faglige visualiseringsrettelser; inspektionsvideoens gennemsigtighed er alene et dokumentationsgreb.

SwiftShader er fortsat meget langsom, især i jejunum. Før en senere udgivelse bør spillet afprøves på en fysisk iPhone og en computer med faktisk GPU-acceleration. Ingen FPS fra en fysisk enhed kan udledes af denne måling. [Samlet måledatasæt](forbedringer-v2/performance-summary.json) og [rå runder](forbedringer-v2/performance/) indeholder de to runders medianer, gennemsnit, p95 og frameintervaller.


## Billeder og video

[Billedgalleri](forbedringer-v2/galleri.html) samler spillets infoboks, den modsatte indvendige kameravinkel, den tosidede modelkontrol og sammenlignelige før-/efterbilleder.

[Mavevideo](forbedringer-v2/mave-kontraktioner-to-sider.mp4) viser produktionsgeometrien og bevægelsesmodellen fra to modsatte kameraer. Væggen er gjort gennemsigtig i modelkontrollen for at vise folder og indhold. Videoen er renderet billedvis og kodet til 10 FPS; dette er **afspilningshastighed og ikke en måling af spillets hastighed**. Spillets almindelige kameravinkler og materialer er uændrede af denne kontrol.

## Begrænsninger og faglig kontrol

Der er ikke udført test på en fysisk iPhone eller i Safari/Metal. Ved en brat browserlukning, procesfejl eller strømafbrydelse kan de seneste op til cirka 15 sekunders aktiv spilletid siden seneste checkpoint gå tabt, hvis browseren ikke når at afslutte livscyklusgemningen. Besvarelser og stationsskift gemmes fortsat straks. De anatomiske modeller og amplituder er undervisningsskalerede. Spillet simulerer ikke tryk, fuld væskedynamik eller alle gastrointestinale reguleringsmekanismer. Indholdet er ikke en erstatning for kliniske instrukser eller en ekstern fagpersons godkendelse.

Faglige kontrolkilder:

- [OpenStax, Chemical Digestion and Absorption](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-7-chemical-digestion-and-absorption-a-closer-look): enzymer, substrater, børstesøm samt forskellen på portal og lymfatisk transport.
- [OpenStax, The Stomach](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-4-the-stomach): mavesækkens regioner, sekretion og mekaniske blanding.
- [University of Michigan, Gastric physiology, John Williams](https://open.umich.edu/sites/default/files/downloads/j.williams.giphys.4-stomach-38-65-notes.pdf): proximal receptiv relaxation samt distal blanding og peristaltik.
- [NCBI Bookshelf, Physiology, Nutrient Absorption](https://www.ncbi.nlm.nih.gov/books/NBK597379/): supplerende kontrol af membrantransportens begreber; fuldtekst var ikke tilgængelig i webværktøjet ved kontrollen.

## Filer og gentagelse af kontrollen

- [Testlog og kommandooversigt](forbedringer-v2/test-results.txt).
- [Genoptagelser og lagringsmåling efter ændringen](forbedringer-v2/browser-checkpoints.json).
- [Lagringsmåling før ændringen](forbedringer-v2/storage-before.json).
- [Byggefiler og HTTP-/SHA-256-kontrol](forbedringer-v2/build-assets.json).
- [Modulafhængigheder uden cirkler](forbedringer-v2/module-graph.json).
- [Kodefiler og kildegrundlag](forbedringer-v2/source-audit.json).
- [Rå målinger og sammenligningsbilleder](forbedringer-v2/performance/).

Kør `npm test`, `npm run build` og `git diff --check` fra projektroden. Browserkontroller og benchmarks bruger projektets Playwright 1.56.1 og Chromium 141. Den særskilte kontrol uden tvunget software-rendering bruger systemets Chromium 155. Sæt `APP_URL` til serverens projektadresse; de afsluttende rejse-, lyd-, layout- og integrationstests kører mod det byggede Pages-format med `/sygepleje-laeringsstier/` som præfiks. Den nye genoptagelsessuite køres med `npm run test:browser:digestion-v2`; de øvrige relevante scripts er angivet i testloggen.

Benchmarken bruger `tests-browser/digestion-performance.cjs` med `PERF_REGIONS=stomach,jejunum`, `PERF_SAMPLES=60`, `PERF_RATIO=0.8`, `PERF_LABEL` og `PERF_OUTPUT`. Kør én variant ad gangen mod kildefilerne fra henholdsvis det urørte main-checkout og v2-checkoutet. Anden runde bruger `PERF_CAPTURE=0`. Benchmarkens fixture låser kun renderopløsningen og bruger en isoleret progression; selve animationen fortsætter. Lagringstransaktioner indgår derfor ikke i FPS-målingen.

Åbn `forbedringer-v2/galleri.html` lokalt sammen med den tilhørende billedmappe for at gennemgå billeder og video. Galleriet og rapporten er dokumentation i arbejdsbranchen og er ikke offentliggjort på GitHub Pages.
