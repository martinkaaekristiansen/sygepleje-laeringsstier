# CODEX – samlet implementeringsbrief: Fordøjelsens vilde rejse

## Opgave og kilder
Du arbejder i det eksisterende GitHub-repository `martinkaaekristiansen/sygepleje-laeringsstier`, med et Three.js-baseret 3D-spil til sygeplejestuderende på 1. semester. **Læs hele denne fil, `BILLEDOVERSIGT.md`, alle billeder i `screenshots/`, og `KILDE_hele_worddokumentets_tekst.md` før kodeændringer.** Original Word-fil er vedlagt som ekstra dokumentation. Hvis du ikke kan se billederne, sig det eksplicit; gæt ikke. Undersøg faktisk filstruktur og relevante eksisterende spilkomponenter, før du ændrer kode. Genbrug systemer fra Blodcellens rejse, hvor det er hensigtsmæssigt.

**Start med en kort plan og implementér derefter i overskuelige faser; test hver fase.** Prioritér de konkrete ønsker nedenfor over ældre, generelle forslag i den lange kildetekst. Undgå at lave en ny app fra bunden.

## Prioriterede, konkrete rettelser fra dokumentet

### 1. UI, interaktion og visuel tydelighed
- **Altid høj grafikkvalitet**: fjern brugerindstillingen til at vælge grafikniveau, men implementér fortsat nødvendige interne performanceoptimeringer. Hvis dette gør mobil ubrugelig, rapportér målinger og foreslå en løsning frem for stiltiende at genindføre indstillingen.
- **Ingen klik på 3D-anatomien** for at vælge vej eller svar. Valg skal kun kunne foretages via de eksisterende knapper. Dette nyere, eksplicitte krav har forrang over en ældre idé om klikbare anatomiske destinationer.
- **Undgå overlappende tekster og knapper** ved alle stationer, viewportstørrelser og spørgsmål. Knapper skal kun indeholde deres egen svartekst; labels, animationsnavne og andre elementer må ikke flyde ind over dem.
- Ved alle anatomiske vejvalg: vis den eksplicitte overskrift **"Hvad er næste anatomiske struktur?"** over de to valgmuligheder i en kompakt, læsbar boks i samme visuelle stil som første spil. Undgå at dække den centrale 3D-anatomi. Bevar de korrekte anatomiske vejvalg og danske/latinske navne.
- Flyt **enzym og substrat i mundhulen frem i synsfeltet**; de må ikke være skjult bag geometri. Kontrollér samme synlighed ved alle enzymreaktioner i hele spillet, inkl. mobile visninger og kameraets forskellige kiggevinkler.
- Hvert enzym skal have **unik genkendelig form og egen farve**, ikke blot samme model med ny farve. Ikonet ud for enzymnavnet skal præcist matche enzymets visuelle identitet i 3D. Skeln tydeligt mellem substrat, enzym og produkt.
- **Organikoner** skal ligne omridset af det navngivne organ, ikke være generiske symboler; brug passende forenklede anatomiske silhuetter.
- **Informationsfeltet** skal kun vise oplysninger relevante for det aktuelt valgte molekyle (stivelse, triglycerid eller protein). Undgå proteinoplysninger under stivelsesrejsen, osv. Korte, permanente forklaringer skal kunne læses i eget tempo.
- Fjern **de tre knapper i informationsboksen øverst til venstre** som vist i kildedokumentet, og fjern også de tilhørende funktioner/valgmuligheder i indstillinger. Bevar selve den nyttige faglige information uden de ekstra kontroller. Undersøg hvad knapperne gør, før du fjerner dem, så du ikke utilsigtet fjerner nødvendige kernefunktioner.

