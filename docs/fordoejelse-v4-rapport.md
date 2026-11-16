# Fordøjelsens vilde rejse 4.0

Appversion 0.15.0. Opdateringen bygger videre på spillets eksisterende controller, Three.js, organmodeller, molekyler, sekretstrømme, fælles komponenter fra Blodcellens rejse og lokale lagring.

## Brugerflade og læring

- Spørgsmål og svar ligger i en kompakt bjælke nederst. På desktop er den begrænset til 20 % af visningens højde; de almindelige enzymopgaver bruger omkring 15 %. Mobil får en responsiv bjælke med læsbare knapper og intern rulning ved lange svar. Midten er fri til anatomien.
- Anatomiske valg har fortsat to svar i de fælles rute-knapper fra Blodcellens rejse. Biokemiske opgaver har tre svar. Den eksisterende rute med 15 stationer og begge anatomiske betegnelser er bevaret.
- En kort faglig pointe står under lokationsoverskriften. Pointerne ændres ved den næste faglige begivenhed, ikke efter en timer. De kuraterede forklaringer er højst 20 ord.
- Informationsknappen åbner den længere forklaring. Læringsloggen gemmer de seneste 200 pointer på enheden, også på tværs af karakterer og genindlæsning. Spillet og lyden sættes på pause under læsning.
- Enzym-, sekret-, absorptions- og perspektivsekvenser venter på »Fortsæt«. Animationen kan opleves og forklaringen læses i eget tempo. Startens korte indflyvning før indgangsvalget er stadig automatisk.
- Et lille molekyleikon og molekylets navn viser, hvad der følges. Fedtikonet viser også emulgering og den senere chylomikron. Oprindelsessvar illustreres med organikoner; produktvalg viser forskellige molekylestrukturer.
- Kropskortet viser alle 15 punkter, gennemført og resterende rute samt aktuel position. Patientens højre er til venstre for beskueren. Kortets placering holdes fri af svarene, og skjul/vis-indstillingen gemmes.

## Molekyler og absorption

- De tre gennemgående forløb er bevaret: stivelse → kortere kæde → maltose → glukose; triglycerid → emulgering → 2-monoglycerid og frie fedtsyrer; protein → kortere peptider → mindre peptider → aminosyrer.
- Den gamle forstørrede villus-/enterocyt-/membranscene er fjernet. Absorption genbruger jejunums lumen, tarmvæg, villi, samme kamera, synsfelt og anatomiske miljø. Der sker intet skift til mikro- eller nanometerskala.
- En stiliseret gennemsigtig gennemskæring af tarmvæggen gør tarmepitel, blodkapillær og centralt lymfekar synlige. Partikler bevæger sig gennem epitelet til den korrekte destination.
- Maltase og peptidaser arbejder ved tarmvæggen. De viste glukose- og aminosyreprodukter føres videre derfra. Glukoses natriumkoblede optagelse og den videre basolaterale transport vises med diskrete transportmarkører; de længere forklaringer nævner SGLT1 og GLUT2.
- Miceller bliver i lumen. Langkædede lipidprodukter optages, triglycerider gendannes i tarmcellerne, og chylomikroner føres til lymfen. Glukose og aminosyrer føres til blodet.
- Efter absorptionen bliver perspektiv, model og tekst til en ufordøjelig rest. Det absorberede næringsstof fortsætter ikke til anus.
- Kameraet afslutter sine overgange og står derefter stille. Startsekvensens bevægelse har også en fast afslutning, selv når spilleren venter. Manuel kiggen, fysiologiske animationer og toiletfinalen er bevaret.

## Organisk lyd

- Original, lokal syntese med filtreret støj, bløde lydkurver og lave resonanser erstatter de tidligere simple bip. Ingen optagelser eller eksterne lydtjenester er nødvendige.
- Otte miljøprofiler dækker alle 15 stationer: mund, svælg/epiglottis, oesophagus, mavesæk, duodenum, tyndtarm, colon og finale.
- Effekter omfatter tygning/knas, fugtig bevægelse, synkning, hoste ved trachea-valget, peristaltik, rumlen, sekret, enzymbinding/spaltning, absorption og toiletplask.
- Tændernes bevægelse og tyggeeffekten bruger samme fysiologiske fase. Peristaltik og kemiske effekter udløses af scenens bevægelses- og reaktionstrin, ikke af et uafhængigt lydur.
- En vedvarende lydgraf genbruges. Højst tre korte effektstemmer og ét miljølag kan være aktive. Effekterne varierer lidt i hastighed; bløde overgange og lave niveauer begrænser hård gentagelse.
- Browserens brugerinteraktion kræves, før en AudioContext åbnes. Mute, lydstyrke, miljølyde og effektlyde gemmes. Læsning, pause, skjult fane og navigation stopper lyden passende. Lydmangel blokerer ikke spillet.

