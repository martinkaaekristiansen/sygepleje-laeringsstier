# Fordøjelsens vilde rejse

Ny læringsaktivitet med id `fordoejelsens-vilde-rejse`, placeret på 1. semester under Anatomi og fysiologi. Det tidligere fjernede indhold med id `fordoejelse` genåbnes ikke.

## Opbygning

- `digestion-data.js`: 18 anatomiske afsnit, karakterer, 27 enzymdelopgaver, ni ordnede reaktionsforløb og tre absorptionsforløb.
- `digestion-engine.js`: rene tilstandsovergange, liv, genstart, entydig scoring og validering af gemte data.
- `digestion-world.js`: én Three.js-renderer og ét kamera. Procedurale mund-, mave-, tyndtarms- og colonmiljøer; molekylestrukturer, enzymfigurer, hydrolyse, villus, enterocyt og membranvisninger. Geometrier og materialer frigives ved sceneskift. Rendering stopper ved skjult fane og respekterer reduceret bevægelse.
- `digestion-game.js`: interaktioner, sekvenser med spring-over, danske/latinske navne, dynamisk pH, karaktervalg, lyd, resultater og genoptagelse. Genbruger `lockGameViewport` og original lydsyntese fra kredsløbsspillet.
- Appens eksisterende IndexedDB, versionskontrol ved flere faner, sikkerhedskopiering, navigation og gennemførelses-id'er anvendes. Ingen nye tjenester eller eksterne grafik-/lydfiler.

Stanley blev implementeret og gennemspillet først. Derefter blev Trines og Pouls data og særlige absorptionsforløb føjet til samme motor.

## Faglige afgrænsninger

Modellen illustrerer principper og er ikke målfast eller patientbaseret. Enzymernes figurer er stiliserede proteinformer; farver og aktive sites er pædagogiske symboler, ikke krystallografiske strukturer. Molekylereaktionerne vises som skematiske spaltninger, ikke atomistiske simuleringer. Mikrozoom skifter mellem diskrete 3D-scener med tilnærmelse i kameraet; det er ikke en kontinuerlig geometrisk skalamodel. Molekyletransport vises skematisk med forklarende tekst.

De anatomiske overgangsstrukturer vises uden spørgsmål. Appendix er en blind sidegren. Absorptionen vises i jejunum; en tydeligt markeret ufordøjelig rest fortsætter via ileum til colon og anus. Mavesæk og tarm vises hovedsageligt indefra; de indvendige flyvebaner er forenklede.

pH er en gradvist interpoleret, vejledende undervisningsværdi, ikke en måling. Maveværdien påvirkes af måltider og syresekretion, og enzymaktivitet varierer gradvist med miljøet.

Væsentlige præciseringer i forhold til oplægget:

- Lingual og gastrisk lipase bidrager til præduodenal fedthydrolyse, selv om hovedparten hos voksne foregår i tyndtarmen.
- Pankreaslipase giver især 2-monoglycerider og frie fedtsyrer; ikke primært frit glycerol.
- Galde er ikke et enzym. Miceller afleverer produkter ved epitelet; chylomikroner dannes i enterocytterne og transporteres især via lymfen.
- Denaturering ændrer proteinets foldning; hydrolyse spalter peptidbindinger.
- SGLT1 og GLUT2 vises for glukose; PEPT1 og aminosyretransport for proteinprodukter. Den viste fedtvej gælder især langkædede fedtsyrer.

Grundlag til faglig efterprøvning: OpenStax *Anatomy and Physiology 2e*, kapitel 23 om fordøjelse og absorption; NCBI Bookshelf, *Physiology, Digestion* og *Physiology, Nutrient Absorption*. Denne implementering er ikke godkendt af en ekstern fagperson. Underviser bør efterprøve niveau, nomenklatur, enzymforklaringer og visuelle forenklinger før brug til bedømmelse.

## Afprøvning

`test/digestion.test.js` kontrollerer rækkefølge, overgange, karakterafhængige mekanismer, tre obligatoriske boss-stop, liv, unik scoring efter gentagelser, absorptionsforløb, datavalidering og bevarelse af gamle data.

`tests-browser/digestion.cjs` gennemspiller alle tre rejser med de ni enzymdelopgaver i hver, bygger reaktionsrækkefølger, kontrollerer alle mikrozoomtrin og perspektivskift, finale, trofæer, genindlæsning, genstart, grafik-/bevægelsesindstillinger, mobilbredde, geometribudget og oprydning. De øvrige browsertests afprøver fortsat blodspillet og de eksisterende læringsstier.

