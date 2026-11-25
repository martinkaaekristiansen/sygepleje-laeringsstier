# Performance før og efter

## Faktiske miljøforsøg

Samme app, Node 22.23.5, 233 eksisterende Node-tests, oprindeligt build og samme Pages/WebGL-test. [Forsøg 45590994379](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/runs/45590994379):

| Miljø | Checkout | npm | Browser/OS-installation eller image | Node | Build | WebGL | Job i alt |
|---|---:|---:|---:|---:|---:|---:|---:|
| Native uden cache | 7 s | 2 s | 35 s | 15 s | 2 s | 12 s | 85 s |
| Native kold cache | 14 s | 2 s | 32 s | 18 s | 2 s | 14 s | 102 s |
| Native varm cache | 12 s | 3 s | 37 s | 14 s | 2 s | 12 s | 103 s |
| Sparse + varm cache | 2 s | 2 s | 23 s | 19 s | 3 s | 11 s | 74 s |
| Container + fuldt checkout | 6 s | 2 s | 30 s | 18 s | 2 s | 11 s | 80 s |
| **Container + sparse** | **1 s** | **1 s** | **30 s** | **18 s** | **3 s** | **12 s** | **72 s** |

Alle seks bestod. Jobtotaler inkluderer ekstra setup, post/cache og artifactoverhead. Runners varierer: i første forsøg var native varm cache 69 s og sparse/cache 80 s. Den første containerkørsel fejlede inden tests på Git-ejerskab; den indgår ikke som en gyldig performancemåling. Containeren vælges for versionsbinding og stabil klargøring, ikke en påstand om altid at slå cache.

Sparse checkout: 714 versionerede filer i målecommit, 205 fysisk hentet; 219.885.726 → 2.316.290 bytes (**98,95 % færre arbejdsbytes**). Pakkede Git-objekter: 199.558 → 773 KiB. Hele repositoryets historik og dokumentation er fortsat bevaret.

## Build, ens lokale betingelser

Node 24.22.1, samme lokale 2-core CPU-kvote, ingen samtidig WebGL, tre kørsler pr. variant. [Rå måletal](audit-data.json) inkluderer alle kørsler.

| Parameter | Før | Efter |
|---|---:|---:|
| Build, median | 2,6681 s | 0,9464 s |
| Build, interval | 2,6533–2,8002 s | 0,7046–1,0825 s |
| Buildets faktiske bytes | 1.658.272 | 1.652.578 |
| Filer i dist, inkl. .nojekyll | 106 | 103 |
| Hash | 0f3ca54c9959 | 3baa9ce1120d |

Buildmedianen faldt **64,5 %**. En enkelt V8-parserproces erstatter 96 separate Node-opstarter. Vendorchecksums, alle syntakskontroller og cachebeskyttede relative URL'er bevares. Bytebesparelsen er kun **5.694 bytes (0,34 %)**: tre test-/historikmoduler udelades fra kopieringen, og otte ubrugte importbindinger fjernes. Den nødvendige landskabsrettelse i CSS ændrer én yderligere byte. Ingen modeller/animationer/klinisk indhold er komprimeret væk.

## Fuld regression og runnerforbrug

| Kørsel | Kode | Samtidige runners | Samlet varighed | Aktiv runner-tid | Resultat |
|---|---|---:|---:|---:|---|
| Tidligere main-udgivelse, 45366303009 | b69df9b | 1 under browserpakken | 57:47 inkl. Pages | 57:38 | Bestået, 19 browserfiler |
| Ny fuld kontrol, 45598155788 | ec25984 | 8 | 17:47 uden Pages | 107:20 | Alle 24 jobs bestod |
| Ny fuld kontrol, 45601230641 | 5b352f3 | 16 | 11:39 uden Pages | 107:36 | Alle 24 jobs bestod |
| Afsluttende kontrol med præcise fillogs, 45603271295 | f0d347a | 16 | 12:35 uden Pages | 106:18 | BESTÅET |