## Sluttest og kliniske perspektiver

- De faglige slutspørgsmål og kanoniske svaridentiteter er bevaret. Visningsrækkefølgen blandes, og scoring afhænger af det valgte svars identitet.
- Efter hvert svar vises en kort forklaring. Spilleren fortsætter selv til næste spørgsmål.
- Forkert besvarede spørgsmål kan repeteres særskilt. Repetition ændrer ikke det oprindelige resultat og gemmes ikke som en ny fuld sluttest. Historiske resultater og ufærdige normale tests bevares.
- Tre frivillige kliniske perspektiver kan åbnes fra et diskret ikon: syrehæmning og pepsin i mavesækken, bugspytkirtelinsufficiens og fedtmalabsorption i duodenum samt diarré/vandtab/dehydrering i colon. De afbryder ikke spillet automatisk.

## Berørte filer

- `public/digestion-game.js`: kompakt betjening, vedvarende pointer, læringslog, frivillige kliniske oplysninger, sekvenser i eget tempo, lydintegration og sluttest/repetition.
- `public/digestion.css`: responsiv bundbjælke, diskrete pointer, ikoner, læsepanel og kortplacering.
- `public/digestion-world.js`: absorption i det eksisterende organ, stabilt kamera, lokal epitelgennemskæring og fysiologiske lydhændelser.
- `public/digestion-learning.js`: kuraterede korte pointer, længere forklaringer, log og kliniske perspektiver.
- `public/digestion-presentation.js`: genkendelige molekyle-, enzym- og organikoner.
- `public/digestion-absorption.js`: eksplicitte transportveje gennem epitelet til blod eller lymfe.
- `public/digestion-audio.js`: original syntese, miljøprofiler, fælles tyggefase og styret Web Audio-livscyklus.
- `public/digestion-data.js`, `digestion-engine.js`: absorptionsdata, validering af nye felter og kompatibilitet med gamle data.
- `test/digestion*.test.js`, `tests-browser/digestion.cjs`, `tests-browser/digestion-audio.cjs`: automatiseret kvalitetssikring.
- `package.json`, `package-lock.json`, `public/app.js`: appversion og tilføjelse af lydens browsersuite.

## Kontrol

- 126 Node-tests består, inklusive 25 eksisterende fordøjelseskontroller og 8 nye kontroller af læringspointer, gemninger, absorptionsveje, ikoner og lyd.
- Alle 12 browser-testsuiter består lokalt. Fordøjelsessuiten gennemfører de tre karakterer på både desktop og mobil: seks gennemspilninger med 15 stop, kompakt betjening, læsning i eget tempo, læringslog, kliniske perspektiver, uændret lumenkamera under absorption, sluttest, fejlrepetition og gamle gemninger.
- Lydens særskilte browsersuite bruger rigtig Web Audio på desktop og emuleret mobil. Den kontrollerer brugeraktivering, faktisk gain/lydstyrke, mute, fysiologisk tyggehændelse, alle otte miljøprofiler på den fulde rute, hoste ved trachea, toiletplask, højst fire samtidige stemmer, samme AudioContext, læsepause og oprydning. En browser uden AudioContext kan fortsætte spillet.
- Regressionstestene består for Blodcellens tre ruter, lyd, anatomi, kort, 3D, kredsløbsøvelser, navigation, data, fokus, sikkerhed og viewport/rotation.
- `npm run build` består, inklusive JavaScript-kontrol, leverandørfiler og relative GitHub Pages-stier. `git diff --check` består.
- Screenshots af den kompakte betjening på desktop og mobil samt absorption i tarmmiljøet er visuelt gennemset. Ekstra mobilgennemspilninger kontrollerer animeret amylase-, pepsin- og lipasespaltning, intakte enzymer, glukose-/aminosyretransport til blodet, chylomikrontransport til lymfen og manuel kamerarotation.

## Kendte begrænsninger

Modellerne er skematiske og bruger forskellige størrelsesforhold for molekyler og organer. Den gennemsigtige epitelgennemskæring er en undervisningshjælp, ikke en ekstra åbning i tarmen. Lipidernes lymfevej gælder især langkædede fedtsyrer.

Lydene er syntetiske, stiliserede organiske lyde, ikke kliniske lydoptagelser. Browserens regler kan kræve et nyt klik for at genstarte lyd. Ved manglende Web Audio kan hele læringsforløbet bruges uden lyd.

Mobilkontrol foregår med Chromium og emuleret touch, skærmstørrelse og rotation. Der er ikke udført afprøvning på fysiske iOS-/Android-enheder eller en subjektiv høretest på forskellige telefonhøjttalere.