Filmsekvenser kan springes over. Reduceret bevægelse giver statiske demonstrationer med samme tekst og læringsopgaver. Automatisk grafik begrænser pixeltæthed; Lav sænker den yderligere. Lyd kræver brugerhandling og er valgfri.

## Spilversion 2.0 – ændringer og kontrol

Implementeringsplanen blev gennemført i logik/lagring, organmodeller, overgange, molekylereaktioner, absorption/pH, finale/resultater og samlet test.

Nye moduler:

- `public/digestion-anatomy.js`: asymmetrisk mavesæk, C-formet duodenum, forskellige jejunum-/ileumprofiler, colonhaustra, anatomiske kendetegn og fremadgående peristaltisk bølge.
- `public/digestion-molecules.js`: sammenhængende molekylære enheder og eksplicitte forbindelser. Hydrolyse skjuler udvalgte α-1,4-, ester- eller peptidbindinger, mens fragmenterne forbliver sammenhængende. α-1,6-forgreninger og triglyceridets midterste esterbinding bevares i de relevante illustrationer.
- `public/digestion-assessment.js`: næringsstofspecifik absorptionsopgave og fem afsluttende forståelsesspørgsmål pr. karakter. Facit og forklaringer vises efter aflevering; testhistorik gemmes separat fra trofæer. Uafsluttede tests kan genoptages.

Eksisterende moduler er videreudviklet: `digestion-world.js` bevarer organmiljøet gennem opgaver og reaktioner og det samme mikromiljø gennem kameraets skalaniveauer. Det begrænser ny geometri og GPU-frigivelser. Organovergange bruger kameraindflyvning og kort overlap; reduceret bevægelse bruger direkte, statiske visninger. `digestion-game.js` håndterer aktiv tid, pause, skjulte faner, pause af sekvenstimer, drag/drop til produktionssted med tastatur-/knapalternativ, tilfældige svarplaceringer, valg af absorptionsvej og separate testresultater. `digestion.css` understøtter pH-intervaller, relativ aktivitet og anatomiske etiketter. Engine, Node- og browsertests er udvidet.

Dokumenterede fejl/svagheder:

- Dato-minus-start medregnede tid uden for spillet. Nye gennemspilninger bruger et monotont, sessionslokalt ur og gemmer aktiv spilletid. Pause, indstillinger, skjult fane og menu tæller ikke med. Historiske tider fra før v2 bevares og mærkes som historiske; de kan ikke rekonstrueres præcist. Checkpoints gemmes hvert femte sekund samt ved handlinger og faneskift; ved et brat browsernedbrud kan de sidste sekunder mangle.
- Fast rotation af svar og faste reaktionskort kunne udnyttes. Begge blandes nu med Fisher–Yates; tastaturvalg følger synlig placering.
- Reaktionsrækkefølger bedømmes nu af en direkte, særskilt validator med afvisning af dubletter, ufuldstændige og ukendte trin. Regressionstesten verificerer, at en forkert rækkefølge koster et liv og ikke giver point eller adgang til reaktionen.
- Lagringsformatet accepterer fortsat ældre gennemførelser og manglende nye felter. Sluttest, kladde og nye absorptionstilstande valideres særskilt.

### Kendte begrænsninger og manuel kontrol

Organer, skalaovergange, aktive sites og transportproteiner er didaktiske modeller, ikke patientanatomi eller proteinstrukturer baseret på atomdata. Mavesækkens form, orientering, portplacering og de synlige folder bør gennemgås visuelt af en anatomiunderviser. Skalaniveauerne deler et miljø, men bruger forskellige geometriske forstørrelser; skalaangivelserne er vejledende, ikke målestokke.

Den relative pH-aktivitet er en glat, skematisk kurve, som alene viser pH-bidraget. Den er ikke en målt kinetisk kurve og tager ikke højde for koncentration, temperatur, cofaktorer eller hele fødebolussens sammensætning. Den vises kun ved relevante enzymstop. En farmakologisk/fysiologisk fagperson bør kontrollere de valgte intervaller og undervisningsforklaringer.

Glukose, natrium og Na⁺/K⁺-ATPase, peptidtransport samt lipidernes reesterificering/lymfevej bør afprøves fagligt i den animerede visning. Transportfigurer er symboler. Ny sluttest og hjælpetekster kræver undervisers vurdering af niveau og formuleringer. Der er ikke registreret ekstern faglig godkendelse.

Test dækker forkerte/korrekte rækkefølger, kemiske bindingsvalg i modellerne, alle tre rejser, tre absorptionsvalg, pH-kurver, pause/aktiv tid, historiske data, særskilt testhistorik, mobil-/tablet-/desktopbredder, geometri og oprydning. De øvrige læringsstiers tests køres fortsat gennem den eksisterende Pages-workflow.