De to nye matrixforsøg har samme 29 funktionelle browserfiler, 38 konkrete kørsler, 247 Node-tests, buildhash `3baa9ce1120d`, skærmstørrelser, normale animationsure og SwiftShader. Hver browserkørsel er isoleret på sin egen runner. Det tredje forløb tilføjer kun en kompakt tidslog efter hver fil. De tidligere 19 browserfiler er alle bevaret; iltspillets syv filer, den sammenhængende verden og den fælles spil-smoke er kommet med.

Loftet på 16 reducerede den målte samlede varighed med **34,5 %** i forhold til otte, mens aktiv runner-tid steg **16 sekunder (0,25 %)**. Længste matrixventetid faldt fra 699 til 233 sekunder. Den målte maksimumoverlapning var henholdsvis otte og 16 forskellige runners. Der kører aldrig flere konkurrerende WebGL-tests på samme runner.

Sammenlignet med den tidligere udgivelse er 11:39 en **79,8 % kortere valideringsperiode**, men den nye måling indeholder ingen Pages-deploy. Det er derfor ikke en bekræftet ny udgivelsestid. Samlet aktiv runner-tid er steget fra 3.458 til 6.456 sekunder (**86,7 %**), især fordi alle iltrejser og yderligere funktionel dækning nu faktisk køres, og hver isoleret runner har setup. Dette er en reel meromkostning i computerarbejde. Actions' timing-API viste 0 fakturerede millisekunder i de målte offentlige kørsler; det må ikke forveksles med nul runneraktivitet.

Engangsbenchmark, fejlsøgning og annullerede forsøg indgår ikke i tabellens normale kørselsforbrug. Deres status og formål er dokumenteret særskilt. Ingen mislykket eller annulleret kørsel tælles som en grøn performanceprøve.

## Hurtige og almindelige ændringer

Fælles kontrol på det målte 16-runner-forsøg: **135 sek.**, plus **14 sek.** til ændringsanalyse. På otte-runner-forsøget var tallene 129 og 20 sek. De omfatter installation, alle Node-tests, build, platform/data/quiz og alle tre spil på begge enheder. Det er direkte målte jobtider, ikke en separat tekstudgivelse. Den afsluttende kontrol brugte 182 sek. til den fælles pakke og 14 sek. til analyse.

- En AST-verificeret tekstrettelse bruger plan, fælles kontrol og gate; den lange matrix undgås.
- En almindelig ændring i spil-logik bruger samtlige grupper for alle transitivt berørte spil.
- Fælles kernemoduler, build, workflow og usikkerhed bruger fuld regression.
- Dokumentation alene bruger dokumentationskontrol og gate, uden build/deploy. Den særskilte måling dokumenteres efter rapportcommit.

**2–5 minutter for små udgivelser og 5–10 minutter for almindelige udgivelser er endnu ikke verificeret som komplette Pages-forløb.** Store realtidsrejser har fortsat en kritisk sti på cirka otte-ni minutter plus den fælles kontrol. En næste mulig forbedring er yderligere opdeling af fordøjelsens næringsstofcases med en særskilt kontrol af kombinerede trofæer og resultater; den er ikke indført uden tilsvarende sikker testdækning.

Der er ikke sænket renderopløsning, anatomi, animationstid, læsetid eller checkpointkrav for at opnå kortere kørsler.

## Varige målinger

[maalinger.json](maalinger.json) gemmer valgte API-job-/trintider, køventetider, runnerforbrug og de 38 eksakte filkørsler fra `CI_TIMING`. Baseline-filernes omtrentlige tider findes i [audit-data.json](audit-data.json), udledt fra sidste PASS-tidsstempel for hver fil. De inkluderer lidt opstarts-/oprydningsarbejde mellem filerne og skal læses som omtrentlige; efter-tiderne er instrumenteret direkte.

