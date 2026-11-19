# Fordøjelsens vilde rejse – sammenhængende verden og grundlæggende absorption

## Arbejdsgrundlag og status

Udgangspunktet er den seneste hentede `origin/main`, commit **`d7130f8d0298ad6b6c3db9f3e49991c6279b53a6`**, 19. november 2026. Arbejdsbranchen **`fordoejelse-sammenhaengende-verden`** blev oprettet direkte herfra. Brugeren har den 19. november 2026 godkendt den visuelle gennemgang og udgivelse på `main`. Kontroloversigten nedenfor er det daterede øjebliksbillede fra gennemgangen før godkendelsen. Udgivelsen bruger samme godkendte spilkode og build.

[Åbn den samlede visuelle gennemgang](sammenhaengende-verden/galleri.html). Billeder kan også åbnes enkeltvis i mappen `sammenhaengende-verden/`. Galleriet bruger relative lokale links og kræver ingen eksterne tjenester. Browsernes målinger og kontrolresultater ligger som JSON ved siden af billederne.

## Fase 1 – analyse

Den tidligere implementering brugte én renderer, men udskiftede den lokale anatomi ved stationsskift. En canvas-fade skjulte udskiftningen, og kameraet fik en ny lokal pose. Det forhindrede tilbageblik gennem den tidligere anatomi. Pharynx/epiglottis brugte desuden en ekstern synkevinkel.

Enderingene var ikke indbyrdes kompatible: blandt andet havde caecums ileumindgang 28 kantpunkter og udgangen mod colon 96. Mavesækkens gamle pylorusudskæring havde kun fire kantpunkter. Absorptionen brugte en udskåret væg, et absorptionsvalg og en efterfølgende kar-/transportscene. Disse aktive forløb er erstattet; historiske resultater og nødvendige migreringsfunktioner bevares.

## Fase 2 – sammenhængende anatomi

`digestion-tract.js` placerer **14 fysiske organsegmenter og 13 forbindelser** i samme koordinatsystem. Epiglottis er et observationspunkt i pharynx, ikke sit eget rør. Appendix er fortsat caecums lukkede sidegren og indgår ikke i kameraruten.

`digestion-ports.js` finder de faktiske grænsekanter og forbinder ringe med forskelligt antal punkter. Geometrien deler præcise verdenspositioner langs sømmene. Normaler udjævnes ved de svejsede overgange. Kun mundens og anus' naturlige ender er åbne i hovedkanalen. Cardia og pylorus har egentlige afrundede vægåbninger; den anatomiske pyloruslukke følger åbningen og åbner ved kamerets passage. Den er ikke en navigationsring.

Alle organer, overgange og afslutningsmiljøet bygges én gang og bliver i samme scene. Kun aktuelle undervisningsobjekter udskiftes. Slimhinde, plicae, villi, mavesækkens rugae, haustra og blind caecalbund er bevaret. Villi står på de faktiske buede folder, også i forbindelserne. Duodenum har **4.840**, jejunum **3.200** og ileum **1.500** villi; forbindelserne duodenum–jejunum, jejunum–ileum og ileum–caecum har yderligere henholdsvis **1.433, 1.260 og 536**. Afrundede toppe, regional højde/foldtæthed og den langsomme bølgning bevares.

Topologi, orientering og sømme kontrolleres med den samlede geometri. Kameraruten testes mod alle vægge, også vægge fra andre organer. En separat test kontrollerer ileocøkalventilens bevægelige læber under passage.

## Fase 3 – indvendigt kamera og synkning

`digestion-route-camera.js` styrer kameraet efter buelængde langs én rute på cirka **493 verdens-enheder**. Retningen følger krumningen, og en transporteret op-vektor undgår pludselig rulning. Mus og touch drejer fortsat kameraet. Ved spørgsmål står grundpositionen stille; stationsskift flytter kameraet kontinuerligt uden fade eller teleportering.

