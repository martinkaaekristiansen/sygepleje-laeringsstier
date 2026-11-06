# Blodcellens rejse — alle tre niveauer i WebGL

Let, Mellem og Svær bruger samme Three.js-motor fra aorta gennem kroppens kar, hjertet og lungerne og tilbage til aorta. Ejeren har den 6. november 2026 bedt om at færdiggøre og udgive denne version.

Den gamle Canvas 2D-renderer `journey-scene.js` og den separate demonstrationscontroller og -rute er fjernet. Det gamle link `#/blodcelle-3d` viderestiller til `#/sti/blodcellens-rejse/blood-easy`. Der findes ingen valgknap til en gammel 2D-version og ingen skjult 2D-fallback. En enhed uden WebGL 2 får en forklaring og mulighed for at gå tilbage til resten af appen. Dens gemte data slettes ikke.

## Ruter, svar og lagring

`blood-routes.js` er uændret. Det er den eneste kilde til de anatomiske navne, svarmuligheder, rækkefølger og fejlforklaringer. Demonstrationens svar som »Mod biceps« og »Aktivt muskelområde« findes ikke længere. Hvert valg viser nøjagtig de to navne fra den oprindelige rute.

- Let: 11 strukturer og 10 overgange.
- Mellem: 17 strukturer og 16 overgange.
- Svær: 23 strukturer og 22 overgange.

Spilreglerne er uændrede: to liv, ét liv mistes ved fejl, nyt forsøg ved to fejl, varieret placering af korrekt svar og ingen mulighed for at springe trin over. Der er ingen ekstra »Fortsæt rejsen«-bekræftelse. Kameraet sænker farten før det næste valg. Reduceret bevægelse giver stillestående 3D og direkte overgange.

Det eksisterende `progress['blodcellens-rejse'].bloodJourney` og de stabile trin-id'er `blood-easy`, `blood-medium` og `blood-hard` bruges fortsat. Forsøg, bedste procentresultat, seneste gennemførelsesdato, aktive forsøg og tidligere gennemførelser bevares. En ny valgfri `perfect`-markering gemmer en fejlfri gennemførelse; gamle gemte resultater behøver ikke feltet. En gammel medalje fra firetrinsdemonstrationen giver ikke automatisk gennemførelse af et helt niveau.

## Anatomiske miljøer

- Arterier, arterioler og kapillærer har forskellige lumenstørrelser. Indgangen til et nyt kar tilpasses det foregående kars diameter, så indsnævring eller udvidelse sker langs en 3D-overflade.
- Vener har en mere eftergivelig, fladtrykt form, roligere flow og svagere pulsation. Den perifere armvene har en åben, tofliget veneklap. Hulvener og lungevener har ingen klapper i modellen.
- Forkamre og ventrikler har forskellige rumformer. Ventrikler har trabekler som tredimensionelle muskelstrukturer. Den venstre ventrikel har kraftigere muskelrelief end den højre. Vægtykkelsen er en kvalitativ illustration, ikke en måling.
- Trikuspidalklappen har tre sejl og mitralklappen to, med chordae tendineae og stiliserede papillærmuskler på ventrikelsiden. Semilunarklapperne har tre lommer uden chordae. Mellem-niveauets kammerpassager viser de mellemliggende klapper, selvom de ikke er separate spørgsmål. På Svær er klapperne egne trin.
- Klapper, hjertevægge og lyd bruger samme hjerteur. AV-klapper åbner i diastolen og semilunarklapper i uddrivningsfasen. Kamerapassagen venter på den åbne fase. Hvis en langsom renderer springer tidsvinduet over, venter den på næste slag.
- Kapillærer har en tynd, delvist transparent undervisningsvæg og blodceller i én række. Pulmonale kapillærer viser alveoler udenfor væggen, diskret respiration og O₂ ind i blodet / CO₂ ud. I muskelkapillærerne går retningerne omvendt.
- Erytrocytter er lukkede bikonkave 3D-meshes. Deres røde nuance følger positionen gennem udvekslingsområdet. Iltfattigt blod er stadig rødt og indeholder stadig bundet ilt.

