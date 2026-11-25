# Udviklingsrapport · Dødelig dosis

## Implementeret løsning

Arbejdet tager udgangspunkt i den hentede stabile `main` på **62efe8c38c552c08616a6951d80b91a002b40b2b** og udføres i **doedelig-dosis**. Ingen tidligere læringsstier, spil, historiske dokumenter eller optimeringer er fjernet.

Den nye læringssti ligger under 3. semester og forbinder Farmakologi, Sygepleje og Sygdomslære. Forsiden præsenterer én spilbar sag og fortæller, at flere kommer senere. Titel og introduktion afslører ikke præparatet.

Sag 001 omfatter 30 scener, 41 informationsblokke, 10 kritiske spor, syv centrale karakterer, tre hypotesestop, seks lokale lægemiddelopslag, opfølgende interviews og plausible alternative forklaringer. Tre hovedveje krydser hinanden; spilleren kan også undersøge vildledende spor og vende tilbage. Man behøver ikke undersøge alle scener.

Hver scene viser ét sted/tidspunkt, dialog eller dokumenter og en valgfri refleksion før næste valg. Nye handlinger vises højst fire ad gangen med mulighed for at bladre. Undersøgte scener kan genbesøges, og betinget tekst kan give dem ny betydning. Den studerende opretter selv noter, kategorier, kommentarer, tavleplaceringer og forbindelser; motoren afslører ikke automatisk de fagligt korrekte koblinger.

Notesbogen understøtter tekstmarkering, mobilknapper ved informationsblokke og enkeltprøver, redigering, sletning, søgning, kategorier, sortering, kildegenåbning, kopiering og eksport. Tavlen understøtter pointerbetjening, piletaster og en fuld liste/formular til at forbinde spor på mobil. Hypoteser gemmes med støttefund og sikkerhed 0–100 %, og tidligere versioner kan sammenlignes.

Afslutningen indsamler først den studerendes egne ni fritekstforklaringer. Derefter bedømmes strukturerede valg, beregninger, rækkefølge og årsag/virkning objektivt med vægtningen 20/10/20/20/15/15. Fritekst bedømmes ikke af AI eller nøgleord. Evalueringen viser forklaringer, kritiske fund/oversete spor, egne konklusioner, hypoteser, hints, noter og en kronologisk rekonstruktion med schweizerostmodellen. En simuleret UTH-rapport gemmes og eksporteres lokalt.

## Filer og arkitektur

| Område | Filer |
| --- | --- |
| Register og integration | `public/dose-catalog.js`, små tilføjelser i `app.js` og `model.js` |
| Generisk motor | `public/dose-engine.js` |
| Lokal lagring | `public/dose-storage.js` |
| Visning og betjening | `public/dose-game.js`, `public/dose.css` |
| Komplet sag og facit | `public/dose-case-001.js` |
| Billeder | 19 lokale `public/dose-*.webp` |
| Motor- og datatests | `test/dose.test.js`, ikke-offentlig `test/dose-fixture.js` |
| Browsertest | `tests-browser/dose-investigation.cjs` |
| CI-integration | `scripts/ci/module-graph.js`, `scripts/ci/test-registry.js` |
| Statisk testserver | WebP MIME-type i `scripts/static-server.js` |
| Eksisterende katalogtests | `tests-browser/acceptance.cjs`, `quality-fixes.cjs` og `review.cjs`: forvent syv stier og vælg de eksisterende quizstier udtrykkeligt |

Ingen npm-afhængigheder er tilføjet. Der er ingen ny 3D-motor, animationstimer, backend, database, API-nøgle eller AI under afvikling. Caseindhold og CSS indlæses først ved spillets åbning. Andre sider indlæser ingen af spillets billeder.

Det eksisterende gemmeschema for de tidligere spil er bevaret. Hver ny sag gemmes i sin egen localStorage-nøgle. Versionering bevarer noter og gyldige fund, men ugyldiggør en forældet slutvurdering. Beskadigede originaler overskrives ikke, og revisionskontrol beskytter mod samtidige faner. Spillets eksport er separat fra platformens tidligere backupformat.

## Tests

Den lokale Node-suite består med **266 tests**, heraf **19 nye tests** for motor, sag, generisk fixture, datavalidering, point, alternative veje, versionering, korruption, kvote-/adgangsfejl og fanekonflikter. Der foretages desuden en udforskning af kombinationer i de første syv trin for at kontrollere fremkommelighed.

Den nye browsersuite gennemfører fire komplette spil: tre forskellige hovedveje og ét forløb med vildledende spor. Den omfatter alle tre begyndelsesvalg, seks opslag, nye interviews, tre hypotesestop, hints, egne noter, tekstmarkering, kildegenåbning, manuel tavle, lagring/genoptagelse, lokal eksport, 100-point-afslutning, rekonstruktion og UTH. Der kontrolleres XSS-tekst, beskadigede data, caseopdatering og manglende billeder. Ingen uventede JavaScript-fejl, HTTP-fejl eller eksterne anmodninger accepteres i gennemspilningerne.

Layout kontrolleres ved **320×568, 375×667, 390×844, 768×1024, 844×390, 1024×768, 1280×800 og 568×320**. Det omfatter scene, notesbog, tavle, arkiv, hypoteser, hints og slutrapport. Vandret dokumenttabel kan scrolles inden for tabellens eget område; hele siden må ikke få vandret overflow.