### 2. Epiglottis og synkning
- Udskift ring-/røragtig epiglottis med en **genkendelig bladformet, let krum bruskskive**, bredere øverst og smalnet ved tilhæftning, slimhindebeklædt, afrundet og anatomisk placeret bag tungeroden ved larynxindgangen.
- Vis korrekt relation mellem radix linguae, pharynx, aditus laryngis, larynx, trachea og oesophagus; oesophagus ligger posteriort for trachea.
- Animér koordineret synkning: tungen fører bolus bagud, pharynx kontraherer, larynx løftes/føres frem, epiglottis bøjes bagud/nedad, luftvejen beskyttes via flere mekanismer, øvre oesophagussfinkter åbner, bolus passerer til oesophagus. Epiglottis må **ikke** fremstilles som eneste lukning af luftvejen.
- Bevar knapvalg oesophagus (korrekt) / trachea (forkert); diskret hostelyd og retry ved fejl. Stabilt kamera under valg; kig rundt uden automatisk zoom. Vis kort permanent forklaring.

### 3. Tyndtarmens slimhinde: "langsomt bølgende koralrev"
- Erstat **fritstående perfekte ringe** og **spidse polygonpigge** med sammenhængende, brede, uregelmæssige **plicae circulares** og tætstående, finger-/bladformede **villi intestinales**, afrundede og integreret i slimhinden. Mikrovilli må ikke fremstå som store selvstændige strukturer.
- Giv villi små, langsomme, faseforskudte, fysiologisk plausible bevægelser som et **stille bølgende koralrev**. Villi skal forblive forankrede og ikke ligne søanemoner. Lad dem følge tarmvæggens deformationer.
- Differentier duodenum, jejunum (særligt fremtrædende folder/villi) og ileum (generelt mindre fremtrædende folder/kortere villi). Brug fugtige, bløde slimhindematerialer og passende lys/dybde.
- Vis absorption **direkte i lumen ved villusoverfladen, uden zoom til mikrovilli**: glukose og aminosyrer videre til blod, fedtstoffer ind i enterocytter og chylomikroner videre til lymfe. Undgå at vise fedt som uændrede triglycerider, der blot diffunderer til lymfen.
- Optimer med instancing/LOD/shaders efter behov, men bevar den ønskede høje synlige kvalitet.

### 3b. Fjern kunstige navigationselementer og ekstra absorptionsstruktur (eksplicitte billedrettelser)
- **Fjern ringene, der illustrerer næste anatomiske struktur, i HELE spillet** (se `screenshots/screenshot_05.png`). De store fritstående ringe/portaler er ikke anatomi. Bevar navigation via knapper og naturlige anatomiske åbninger/sfinktere. Skeln mellem kunstige portalringe og reelle slimhindefolder, som skal bevares.
- **Fjern den ekstra kunstige struktur, der vises under absorption** (se `screenshots/screenshot_06.png`). Bevar spørgsmålene, men vis kun de relevante næringsstoffer, som bevæger sig mod slimhinden og forsvinder ved optagelse. Ingen separat absorptionsportal, ekstra tunnel, flydende model eller kamera-zoom. Transport til blod/lymfe kan forklares diskret og korrekt uden ekstra scenestruktur. Dette nyere konkrete krav har forrang over tidligere forslag om synlige store transportkanaler.

### 4. GI-motilitet i hele forløbet
- Skab **fysiologisk forskellige** organbevægelser, som deformerer væggen og påvirker indholdet; undgå én universel pulserende tunnelanimation.
- Mund: tygning/tungebevægelse. Pharynx: koordineret synkning. Oesophagus: fremadskridende peristaltisk kontraktion **bag bolus**, afslapning foran.
- Mavesæk: proximal accommodation, antral peristaltik, blanding, pylorusbegrænset passage og retropulsion.
- Duodenum/jejunum/ileum: segmentering og fremaddrivende peristaltik; blid villusbevægelse oveni. Ileocøkal overgang skal vise kontrolleret passage.
- Caecum/colon: lokale haustrale kontraktioner og sjældnere større fremaddrivende bevægelser; colon er ikke bare tyndtarm med større diameter. Rectum/anus: fyldning, defækationsrelateret refleks og koordineret sfinkterafslapning ved afslutning.
- Synkronisér diskrete passende lyde og transport af partikler. Kamera skal stå stille under spørgsmål og ved ventetid, men spilleren skal kunne kigge rundt.