**Valgene er rutehypoteser.** De oprindelige distraktorer kan ikke alle tegnes som eksisterende karforbindelser: der er eksempelvis ingen normal åbning gennem hjertets skillevæg. Derfor ligger to tilgængelige markører i 3D-miljøet, mens kar og hjertekamre bevarer et sammenhængende lumen uden fiktive åbninger. Kun lungearteriestammens reelle todeling tegnes som en fysisk Y-forgrening. Et korrekt valg fører kameraet videre i den faktiske strømretning; en fejl giver en kort tilbagebevægelse og den oprindelige forklaring.

Modellen er en pædagogisk visualisering, ikke en målfast eller klinisk valideret anatomisk simulator. Belysning inde i blodbanen, synlige gasmarkører, nedsat celletæthed og gennemsigtighed er bevidste undervisningshjælpemidler.

## Arkitektur og drift

Projektet er en JavaScript-app med ES-moduler. Three.js bruges direkte; React Three Fiber/Drei ville kræve et frameworks-skifte. Three.js 0.180.0 ligger lokalt under MIT-licens, inklusive `three-LICENSE.txt`. Der er ingen CDN-kald, backend, brugerlogin eller betalte API'er.

| Fil | Ansvar |
| --- | --- |
| `blood-routes.js` | Uændrede ruter, navne og feedback. |
| `journey-engine.js` | Tilstand, liv, score og vedvarende medaljer. |
| `blood-game.js` | Alle tre niveauers brugerflade, input og eksisterende IndexedDB-lagring. |
| `journey-3d-world.js` | Én vedvarende WebGL-renderer, kamera, instancing, lys, raycasting og oprydning. |
| `journey-3d-anatomy.js` | Lumenprofiler, hjertekamre, klapper, chordae, trabekler, alveoler og gasretning. |
| `journey-3d-geometry.js` | Bikonkav erytrocyt, sammenhængende Y-mesh og lokale teksturer. |
| `journey-physiology.js`, `journey-audio.js` | De eksisterende lydzoner, rytmer og tre kontinuerlige lydlag. |
| `journey-guide.js` | Eksisterende funfacts og kropskort. |

Grafikken indlæses først, når spillet åbnes. Den bruger instancer af blodceller, begrænsede partikler, små genererede teksturer og automatisk lavere opløsning på mobile/svage enheder. Kvaliteten kan også vælges manuelt. Én renderer og én lydmotor genbruges gennem trinskift. Scenens midlertidige GPU-ressourcer frigøres, og alle ressourcer frigøres ved navigation væk fra spillet.

## Verifikation

- `npm test`: oprindelige ruter og regler, alle geometrityper, åbne kameraveje, lukket bikonkav celle, klapsejl/chordae, gasretninger og bevaret progression.
- `npm run build`: syntakskontrol og relativt adresserede, versionsmærkede statiske filer til GitHub Pages.
- `npm run test:browser`: alle 56 øvrige spørgsmål, alle tre spilruter, to oprindelige svar ved hvert valg, fejl/genstart, gemte resultater, gamle `arrival`-data, lyd, kropskort, mus/touch/tastatur, reduceret bevægelse og Pages-undermappe.
- `npm run test:3d`: én WebGL-renderer og lydmotor, ingen gammel 2D-import, direkte raycasting, gammel demo-URL, fejlfri medalje, mobilfeedback og WebGL-fejlbesked.

Visuelle kontroller udføres i Chromium med software-WebGL (SwiftShader), også i mobilformat. Billedhastigheden i dette miljø er ikke en måling af fysiske telefoners eller computeres GPU-ydelse. Der er ikke grundlag for at love 60 FPS på alle enheder. Browseremulering er heller ikke en fysisk iPhone-/Android-test.

## Lokal afprøvning

Kør `npm run dev` og åbn `http://localhost:3000/#/sti/blodcellens-rejse/blood-easy`. Alle tre niveauer vælges i samme menu. `npm run build:preview:3d` genererer en selvstændig HTML-kopi med alle tre niveauer; lokal HTTP anbefales, hvis browseren begrænser åbning af lokale HTML-filer.