Platformens eksisterende core-browserkontrol består: 56 quizspørgsmål, refleksioner, opgradering, backup, korruption, XSS, navigation, worker/build samt opstart af blodcelle-, fordøjelses- og iltspillene på desktop og mobil. Den komplette eksisterende regression udvælges fortsat af samme CI før merge/udgivelse; den endelige kørselsstatus registreres i publiceringsdokumentationen.

Identificerede og rettede fejl under kontrollen: navigation fra evaluering til UTH, en manglende nulstillingsmulighed ved korrupt JSON og race i testens venten på genoptaget indhold. Tavlens linjer opdateres nu uden at udskifte det aktive kort ved afslutning af et træk. Touchtræk testes med realistisk tid mellem start, bevægelse og afslutning; en nul-tids-gesture i CDP undertrykte ellers Chromiums efterfølgende syntetiske klik. De komplette mobilforløb omfatter også træk og genoptagelse.

## Faglig kvalitet og illustrationer

Se [faglige kilder og kliniske beslutninger](faglige-kilder.md), [illustrationsoversigt](illustrationer.md) og [galleri](galleri.html). Prøvetidspunktet ligger før dødsfaldet og mere end seks timer efter sidste dosis. Casen skelner mellem overeksponering, nedsat elimination, øget følsomhed og de kliniske fund. Apixabandosis er tilpasset den fiktive svære nyrepåvirkning. Hypokaliæmi her må ikke forveksles med hyperkaliæmi ved visse akutte alvorlige forgiftninger.

Der er genereret 19 billeder. De bruges som illustrationer, ikke kliniske beviser. Alle diagnostiske oplysninger er kontrolleret tekst. Ingen virkelige patientoplysninger eller identificerbare patientfotos er anvendt.

## Performance og CI

Se [rå målinger og betingelser](performance.json) og [målescript](measure-performance.cjs). Baseline er den uændrede stabile main-version. Samme lokale statiske server, Pages-undermappe, Node, Chromium, viewport og tre kolde browserkontekster anvendes før/efter. Tider er lokale og kan variere; små forskelle betragtes som støj.

Bygget vokser fra 1.652.418 til 2.825.625 kildebytes, primært 1.057.032 bytes WebP. Antallet af kildefiler vokser fra 102 til 127. Forsidens målte dekodede ressourcer vokser kun fra 1.473.149 til 1.475.096 bytes: **1.947 bytes og én metadataanmodning**. Ingen sagsbilleder indlæses på forsiden. Casekode, CSS og billeder kommer først ved åbning.

De tre målingers medianer: build 919 ms før / 770 ms efter; DOMContentLoaded på forsiden 178 ms før / 163 ms efter. Det er ikke dokumentation for en reel hastighedsforbedring. CDP måler ca. 4,14 MB JS-heap før og 4,16 MB efter på forsiden, og ca. 4,77 MB ved sagens begyndelse. Browserens afrundede `performance.memory`-værdi er ikke brugt til sammenligningen. Hukommelsesmålet er JS-heap, ikke hele browserprocessens RAM.

Build ligger omkring ét sekund lokalt og bevarer det deterministiske hashformat, checksumkontrol af vendor og udeladelse af de tre tidligere auditerede testmoduler. Den hurtige syntakskontrol er bevaret. Ingen tunge nye runtimebiblioteker eller gentagne build-trin er indført i pipeline.

Den nye browsersuite ligger som én kort gruppe i det eksisterende register og påvirkningsgraf. Ændringer kun i spillets moduler kan dermed vælge den relevante suite frem for alle lange 3D-forløb. Den første integration ændrer fælles katalog/router og kører derfor fuld regression. Deploymentworkflow, pinning, sparse checkout og den parallelle matrix er bevaret.

## Begrænsninger

- Ingen fysisk iPhone er tilgængelig; mobil og touch kontrolleres med Chromium-emulering. Safari/iOS bør også afprøves på en rigtig enhed.
- Den foreslåede menneskelige spilletid 30–45 minutter er et designmål, ikke et resultat af et brugerforsøg. Automatiske tests læser ikke i menneskeligt tempo.
- Der er ingen lyd og ingen ekstra sager i denne udgave. Kommende sager tilføjes via register og egne datamoduler.
- Eksport er læsbar JSON; filimport af sager er ikke implementeret. Brug spillets eksport for disse sager, da den tidligere platformbackup ikke inkluderer dem.
- Gemning kræver browserlager på samme enhed. Ved kvote-/adgangsfejl vises en advarsel, og noter kan eksporteres.
- Facit er skjult i den normale spiloplevelse, men kan som ved enhver statisk læringsside findes ved bevidst inspektion af kildekoden.
- Kilderne erstatter ikke en uafhængig sundhedsfaglig review eller lokale kliniske instrukser. Casen er fiktiv undervisning, ikke patientbehandling.

## Udgivelse

Merge og udgivelse er udtrykkeligt godkendt i opgaven, når alle kvalitetskrav er opfyldt. Udviklingsbranchen bevares. Der anvendes ingen force-push. Før merge kontrolleres remote main igen, og den eksisterende CI/pipeline skal bestå. Det endelige main-commit, workflow og den offentlige smoke-test registreres i en afsluttende publiceringsnote.