Både frem- og tilbageblik bruger samme anatomi. En naturlig bøjning kan afskærme næste organ: verden bliver ikke gjort gennemsigtig for at vise noget bag en væg. Galleriet viser alle samlinger i begge retninger og særskilte kig mod mavesækkens to porte.

Synkemodellen genbruger tunge, larynxløft, epiglottis, stemmelæber og øvre oesophaguslukke. Kameraet bliver på fødevejen og følger synkningen ind mod oesophagus. Luftvejsbeskyttelsen vises med de koordinerede bevægelser, ikke alene epiglottis som låg. Hvile, lukning, passage og genåbning er dokumenteret i billedsekvensen. Den indvendige synsvinkel og synligheden af både blad og stemmelæber kontrolleres også ved smal mobilvisning.

Gemte kameraoplysninger indeholder ruteversion, aktuel afstand, fra-/målafstand, rejsetid, fysiologisk tid samt brugerens yaw/pitch. En afbrudt ny rejse genoptages fra samme sted. Gamle gemninger uden fysisk ruteafstand placeres ved den tilsvarende anatomiske station; deres tidligere lokale kamerakoordinater kan ikke overføres direkte til den nye verden. Pause standser både kamera og animationstid. Menu/start nulstiller kameraet til den nye rejses begyndelse.

## Fase 4 – fordøjelse og automatisk absorption

### Kulhydrat og protein

`digestion-uptake.js` finder kontaktpunkter ved raycast mod den **solide, ugennemsigtige jejunumvæg**. Glukose eller aminosyrer/små peptider bevæger sig mod disse punkter, følger væggens aktuelle bevægelse og skjules først, når de er passeret gennem epitelet. Optagelsen sker dermed ved slimhinden og ikke midt i lumen. Kontaktpunkterne tilpasses kameraets billedfelt, også på mobil.

### Fedt: emulgering, spaltning, miceller og aflevering

1. En stor dråbe opdeles i tolv mindre dråber med bevaret samlet modelvolumen. Galde ændrer ikke molekylbindinger.
2. Den bevarede lipaseopgave efterfølges af lipase ved fedt-vand-grænsefladen. Triglyceridmodellen spaltes til frie fedtsyrer og monoglycerid.
3. Galdesalte organiserer sig omkring de identificerbare fedtsyrer og monoglycerider. Micellerne indeholder ikke hele triglycerider. Triglyceridets tre kæder og monoglyceridets ene kæde kan skelnes visuelt.
4. Micellerne når væggen. Produkterne afleveres og passerer epitelet; galdesaltene bliver i lumen. De resterende saltmodeller bevares også efter det automatiske perspektivskift.

Emulgering, lipase og micelledannelse er opdelt pædagogisk. Spillet oplyser samtidig, at processerne overlapper i kroppen. Galde fremstilles ikke som et enzym.

### Tekster, progression og fagligt niveau

Alle de syv ønskede korte forklaringer er samlet i `BASIC_TEXT` og vises i den eksisterende infoboks. Den afsluttende tekst er præcis:

> Næringsstoffet er nu optaget gennem tarmvæggen. Du følger i stedet en ufordøjelig rest videre gennem fordøjelseskanalen.

**Absorptionsspørgsmål, absorptionsknapper, separate blod-/lymfescener og det centrale perspektivskiftpanel er fjernet fra det aktive spil.** Der er ingen animationsrelateret Fortsæt- eller Se animationen igen-knap. Resten følger automatisk videre, når animationen er slut; de normale anatomiske spørgsmål fortsætter gennem ileum, caecum, colon, rectum og anus.

Nye sluttests bruger grundbegreber frem for SGLT1, GLUT2, PEPT1 og chylomikroner. Gamle spørge-ID'er og historiske besvarelser bevares til korrekt pointfortolkning. Ubesvarede avancerede spørgsmål i gamle kladder samt nye gentagelsesforløb får grundlæggende erstatningsspørgsmål. Historiske scorer omskrives ikke. Tidligere læringslog arkiveres; det nye aktive forløb har forklaringer på det aftalte niveau.

