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
