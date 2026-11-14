# Fordøjelsens vilde rejse — anatomisk rute og molekyleforløb

Appversion 0.14.0. Opdateringen bygger videre på den eksisterende Three.js-renderer, organmodeller, lydsyntese, IndexedDB og spilcontroller.

## Implementeret

- Fælles rute med præcis 15 stop: Cavitas oris → Pharynx → Epiglottis → Oesophagus → Ventriculus / Gaster → Duodenum → Jejunum → Ileum → Caecum → Colon ascendens → Colon transversum → Colon descendens → Colon sigmoideum → Rectum → Anus. Dansk og latin vises samtidigt.
- Epiglottis er et observations- og beslutningspunkt. Synkning viser beskyttelse af larynxindgangen; føden fremstilles ikke som passerende gennem epiglottis. Cardia og pylorus indgår fortsat i mavesækkens model, men tæller ikke som selvstændige rutepunkter.
- To blandede anatomiske svar ved hvert valg, med én korrekt næste struktur og en rigtig anatomisk struktur som distraktor. Forklaringerne er lokationsspecifikke. Ansigtets mund/næse, epiglottis' oesophagus/trachea og caecums colon ascendens/appendix er bevaret. »Bliv her og undersøg« er fjernet som svar; manuel kiggen og centrering er særskilte kontroller.
- Tre blandede svar til alle biokemispørgsmål. De tidligere klik-i-rækkefølge-opgaver er erstattet med de ønskede spørgsmål om enzym, kilde og produkt.
- Stanley: 3 spørgsmål i munden, 3 i duodenum og 3 i jejunum. Ingen enzymopgave i mavesækken. Polysakkarid → kortere kæde → maltose → glukose. Maltose beskrives som et udvalgt produkt; amylase danner også andre korte kulhydrater.
- Trine: 5 spørgsmål i duodenum. Galde fra leveren emulgerer uden at hydrolysere. Bugspytlipase spalter især esterbindingerne i position 1 og 3; bindingen i position 2 bevares. Ingen særskilte opgaver om lingual eller gastrisk lipase.
- Poul: 3 spørgsmål i hver af mavesæk, duodenum og jejunum. Pepsinogen/HCl, denaturering og pepsin; trypsinogen og korrekt aktivering ved enteropeptidase; peptidaser ved børstesømmen og i cellen. Ingen særskilt enteropeptidaseopgave.
- Udskilte enzymer vises, når deres kilde er besvaret. Kirtler, udførselsgange og væskestrømme genbruges. Proteinforstadier skifter farve under aktivering. Børstesømsenzymer sidder ved epitelet.
- De synlige næringsstofmodeller har forskellige strukturer mellem scener: stivelse 14 → 6 → 2 → 1 glukoseenheder; protein 12 → 6 → 3 → 1 aminosyreenhed. Enzymreaktioner skjuler udvalgte bindinger og frigiver sammenhængende fragmenter. Lipidprodukterne bevarer glycerol med den midterste fedtsyre og viser de to frigivne fedtsyrer.
- Korte absorptionsscener viser tarmlumen, børstesøm/enterocyt, blodkapillærer og lymfe med en fast kameravinkel. Glukose vises med koblet Na⁺-transport og diskrete transportører; aminosyrer følger blodet. Langkædede lipidprodukter optages fra miceller, triglycerider gendannes i enterocytten og chylomikroner følger lymfen. Micellen fortsætter ikke ind i lymfen.
- Efter absorption bliver både model, tekst og videre progression til en ufordøjelig rest. Det absorberede næringsstof følger ikke med til anus. Den afsluttende toiletsekvens bevares.
- Den ubegrænsede fremadbevægelse langs organets kamerabane er fjernet. Kameratransitionen afsluttes efter 1,1 sekund målt i faktisk tid, også ved lav billedhastighed; position, blikpunkt og synsfelt står derefter stille ved valg. Manuel mus-/touchrotation og fysiologiske animationer er bevaret.
- To liv, genstart af den aktuelle udfordring, sluttest, gemte resultater og de tre karakterer er bevaret. Genstart efter en anatomisk fejl gentager ikke allerede afsluttet biokemi.
- Gamle 18-punktspositioner oversættes til sikre 15-punktscheckpoints. Den aktuelle gamle udfordring kan starte forfra. Tidligere trofæer og testresultater bevares, også når et tidligere ekstra stop fjernes. Nye gemninger har `routeVersion: 3`.

