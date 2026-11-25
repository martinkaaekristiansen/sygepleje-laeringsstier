# Testresultater

## Lokale kontroller

- Baseline: **233/233** eksisterende Node-tests bestod før ændringerne.
- Efter ændringerne: **247/247** Node-tests bestod (Node 24.22.1). De 14 ekstra tests dækker buildkontrakten og CI-værktøjer; ingen eksisterende test er fjernet.
- Syntaks: 201 egne JS/CJS/MJS-filer kontrolleret med den aktuelle V8-parser. Node 22.23.5 kontrolleres også i Actions; her består alle 247 tests, og Node-testtiden er 26,693 sek. i sidste fælles kontrol (17,129 sek. i en tidligere prøve). VM-modulers eksperimentelle advarsel er synlig; syntaxfejl giver fejlstatus.
- Build: bestået, hash `3baa9ce1120d`. Gentagne builds giver samme bytes/hash.
- Fælles browserpakke: acceptance, quality-fixes, oxygen-build og seks spilopstarter/genoptag på desktop/mobil bestod mod det rigtige hash-build og Pages-undermappen.
- `git diff --check`: bestået på de lokale implementeringscommits. Efter cloudmiljøets afbrydelse kunne kommandoen og den lokale arbejdstræstatus ikke kontrolleres igen. De efterfølgende ændringer er gennemgået som GitHub-patches; CI kontrollerer syntaks og dokumentationslinks.

## Nye regressionstests

[Testene](../../test/ci-tools.test.js) kontrollerer transitive imports/re-exports/workers, ukendt loading, CSS-kontekst, runtime-dokumentation, tekst/facit/ID-afgrænsning, multi-commit-push, merge, rename/sletning, manglende base, registrering af alle browserfiler, begge enheder og fælles v2-cases, selectorfejl, syntaksparitet med `node --check`, Pages-serverens sti-/symlinkgrænser samt fejl/timeout-propagation. Workflowkontroller kræver main-afgrænsning, gates, faste action-SHA'er og isolerede matrixjobs.

[Buildkontrakten](../../test/build-contract.test.js) verificerer determinisme, uændrede runtimebytes, alle vendorchecksums, afvisning af manipuleret vendor og manglende runtimefiler, automatisk geninklusion af historiske moduler samt konservativ kopiering ved ukendte imports.

## Fuld funktionel regression på GitHub

[Den afsluttende fulde kørsel](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/runs/45603271295) afprøver:

| Område | Dækning |
|---|---|
| Platform | Seks læringsstier, forside, navigation, semester/fag, 56 tekstspørgsmål, forklaringer, refleksion, repetition, historik og mobil |
| Data og sikkerhed | IndexedDB, gamle gemte data, migration, backup/gendannelse, korruption, konfliktbeskyttelse og XSS |
| Blod/kredsløb | Spil, sværhedsgrader, anatomi, kamera, kontrol/touch, lyd, kar/klapper, guide og viewport |
| Fordøjelse | Tre komplette næringsstofrejser på begge enheder, sluttests/trofæer/repetition, liv/retry, sekretion, absorption/rest, labels, HCl, enzymlivscyklus, mikrobiota, sammenhængende verden, lyd, pause og genoptag |
| Ilt | Alle tre niveauer på desktop/mobil, fysiologi, synlighed, identitet, lyd, state, layout, afsluttende test, hjerteworker og produktionsbuild |

Første prøve blev afløst efter de tre dokumenterede fejl nedenfor; den samlede kørsel blev annulleret. Derefter bestod alle 24 jobs med otte runners i [45598155788](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/runs/45598155788), og alle 24 bestod med 16 runners i [45601230641](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/runs/45601230641). Den afsluttende kontrol af commit `f0d347acb2990e4c300d0928ee01cb8e80bb387a` har status **BESTÅET**: alle 24 jobs og 38/38 browserkørsler bestod. Den omfatter 29 forskellige funktionelle browserfiler fordelt på 38 konkrete kørsler og alle 247 Node-tests.

## Bevarede særpakker

