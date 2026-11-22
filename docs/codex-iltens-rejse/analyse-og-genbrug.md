# Fase A – analyse og genbrug

Udgangspunkt: seneste hentede `origin/main`, **75d143d5239abc75992243bdb80bfbe19b9ba8c0**. Ny lokal branch: `iltens-rejse-3d`. `fordoejelse-sammenhaengende-verden` peger også på dette commit; `forbedringer-fordoejelse` indeholder ingen nyere færdige komponenter. Denne analyse blev udført før den visuelle godkendelse. Brugeren godkendte commit, push og udgivelse den 22. november 2026.

## Gennemgåede komponenter

| Område | Eksisterende komponent | Anvendelse |
| --- | --- | --- |
| Ansigt | `digestion-face.js` | Samme åbne mund og ansigt; næsepassagen får en åben, separat vestibule i den nye verden. |
| Mund | `digestion-chewing.js` | Samme tandbuer, tandkød og centrerede tunge; ingen tygning af luft. |
| Svælg/larynx | `digestion-swallow.js` | Samme epiglottis, tungerod, stemmefolder og larynxindgang. Normal åben inspirationsstilling; luft passerer glottis, aldrig epiglottisbladet. |
| Kamera | `digestion-camera-frames.js`, `digestion-route-camera.js` | Opret kamerahorisont og mobilens synsfelt; kontinuerlig interpolation langs ruten og frit bagudblik. |
| Labels | `digestion-anatomy-labels.js` | Samme skarpe CSS-labels med anatomiske 3D-ankre og beskyttelse af informations-/svarfelter. |
| Hjertets hulrum | `journey-chambers.js`, `journey-geometry-loader.js` | Eksisterende implicitte kamre, rigtige ind-/udløb, trabekler og geometri-worker. Indlæses, når spilleren nærmer sig. |
| Klapper | `journey-valves.js`, `journey-physiology.js` | Eksisterende mitral-, aorta-, trikuspidal- og pulmonalklapper, korrekt systole/diastole og sikker passage gennem åben klap. |
| Kar og blodceller | `journey-3d-anatomy.js`, `journey-3d-geometry.js`, `blood-routes.js` | Samme karprofiler, erytrocytgeometri, kammerdetaljer og eksisterende anatomiske betegnelser. Forbindes i den nye verdens fælles koordinater. |
| Lyd | `journey-audio.js`, `journey-physiology.js` | Eksisterende syntese af åndedræt, hjerteslag og blodstrøm; egne gemte indstillinger, samme 70 slag/min og 14 åndedrag/min. |
| Brugerflade | `journey-ui.js`, `blood-viewport.js` | Toolbar, indstillingspanel, ruteknapper, kropssilhuet og telefonens synlige viewport. |
| Gemning/animation | `digestion-save.js` | Samme serialiserede checkpointkø. Den nye serialiserbare motor styrer pausable forløb. Eget `oxygenJourney`-felt; gamle spilrecords ændres ikke. |
| Sluttest | `digestion-exam-controller.js`, `digestion-exam.js` | Fælles testcontroller med injicerbar spørgsmålspulje; de gamle standardfunktioner bevarer deres adfærd. Fem gemte spørgsmålsidentiteter, feedback, resultat og repetition. |
| Renderbudget | `digestion-performance.js` | Samme automatisk tilpassede pixelratio. Anatomiske læringsdele fjernes ikke af kvalitetsvalg. |

De to gamle verdenscontrollere er spiltilstandskoblede. De genbruges derfor ikke ved at oprette flere renderere eller skifte mellem deres isolerede scener. Deres geometri, fysiologiske funktioner og uafhængige controllere genbruges i én ny scene og én renderer. Ingen eksisterende hjerte-/fordøjelsesgeometri kopieres.

## Ny kode og koordinater

Nye moduler fordeler fagdata, serialiserbar tilstand, sammenhængende rute/netværk, luftvejsgeometri, mucociliær transport, alveole/kar-barriere, hæmoglobin, væv/celle og verdens-/UI-adapter. Mund og næse mødes i samme svælg. Begge hovedbronchier er åbne, gyldige valg; den valgte side bevares gennem hele ruten og udåndingen.

Enhederne er undervisningsenheder. Kameraet følger faktisk forbundne passager. Ved overgangen fra makroanatomi til alveole, erytrocyt og celle bruges en glidende, forklaret forstørrelse; modellen påstår ikke, at en erytrocyt er lige så stor som et hjertekammer. Kropskortet viser den anatomiske region under forstørrelsen. Det samme ansigt og det samme valgte luftvejstræ bruges ud og hjem.

## Faglige grænser

- Cilier flytter slim mod pharynx uanset luftstrømmen. Bakterier følger slim ved væggen, aldrig frie baner midt i lumen. Ingen almindelige cilier i alveolerne.
- O₂ diffunderer over epitel, fælles basalregion og kapillærendotel efter partialtryksforskel og bindes reversibelt ved hæmjern; hæmoglobin har fire bindingssteder.
- O₂ bruges i oxidativ energiomsætning. CO₂ dannes ved nedbrydning af næringsstoffer; et nyt CO₂-molekyle overtager fortællingen, uden at O₂ ændres direkte til CO₂.
- Det meste CO₂ transporteres som hydrogencarbonat, dannet især i erytrocytter og transporteret overvejende i plasma. Den fulde reaktion forklares enkelt: CO₂ + H₂O ⇌ H⁺ + HCO₃⁻. O₂'s hæmsted bruges ikke til at fremstille carbaminobinding.
- Blodet skifter fra mørkere til lysere rødt, aldrig til blåt. Erytrocytten bliver i karret under begge gasudvekslinger.

## Kontrolpunkter før næste del

1. Først en gennemførlig hel rejse, begge indgange og begge lunger; forkert svar, to liv, genstart og genoptagelse.
2. Luftveje med åbne forbindelser, bronchiolers manglende brusk og genkendelig glottis.
3. Mucociliær transport testes selvstændigt: retning, vægafstand, koordineret slag og fortsat transport ved stationær spiller.
4. Alveole, fire hæmgrupper, membranpassager og de to gasudvekslinger kontrolleres med geometri- og tilstandstests.
5. Genbrugte kamre og klapper kontrolleres i hele kredsløbsrækkefølgen.
6. Alle tre niveauer, gemte animationer, sluttest, lyd og ni desktop-/mobil-/landskabsstørrelser.
7. Sammenlignelig software-WebGL-måling før/efter optimering med samme kamera og opløsning. Screenshots, korte H.264-klip, HTML-galleri og samlet rapport i denne mappe.
8. Alle eksisterende Node- og standardbrowserregressioner og build. Gamle spils geometri og brugerflader bevares; fælles udtræk kontrolleres af de eksisterende tests.

Udviklingen blev afleveret lokalt til visuel gennemgang. Efter brugerens godkendelse udgives resultatet til main med backupbranchen `backup-main-foer-iltens-rejse` som gendannelsespunkt.