Alle tre molekylerejser, anatomiske spørgsmål, relevante enzymopgaver, liv, point, lyd, pause, gemning/genoptagelse og sluttest er bevaret. Gamle gemninger ved transport-/absorptionsmilepæle migreres til det automatiske forløb uden ekstra point. En allerede afsluttet eller igangværende restrejse nulstilles ikke ved migrering.

## Anatomiske og visuelle kompromiser

- Verdensskalaen er skematisk, ikke centimeter eller en simulering af fysiologisk transittid. Den samlede tarm er komprimeret, og længdeforhold mellem tyndtarm og colon gengiver ikke menneskets faktiske meterforhold.
- Duodenums C-centerlinje er forlænget med faktor 2,2 uden at forøge lumenradius. Villiantallet er øget tilsvarende for at bevare tætheden. Sigmoideums aksiale udstrækning er ligeledes øget med faktor 2,2 for at give kameraet en sikker kurve. Anatomisk rækkefølge, C-form, regionale folder og haustra bevares.
- Åbninger og overgangsforløb er tilpasset en gennemgående førstepersonsrute. Mavesækkens åbninger er forstørret/afrundet i forhold til de gamle udskæringer. Modellerne er undervisningsmodeller, ikke patientbaseret rekonstruktion.
- Peristaltikkens deformation dæmpes lokalt ved faste samlingskraver, så geometrien ikke åbner sig. Proximal og distal mavesæk beholder forskellige bevægelsesprofiler over den øvrige væg, folder og indhold.
- Molekyler, fedtdråber, miceller og villi bruger forskellige pædagogiske størrelsesskalaer. Ingen af dem skal aflæses som indbyrdes målestoksforhold.
- Software-rendering begrænser billedhastigheden i testmiljøet. Det er ikke en hardware-/iPhone-måling. Rigtig iPhone/Safari skal fortsat afprøves ved visuel godkendelse.

## Fase 5 – optimering og performance

### Teknik og kontrol af billedkvalitet

Geometri, Frenet-rammer, samlingskraver, vægnormaler og villi-instansmatricer beregnes ved opbygningen. Statiske objektmatricer fryses; bevægelige synkestrukturer og undervisningsobjekter opdateres fortsat. Slimhinde og villi bevæges i vertex-shaderen. Kun de få optagelsespunkter følges på CPU'en. Diagnostik opdateres højst cirka fem gange i sekundet, og eksisterende automatisk kvalitetstilpasning med renderfaktorens bund på 0,8 bevares.

`digestion-visibility.js` bruger faktiske åbninger som konservative synlighedsporte. Tyndtarm og de tre slimhindeforbindelser deles logisk i otte sektioner. Hele geometrien og samtlige villi bliver i hukommelsen; skjulte villi-instansgrupper tegnes ikke. En ekstra nabosektion beskytter synlige villitoppe og bølgning ved grænserne. Vægge beholder dybdetest og er ikke gennemsigtige. LOD beholder afrundede toppe og alle rødder.

Pixelkontrollen sammenligner den samme nye verden med grov og fin culling, ved fast tidspunkt, kamera og renderfaktor. Der accepteres kun identiske PNG-filer; det er stærkere end en tolerant billedsammenligning. [Kontrolresultater](sammenhaengende-verden/occlusion/pixel-checks.json) og et repræsentativt billedpar ligger i galleriet. Den konservative margin kan i enkelte vinkler øge tegnemængden. Ved et kig tilbage gennem duodenum–jejunum tegnes cirka 51 % færre trekanter uden ændrede pixels.

### Målebetingelser