### 5. Ileum → caecum → appendix/colon ascendens
- **Illustrér tydeligt selve udgangen fra ileum til caecum**, inklusive ileocøkalovergangen og slimhindefolder omkring ostium ileale. Undgå fritsvævende store ringe.
- Caecum skal være en **sækformet, blindt endende udvidelse**, med bund inferiort for ileums indmunding; colon ascendens skal være en bredere, naturlig fortsættelse opad.
- Appendix vermiformis er et **smalt, blindt endende vedhæng** fra caecums posteromediale væg inferiort for ileocøkalovergangen. Det må ikke ligne et løst påsat rør eller en lige stor alternativ tunnel.
- Vis anatomisk plausibel størrelse, tilhæftning og åbning. Bevar knapvalget **"Blindtarmsvedhænget – Appendix vermiformis"** (forkert blindgyde) / **"Opadstigende tyktarm – Colon ascendens"** (korrekt). Ingen klik direkte på 3D-strukturer.
- Vælg en kameravinkel, hvor ileums indmunding, caecums bund, appendix' lille åbning og colon ascendens kan skelnes. Lokal blanding og rolige kontraktioner; ikke ballonpulsation.

### 6. Colon-kamera, tilbageblik og toiletfinale
- **Ret kameraet i colon**: det peger ifølge brugerens dokument direkte ind i væggen, så man ikke kan se forløbet. Korrigér kamerarute, tangenter, offset, orientering og collision/clipping gennem ascendens, transversum, descendens og sigmoideum; kontrollér overgangene.
- Når spilleren **kigger rundt**, skal vedkommende også kunne se **tilbage mod den retning, man kom fra**. Fjern eventuelle unødvendige rotationsbegrænsninger, men undgå at kameraet går gennem tarmvæggen. Hold kamerastilling stabil under pause/spørgsmål.
- Ved **toiletfinalen** skal man ramme vandet **oppefra**, ikke se indfaldet fra siden. Korrigér kamerabanen, vandfladens placering, perspektiv og splash-animation. Bevar den humoristiske afslutning.

## Prioritet ved modstrid
1. Senere, korte og specifikke brugerrettelser i begyndelsen/slutningen af Word-dokumentet har forrang over ældre lange indlejrede prompter.
2. **Kun knapvalg** har forrang over ældre forslag om at klikke på anatomi.
3. **Ingen zoom til mikrovilli** har forrang over ældre forslag om mikro-zoom.
4. **Korte, vedvarende forklaringer** har forrang over tidsbegrænsede beskeder.
5. Anatomisk/fysiologisk korrekthed har forrang over dramatiske animationer; lav gerne tydelige, men ikke misvisende bevægelser.
6. Hvis der stadig er en konflikt, dokumentér den og spørg før en irreversibel ændring.

## Arbejdsfaser og acceptkriterier
**Fase A – audit og UI:** Find de aktuelle filer, beskriv arkitekturen, gennemgå billedoversigten; løs knapoverlap, tydeligt anatomisk spørgsmål, kun knapvalg, ikonmatch, organikoner, molekylespecifik information og fjernelse af de tre infoknapper. Kontroller desktop/mobil.

**Fase B – anatomi:** Epiglottis/synkning, plicae/villi, ileocøkal overgang, caecum/appendix og colon-geometri. Visuelle screenshots før/efter og anatomisk validering.

**Fase C – bevægelse og absorption:** Organspecifik motilitet, animation af næringsstoffer ved villi uden mikrozoom, synkroniseret indhold og lyde. Verificér at substrat/enzym/produkt er synlige.

**Fase D – kamera og afslutning:** Colon-rute uden vægkollisioner, frit tilbageblik, ingen kameradrift ved ventetid, toiletvand ramt ovenfra.

**Fase E – regression:** Test alle tre molekylerejser og alle anatomiske stationer; knapnavigation, responsivitet, lyd/mute, lagring, quiz og GitHub Pages. Kør relevante npm-tests, browser- og 3D-tests, hvis de findes. Rapportér faktisk udførte tests og eventuelle mangler; påstå ikke at noget er testet uden at have kørt det.

**Vigtigt:** Implementér ikke alt i én ukontrolleret ændring. Afslut hver fase med konkret oversigt over ændrede filer, før/efter-billeder hvis muligt, testresultater og tilbageværende problemer. Kildeteksten indeholder yderligere detaljer, som skal læses, ikke ignoreres.
