# Trabeculae carneae — version 0.8.0

Brugerens referencebillede er brugt som visuel inspiration til afrundede muskelbjælker, recesser, papillærmuskler og den tydelige adskillelse fra chordae tendineae. Billedet er ikke kopieret ind i spillet. Geometri og vævstekstur er genereret i projektet uden nye modeller, eksterne tjenester eller licensafhængigheder.

## Anatomisk fremstilling

- Trabeklerne er uregelmæssige muskulære forhøjninger på ventriklernes endokardiebeklædte inderside. Grundrelieffet er en del af **én sammenhængende vægflade**, frem for de tidligere løse kapsler og rør.
- Forgrenede, afrundede bjælker afgrænser blinde intertrabekulære recesser. Recesserne er ikke huller gennem myokardiet.
- Enkelte korte muskelbroer er forankret i væggen i begge ender med en fri midterdel. De ligger langs væggen og spærrer ikke kameraets centrale passage. De skal ikke forveksles med en specifikt placeret moderatorbåndsmodel.
- Højre ventrikel har grovere trabekler. Venstre har finere og tættere trabekulation. **Den tykkere kompakte væg i venstre ventrikel betyder ikke, at dens trabekler skal være grovere.** Den tidligere fejlagtige sammenkobling mellem vægtykkelse og grovere relief er fjernet.
- Overgangen ved klapannulus og mod ventriklernes udløb er glattere. Der tilføjes ikke ventrikulære trabekler til atrier, arterier eller semilunarklappernes rødder.
- Papillærmusklerne har en afrundet, tilspidset form med basis i væggen. De er tydeligt forskellige fra det lavere trabekelrelief. Antal muskelgrupper, chordae-tilhæftninger, klapflige og åbningstider er bevaret.
- Væg, relief og muskelbroer følger samme kontraktion. Reduceret bevægelse viser den samme tredimensionelle anatomi uden animation.

Det er fortsat en **idealiseret undervisningsmodel**, ikke et patientbaseret eller klinisk valideret anatomisk atlas. Lokal skala, lys, mængden af blodceller, trabeklernes individuelle forløb og kameraets rute er forenklet. Anatomiske hovedrelationer prioriteres frem for at hævde, at billedets præcise geometri eller en bestemt patients hjerte er rekonstrueret.

## Arkitektur og ydelse

`public/journey-myocardium.js` genererer et deterministisk, periodisk net af buede bjælker. Et glat, begrænset relief forskyder den eksisterende væg ind mod lumen; der udskæres ingen huller. `journey-3d-anatomy.js` bruger dette i højre/venstre kammermiljø, og `journey-valves.js` bruger samme model i ventrikelvæggen bag AV-klapperne. De tidligere instancer af kapsler og separate længdegående trabekelrør er fjernet.

Vævet har en lille original tekstur og en diskret farvevariation, der fremhæver recesser. Papillærmusklernes farveattributter er eksplicit angivet, så de ikke bliver sorte ved brug af fælles vævsmateriale. Geometrien opbygges ved sceneskift og genbruges; netværket genberegnes ikke for hvert billede. Den lettere kammermodel har omkring 41.000 trekanter, og høj kvalitet omkring 92.000, plus et lille antal muskelbroer. Det er stadig nødvendigt at teste ydelse på fysiske telefoner; software-WebGL i udviklingsmiljøet dokumenterer ikke 60 FPS på en bestemt enhed.

Kameraets observationspunkt i ventriklerne ligger tidligere i kammeret, så de studerende ser den trabekulerede del, inden de nærmer sig det glattere udløb. De to svarmarkører er flyttet tilsvarende. Ruter, svar, to liv, tre sværhedsgrader, lydlag og alle eksisterende lagringsnøgler er uændrede.

## Verifikation

- `test/journey-myocardium.test.js`: grov/fint relief, periodiske og glatte grænser, én væg uden utilsigtede huller, budget for mobilgeometri, fravær af gamle svævende kapsler, ingen ventrikeltrabekler i atrier/arterier, korrekt belyste papillærmuskler og muskelbroer med to fastgjorte ender og fri central passage.
- De eksisterende tests af ruter, geometri, klapper, lyd og gemt progression køres fortsat.
- Browserkontrollen gennemspiller alle tre niveauer. Den detaljerede anatomitest tager også billeder af højre/venstre ventrikel på computer og mobil, kontrollerer grafikbudget, synlige svar, reduceret bevægelse og passage gennem klapperne.
- GitHub Pages-workflowen bygger og tester den statiske app under projektets undermappe før offentlig udgivelse.