Baseline er den uændrede main ved `d7130f8d0298ad6b6c3db9f3e49991c6279b53a6`. Begge versioner kører i **Chromium 141.0.7390.37 / Playwright 1.56.1, ANGLE Vulkan SwiftShader (CPU/software)**. Miljøet har ingen `/dev/dri`-enhed, og målingerne dokumenterer ikke hardwareaccelereret WebGL eller en rigtig iPhone.

Der bruges samme organlokale kameraposition, sigtepunkt, op-vektor og 74° synsfelt, udtrykt i hver versions koordinatsystem. Det er en direkte world-renderfixture for Stanley med animation slået til; ileum følger resten. Hver kørsel får fem sekunders opvarmning og 60 målte RAF-intervaller. Kørsel sker sekventielt uden andre browsertests. DPR er 1 og renderfaktoren fastlåst til **0,8** i begge versioner. Viewport 1280 × 800 giver renderbuffer 1024 × 640; 390 × 844 giver 312 × 675. Parringskontroller verificerer viewport, DPR, buffer, renderfaktor og lokal kamerapose.

De tolv sammenligningsbilleder tages ved samme separate animationsfase, 5 sekunder, uafhængigt af målingens varighed. Duodenums geometri er omformet, så identisk lokal kameravinkel ikke betyder identiske pixels. Ingen anatomi eller materialer fjernes i måle-fixturen. Frametime nedenfor er median; gennemsnit, p95 og de rå intervaller findes i [målefilen](sammenhaengende-verden/performance/results.json).

### Før og efter hele ændringen

| Viewport / sted | FPS før → efter | Median ms før → efter | Trekanter før → efter | Tegnekald før → efter |
| --- | ---: | ---: | ---: | ---: |
| 1280 × 800 / duodenum | 2.00 → 2.00 | 499.9 → 499.9 | 209,764 → 309,784 | 51 → 49 |
| 1280 × 800 / jejunum | 2.07 → 1.82 | 483.4 → 549.9 | 251,384 → 313,140 | 19 → 28 |
| 1280 × 800 / ileum | 3.00 → 2.73 | 333.3 → 366.5 | 134,108 → 160,556 | 26 → 31 |
| 390 × 844 / duodenum | 4.62 → 3.16 | 216.6 → 316.7 | 199,624 → 309,784 | 50 → 49 |
| 390 × 844 / jejunum | 3.33 → 2.73 | 300.0 → 366.6 | 251,384 → 313,140 | 19 → 28 |
| 390 × 844 / ileum | 5.00 → 4.61 | 200.1 → 216.7 | 134,108 → 160,556 | 26 → 31 |

**Den nye verden er langsommere i fem af de seks softwaremålinger.** Desktop-duodenum er omtrent uændret; den største nedgang er mobil-duodenum, cirka 32 %. Her er den oprindelige C-centerlinje forlænget og villitætheden bevaret med 4.840 frem for 2.200 villi. Den samlede verden viser også tidligere/kommende anatomi, som den gamle stationsverden ikke havde. Jejunums egne 3.200 villi er bevaret, men forbindelser/naboanatomi øger den samlede tegnemængde. Faldet er ikke skjult ved en lavere renderopløsning.

Tallene er ikke en måling af telefonens GPU og garanterer ikke flydende afvikling på ældre enheder. Enkeltkørsler og RAF-kvantisering gør små procentforskelle usikre. En rigtig computer og iPhone/Safari bør afprøves før udgivelse. Yderligere afskærmning af skjulte vægsektioner og genbrug af synlighedsresultater ved et stillestående kamera er mulige opfølgningspunkter; de er ikke implementeret som uafprøvede ændringer i denne aflevering.

### Isoleret effekt af fin culling i den nye verden

| Viewport / sted | FPS grov → fin | Median ms grov → fin | Trekanter grov → fin | Tegnekald grov → fin |
| --- | ---: | ---: | ---: | ---: |
| 1280 × 800 / jejunum | 1.76 → 1.87 | 566.6 → 533.4 | 347,028 → 313,140 | 31 → 28 |
| 390 × 844 / duodenum | 3.33 → 3.16 | 300.0 → 316.6 | 346,636 → 309,784 | 49 → 49 |