## Fælles brugerflade med Blodcellens rejse

`journey-ui.js` udtrækker de faktiske svar-knapper, kropssilhuet, topmenu og indstillingsramme fra Blodcellens rejse. Begge spil bruger komponenterne. Fælles eksisterende CSS bruges til typografi, knapmarkering, indstillingspanel, liv, fremdrift og kort. Blodcellens ruter og spilmekanik er uændrede.

Fordøjelsens kropskort bruger den fælles frontvendte silhuet. Markøren følger de 15 punkter; gennemført forløb er gult og resten stiplet. Colon ascendens ligger på patientens højre side, dvs. til venstre for beskueren. Indstillinger pauser spillet, og lydstyrke, lyd, bevægelse og grafikkvalitet gemmes. Tastaturbetjening: Tab/Enter, venstre/højre pil og 1–3; Escape lukker indstillinger.

## Ændrede filer

- `public/digestion-data.js`: rute, spørgsmål, produktnavne og næringsstofindhold.
- `public/digestion-navigation.js`: to anatomiske hypoteser, distraktorer, forklaringer og kropskort.
- `public/digestion-engine.js`: progression, variable opgaveantal, sikre gamle gemninger og resultatvalidering.
- `public/digestion-game.js`: fælles brugerflade, de tre molekyleforløb, spørgsmål, sekvenser og gemte indstillinger.
- `public/digestion-world.js`, `digestion-anatomy.js`, `digestion-molecules.js`, `digestion-secretions.js`: molekyleformer, reaktioner, epiglottis, sekreter, absorption og kamerastabilitet.
- `public/digestion-assessment.js`: sluttest til det nye fokus og absorption uden krav om transportørnavne.
- `public/digestion.css`: mobil- og desktoplayout.
- `public/journey-ui.js`, `blood-game.js`, `journey-guide.js`, `blood-fullscreen.css`: fælles komponenter og styling.
- `test/digestion.test.js`, `tests-browser/digestion.cjs`: opdaterede automatiske kontroller.
- `package.json`, `package-lock.json`, `public/app.js`: appversion 0.14.0.

## Verifikation og begrænsninger

- 118 Node-tests består, heraf 25 kontroller af fordøjelsesspillets data, progression, geometri og gamle gemninger.
- Alle 11 browser-testsuiter består lokalt. Fordøjelsestesten gennemfører Stanley, Trine og Poul både på desktop (1280 × 800) og emuleret mobil/touch (390 × 844): seks fulde gennemspilninger, 15 stop, korrekte svarantal, molekyletrin, absorption, restperspektiv, sluttests, trofæer, genstart, indstillinger, kamerastabilitet og genindlæsning af gamle positioner.
- Regressionstestene består for Blodcellens tre ruter, lyd, anatomi, kropskort, 3D, kredsløbsøvelser, appnavigation, datasikkerhed og viewport/rotation. Layout kontrolleres også ved 320 px.
- Ekstra mobilkontrol med faktiske touch-tap på svar og manuel kamerarotation: animeret amylase-, lipase- og pepsinhydrolyse med intakt enzym og videre absorption. Screenshots af reaktioner og absorptionsscener er visuelt gennemset. Lipidtransport kontrolleres til synlige chylomikroner i lymfen, med stabilt kamera.
- `npm run build` består med kontrol af alle JavaScript-moduler, leverandørfiler og relative GitHub Pages-assetstier. `git diff --check` består.

Udgivelse: version 0.14.0 på den eksisterende GitHub Pages-adresse, gated af workflowets Node-tests og alle browser-tests før deployment.

Grafikken er fortsat en stiliseret undervisningsmodel. Organer, molekyler, sekreter og celler vises i forskellige skalaer. Aktivering af enzymforstadier og membrantransport vises skematisk med former, farver, bevægelse og korte forklaringer; de er ikke atomare simulationer.

Visuel kontrol er udført med Chromium/WebGL på computer og med emuleret mobil/touch. Der er ikke udført test på fysiske iOS-/Android-enheder eller manuel faglig godkendelse af en underviser.