Performancemålinger og omfattende visuel/video-dokumentation bevares som særskilte, eksplicitte npm-pakker. Sammenligningsscripts skal have en valgt før-server og efter-server, og videogeneratorer kræver deres dokumenterede lokale værktøjer. De er ikke en del af den natlige funktionelle gate. Alle ti eksisterende scripts bevares i registeret og kan fortsat køres direkte. De er ikke afviklet automatisk for hver lille rettelse. Historiske fase B/C-forløb kan have forventninger til ældre sceneforløb; genbrug dem som dokumentationsgeneratorer for deres relevante version, og lad en fejl stå synligt frem for at ignorere den. Den aktuelle fysiologi/anatomi dækkes af de funktionelle tests ovenfor.

Ingen fysisk iPhone eller hardwareaccelereret GPU er testet i denne opgave; mobilkørsler bruger Chromium-emulering, og WebGL bruger SwiftShader. CI-optimeringen ændrer ikke spillets rendering eller hævder højere FPS.

## Fejl fundet af den udvidede dækning

Første fulde CI-prøve var rød på tre kontroller, som den tidligere Pages-pakke ikke indeholdt. Fejlene er ikke ignoreret:

- `digestion-continuous`: det isolerede inspektionsdokument har intet app-script-tag. Testen finder nu det faktiske hash-entrypoint i den rigtige side før inspektionen og overfører URL'en til browser-evalueringen. Alle oprindelige anatomiske assertions bevares.
- `oxygen-audio`: pausedatasættet var læst før sidste renderframe. Testen venter nu to rAF-grænser og kræver derefter stadig præcis samme kameraposition efter 500 ms. Ingen pause- eller lydkode ændres.
- `oxygen-layout`: samme container/browser som CI reproducerede en eksisterende fontafhængig afklipning ved 568 × 320. Knappers bund var 313 px, panelbund 312 px. Én CSS-værdi reducerer overflødig afstandsreserve fra 18 til 8 px i landskabsreglen; panelet bliver 103 i stedet for 94 px højt. Svarenes bund er derefter 304 px, panelbund 312 px, og afstanden til infoboksen er fortsat 8,91 px. Tekst, 44-pixel touchmål og anatomien er uændrede.

Layouttesten beholder alle 27 spørgsmål på ni viewports og de strenge krav til synlige svar, afstande og touchmål. Diagnostikken indeholder nu den konkrete viewport og geometri ved fejl.

[Layout før, 568 × 320](layout/oxygen-before-568x320.png) · [Layout efter, 568 × 320](layout/oxygen-after-568x320.png). De to små billeder dokumenterer den nødvendige fejlrettelse; øvrige nye store testoptagelser versionsstyres ikke.


## Eksisterende offentlige Pages-adresse

Et read-only HTTPS-tjek gav HTTP 200 på forsiden og **104/104 offentliggjorte assets**. Hver fil matcher SHA-256 fra den uændrede main-version `b69df9b`; den offentliggjorte assetmappe er `assets/0f3ca54c9959/`. Dette er en kontrol af den eksisterende udgave, ikke en udgivelse af arbejdsbranchen.

Det ekstra Chromium-besøg direkte mod den offentlige adresse kunne ikke gennemføres i dette miljø: først en lokal CA-fejl og derefter proxytimeout. TLS-kontrollen blev ikke slået fra. Den nye udgave er funktionelt browser-testet mod sit rigtige build på Pages-undermappen lokalt og i GitHub Actions. En livebrowserkontrol af den nye udgave skal stadig gennemføres efter godkendt deployment.

## Afbrudt lokalt arbejdsmiljø

Cloudmiljøet blev utilgængeligt, efter at kode og rapportudkast var pushet. Afsluttende rapporter og tidsdata færdiggøres gennem GitHub-forbindelsen med normale commits og fast-forward af arbejdsbranchen. Main opdateres ikke. En ren lokal arbejdsmappe kan derfor ikke bekræftes efter afbrydelsen; gamle lokale rapportredigeringer skal bevares og sammenholdes med GitHub, hvis miljøet genoprettes.

De nye målinger kræver ingen ændring af spillets faglige indhold, datastrukturer, grafik eller animationshastighed.