Culling reducerer trekanter cirka 10 % i begge disse faste vinkler. Desktop-jejunum viser en beskeden tidsgevinst; mobil-duodenum viser ingen hastighedsgevinst i denne kørsel. Optimeringen bevares for dens dokumenterede geometribesparelse i bøjninger og den målte desktopgevinst uden tab af synlig anatomi. Det påstås ikke, at den forbedrer FPS i alle vinkler eller på alle enheder. [Isolerede måleresultater](sammenhaengende-verden/performance/occlusion/results.json).

## Testresultater

Alle kontroller nedenfor består. [Samlet maskinlæsbar kontroloversigt](sammenhaengende-verden/validation.json).

| Kontrol | Resultat |
| --- | --- |
| `npm test` | **179/179** Node-tests består |
| `npm run build` | Består; alle aktuelle public-filer matcher buildets kopier |
| `git diff --check` | Består |
| Samtlige 14 medlemmer af `test:browser` | Består; de seks komplette molekylerejser er kørt som tre desktop- og tre mobilforløb |
| Eksisterende fase B- og fase C-browserkontroller | Består på desktop og emuleret mobil |
| Eksisterende performanceværktøj og v2-model-/videokontrol | Består; yderligere to selvstændige værktøjer |
| Ny sammenhængende-verden-kontrol | 65 billeder; alle 13 samlinger begge veje; ingen side-/shaderfejl |
| Ny tilstands-/mobilkontrol | Ni kontroller består: rigtig IndexedDB-genoptagelse, pause, ingen dobbeltpoint, tekster/layout, historisk review og gammelt transport-checkpoint |
| Fin culling | **28/28** byte-identiske billedpar; alle tre slimhindeforbindelser medtaget |
| Før/efter-måling | Seks par med kontrolleret pose, viewport, DPR, renderbuffer og renderfaktor; tolv billeder |
| Lokalt GitHub Pages-build under `/sygepleje-laeringsstier/` | De ni tilstandskontroller består igen; ingen HTTP-respons med status ≥400 |

De 18 eksisterende selvstændige browserkontroller/værktøjer er: `digestion-phase-a`, `digestion`, `digestion-audio`, `digestion-v2`, `review`, `acceptance`, `blood-game`, `journey-audio`, `journey-anatomy`, `journey-guide`, `journey-3d`, `circulation`, `quality-fixes`, `game-viewport`, `digestion-phase-b`, `digestion-phase-c`, `digestion-performance` og `digestion-v2-visuals`. `digestion-fixtures.cjs` er en delt testhjælper.

Layout er kontrolleret ved **1280×800, 1024×768, 768×1024, 390×844, 375×667, 320×568, 568×320, 667×375 og 844×390**, med enzymvalg, anatomiske valg og lange forklaringer. Infoboks og svarpanel overlapper ikke. Restteksten kontrolleres særskilt i fire størrelser; galdeforklaringen i fem. Kun svarknapper registrerer svar; muse-/touchdrejning virker fortsat.

Eksisterende tests er tilpasset de aftalte ændringer: de gamle forventninger om absorptionsknapper, karpaneler og avancerede tekster er erstattet med kontrol af automatisk optagelse, grundlæggende tekster og galdesalte i lumen. Anatomiske spørgsmål, enzymidentitet, liv/point, pause, historik, gemning, sluttest og fejltilstande kontrolleres fortsat. Den uafhængige blodcelle-anatomitest overskred først sin 30-sekunders software-timeout. Den består med 120 sekunders timeout og tastaturaktivering af de bevægelige knapper; rute-, ventil-, tids-, lyd- og touchkontroller er bevaret. Ingen produktionskode til de øvrige læringsspil er ændret.

