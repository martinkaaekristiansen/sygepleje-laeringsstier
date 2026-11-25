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
| Build, median | 2,8861 s | 1,0681 s |
| Build, interval | 2,8545–3,3856 s | 0,9682–1,1467 s |
| Buildets faktiske bytes | 1.658.272 | 1.652.579 |
| Filer i dist, inkl. .nojekyll | 106 | 103 |
| Hash | 0f3ca54c9959 | 0a171e7a4a71 |

Buildmedianen faldt **63,0 %**. En enkelt V8-parserproces erstatter 96 separate Node-opstarter. Vendorchecksums, alle syntakskontroller og cachebeskyttede relative URL'er bevares. Bytebesparelsen er kun **5.693 bytes (0,34 %)**: tre test-/historikmoduler udelades fra kopieringen, og otte ubrugte importbindinger fjernes. Ingen modeller/animationer/klinisk indhold er komprimeret væk.

## Udgivelsesforløb

Baseline på main: **57 min. 47 sek.**, heraf **56 min. 13 sek.** sekventiel browserkontrol. Ny fælles kontrol i første komplette CI-prøve: **143 s** inklusive image/npm/Node/build/smoke/artifacts; ændringsanalyse **21 s**. Dette er målte jobtider, ikke i sig selv en udgivet hjemmeside. Endelig fuld regression og Actions-minutter tilføjes efter afsluttet kørsel.

En lille AST-verificeret tekstændring bruger kun plan + fælles kontrol + gate; en ukendt/core-ændring bruger fuld regression. Intervallet 2–5 minutter er et mål for små ændringer, ikke en verificeret produktionstid endnu. Almindelige spilændringer får alle relevante spiltests; især lange fysiologiske forløb kan overskride 5–10 minutter. Hverken læsetid, realtids-save eller animationskrav er forkortet for at nå et tal.

Ny Pages-deploy er **ikke gennemført eller tidsmålt**, da merge/udgivelse afventer godkendelse. Den gamle deploy alene tog 6 s, men dette må ikke lægges til nye CI-tal og kaldes en bekræftet ny udgivelse. Endelig produktionstid måles efter godkendt merge.

Parallelisering forkorter ventetid, men kan øge runner-minutter på en fuld kørsel, især fordi ilt og den sammenhængende verden nu faktisk er med. Dokumentations- og små tekstændringer undgår til gengæld hele den lange matrix. Begge effekter skal fremgå, ikke kun den korteste tid.