| Browserfil | Før, ca. sek. | Efter, sum sek. | Længste shard, sek. | Kørsler |
|---|---:|---:|---:|---:|
| `acceptance.cjs` | 7,8 | 8,2 | 8,2 | 1 |
| `blood-game.cjs` | 164,3 | 120,4 | 120,4 | 1 |
| `circulation.cjs` | 18,3 | 18,2 | 18,2 | 1 |
| `digestion.cjs` | 1150,9 | 951,0 | 494,5 | 2 |
| `digestion-audio.cjs` | 413,4 | 367,8 | 194,8 | 2 |
| `digestion-continuous.cjs` | Ikke i gammel Pages-pakke | 42,4 | 42,4 | 1 |
| `digestion-continuous-state.cjs` | Ikke i gammel Pages-pakke | 77,7 | 77,7 | 1 |
| `digestion-enzyme-continuity.cjs` | 200,4 | 163,9 | 163,9 | 1 |
| `digestion-hcl.cjs` | 118,2 | 93,9 | 93,9 | 1 |
| `digestion-labels.cjs` | 64,0 | 43,1 | 43,1 | 1 |
| `digestion-microbiota.cjs` | 66,3 | 42,6 | 42,6 | 1 |
| `digestion-oral-mobile.cjs` | 114,2 | 89,4 | 89,4 | 1 |
| `digestion-phase-a.cjs` | 90,1 | 65,4 | 65,4 | 1 |
| `digestion-v2.cjs` | 618,3 | 583,2 | 328,0 | 3 |
| `game-viewport.cjs` | 30,2 | 24,0 | 24,0 | 1 |
| `journey-3d.cjs` | 26,9 | 21,5 | 21,5 | 1 |
| `journey-anatomy.cjs` | 260,2 | 171,9 | 171,9 | 1 |
| `journey-audio.cjs` | 14,6 | 12,8 | 12,8 | 1 |
| `journey-guide.cjs` | 7,7 | 5,7 | 5,7 | 1 |
| `oxygen-audio.cjs` | Ikke i gammel Pages-pakke | 30,4 | 30,4 | 1 |
| `oxygen-build.cjs` | Ikke i gammel Pages-pakke | 16,8 | 16,8 | 1 |
| `oxygen-journeys.cjs` | Ikke i gammel Pages-pakke | 2200,0 | 414,3 | 6 |
| `oxygen-layout.cjs` | Ikke i gammel Pages-pakke | 84,5 | 84,5 | 1 |
| `oxygen-physiology.cjs` | Ikke i gammel Pages-pakke | 19,9 | 19,9 | 1 |
| `oxygen-state.cjs` | Ikke i gammel Pages-pakke | 20,1 | 20,1 | 1 |
| `oxygen-visibility.cjs` | Ikke i gammel Pages-pakke | 35,0 | 35,0 | 1 |
| `quality-fixes.cjs` | 5,2 | 5,2 | 5,2 | 1 |
| `review.cjs` | 2,3 | 2,0 | 2,0 | 1 |
| `smoke-games.cjs` | Ikke i gammel Pages-pakke | 76,2 | 76,2 | 1 |

Efter-summen er computer-/ventetid på tværs af alle filens enheds-/niveau-shards. Den er ikke den parallelle workflows samlede varighed. De 19 gamle værdier er omtrentlige loggrænser; alle 38 nye kørsler er målt direkte.

## Pages og resterende begrænsninger

Ny Pages-deploy er **ikke gennemført eller tidsmålt**, da merge og udgivelse afventer godkendelse. Den gamle deploy alene tog 6 sek.; det tal lægges ikke til nye CI-tal for at kalde en ny udgivelse bekræftet.

Eksisterende Pages svarede med HTTP 200, og 104/104 assets matcher uændret main. Ekstra live-Chromium var blokeret af miljøets CA/proxy; lokal og Actions-baseret browserkontrol af den rigtige Pages-undermappe består. Fysisk iPhone/Safari og hardwareaccelereret GPU er ikke afprøvet. Cloudmiljøet afbrød senere forbindelsen; afsluttende rapporter færdiggøres gennem GitHub, og en afsluttende lokal arbejdstræstatus kan ikke bekræftes.