## Visuelt materiale

- [Galleri](sammenhaengende-verden/galleri.html): **92 billeder og to korte browserklip**, med forklaring under hvert billede og de fulde performance-tabeller.
- [Anatomiske billeddata](sammenhaengende-verden/captures.json): 65 billeder af samlinger/tilbageblik, indvendig synkning, cardia/pylorus, fedtstadier og de tre optagelser. Billederne ligger direkte i samme mappe.
- [Før/efter-målinger](sammenhaengende-verden/performance/results.json): tolv PNG-billeder i `performance/`, med identisk lokal pose og separat ens animationsfase.
- [Culling-kontrol](sammenhaengende-verden/occlusion/pixel-checks.json): alle 28 sammenligninger samt to repræsentative billeder i `occlusion/`. [Isolerede timingmålinger](sammenhaengende-verden/performance/occlusion/results.json) og fire tilhørende billeder er i `performance/occlusion/`.
- [Genoptagelse og layout](sammenhaengende-verden/state-checks.json), [Pages-undermappe](sammenhaengende-verden/pages-prefix-checks.json) og [de 22 tidligere animations-checkpoints](sammenhaengende-verden/regression-v2/browser-checkpoints.json).
- [Peristaltik-klip](sammenhaengende-verden/video/peristaltik-oesophagus.mp4) og [toiletfinale](sammenhaengende-verden/video/toiletfinale.mp4). De er ægte browseroptagelser med bevarede variable frame-tidsstempler: cirka 4,1 sekunder/7 frames og 3,4 sekunder/12 frames. Optagelse belaster software-rendereren yderligere og er ikke en FPS-måling. Et særskilt micelleklip gav for få frames og er erstattet af billedsekvenserne; det skjules ikke med interpolerede frames.

Åbn `galleri.html` direkte, eller servér dokumentationsmappen lokalt:

```sh
python3 -m http.server 8080 --directory docs/codex-fordoejelse
# Åbn http://localhost:8080/sammenhaengende-verden/galleri.html
```

## Reproduktion og resterende begrænsninger

Spillet kan startes fra denne arbejdsbranch med `PORT=3030 npm start`. Med projektets Playwright/Chromium installeret køres de eksisterende kontroller med `APP_URL=http://127.0.0.1:3030/ npm run test:browser`, suppleret med `test:browser:digestion-b` og `test:browser:digestion-c`. De nye kontroller er:

```sh
APP_URL=http://127.0.0.1:3030/ npm run test:browser:digestion-continuous
APP_URL=http://127.0.0.1:3030/ node tests-browser/digestion-continuous-occlusion.cjs
# Baseline-serveren skal servere det uændrede d7130f8-commit på port 3021:
BEFORE_URL=http://127.0.0.1:3021/ APP_URL=http://127.0.0.1:3030/ npm run test:browser:digestion-continuous-performance
node scripts/build-digestion-gallery.js
```

Til isoleret culling-måling bruges `OCCLUSION_COMPARE=1 PERFORMANCE_CASES=desktop:jejunum,mobile:duodenum` sammen med performance-scriptet. Den gamle regionale benchmark har `PERF_EXPECT_VILLI=2200` som mulighed ved måling mod den arkiverede duodenum-model; den nye model forventer 4.840.

De resterende begrænsninger er den skematiske anatomiske skala, den dokumenterede software-performance og manglende fysisk hardware-/iPhone/Safari-test. De kræver en ærlig visuel og praktisk vurdering før udgivelse. **Den visuelle gennemgang er godkendt til udgivelse på main.** Gendannelsespunktet `backup-main-foer-sammenhaengende-verden` peger på udgangspunktet `d7130f8d0298ad6b6c3db9f3e49991c6279b53a6`. Den faktiske deploymentstatus fremgår af [GitHub Pages-workflowet](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/workflows/pages.yml); godkendelse alene er ikke bekræftelse på et gennemført deployment.
