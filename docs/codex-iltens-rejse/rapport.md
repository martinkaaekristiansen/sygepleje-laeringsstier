# Iltens rejse – fra første åndedrag til sidste udånding

Status: visuelt godkendt af brugeren til udgivelse på `main` den 22. november 2026. Udviklet på **iltens-rejse-3d** fra `origin/main` ved **75d143d5239abc75992243bdb80bfbe19b9ba8c0**. Gendannelsespunkt: **backup-main-foer-iltens-rejse** på samme commit. Den faktiske deploymentstatus fremgår af repositoryets GitHub Actions.

[Galleriet med screenshots og H.264-videoer](galleri.html) · [Analyse og genbrug](analyse-og-genbrug.md) · [Måledata](performance/maalinger.json)

## Spillets opbygning

Spillet er en selvstændig læringssti i det eksisterende katalog. Let, Mellem og Svær gennemgår den samme komplette fysiologi. Let bruger danske betegnelser og færre anatomiske stop. Mellem kombinerer dansk og latin. Svær bruger primært latin og flere anatomiske vejvalg.

Den samlede rejse har 58 stationer. Indgange og udgange gennem mund og næse er begge rigtige. Højre og venstre hovedbronchus er også begge rigtige; den valgte lunge bruges under hele ud- og hjemrejsen.

1. O₂ uden for ansigtet → næse eller mund → fælles pharynx → larynx → trachea og mucociliær demonstration.
2. Valgt hovedbronchus → bronchier → bronkioler → terminal bronkiole → respiratorisk bronkiole → alveolegang → alveolesæk → alveole.
3. O₂-diffusion over alveole-kapillærbarrieren → erytrocyt → hæmoglobinbinding.
4. Lungekapillærer → lungevenoler → lungevener → venstre atrium → mitralklap → venstre ventrikel → aortaklap → aorta → arterier → arterioler → vævskapillærer.
5. O₂ frigives til vævet og mitokondriet. Glukose, ilt og ATP illustrerer energiomsætningen. Et tydeligt skilt forklarer i 11 simulationssekunder skiftet til et **nyt metabolisk CO₂-molekyle**.
6. CO₂ diffunderer til blodet og følges hovedsageligt som hydrogencarbonat i plasma.
7. Venoler → vener → øvre hulvene → højre atrium → trikuspidalklap → højre ventrikel → pulmonalklap → truncus pulmonalis → valgt lungearterie → lungearterioler → lungekapillærer.
8. Hydrogencarbonat omdannes tilbage til CO₂ → CO₂ diffunderer til alveolen → samme luftvej følges tilbage → mund eller næse → udånding.
9. Fem tilfældige spørgsmål fra en pulje på 18 pr. niveau, feedback, resultat og repetition af fejl.

Valget af øvre hulvene følger den eksisterende undervisningsrute gennem højre overarms muskel. Den nedre hulvene er en anden normal returvej, ikke en anatomisk fejl.

## Én sammenhængende verden

Der er én Three.js-scene og én WebGL-renderer. Luftveje, fire hjertekamre, kar, alveole og vævscelle ligger i et fælles koordinatsystem. Modeller indlæses gradvist og genbruges ved genbesøg; der skiftes ikke til en separat blod- eller fordøjelsesscene. Kameraets position følger forbundne kurver, og dets opadretning genbruger fordøjelsesspillets stabile anatomiske kamerafunktioner.

Hjertets eksisterende ind- og udløb tilpasses med fælles transformationer, så forkamre, ventrikler og kar mødes. Kameraets passage af de fire klapper afventer den åbne fase i den eksisterende 70 slag/min-rytme. Åndedrættet bruger 14/min. Frit blik med mus, swipe og piletaster bevares, også når man ser tilbage på slimtransporten.

## Genbrugte komponenter

| Område | Genbrug |
| --- | --- |
| Ansigt og mund | `digestion-face.js`, `digestion-chewing.js`: samme ansigt, tænder, tandkød og tunge. Valgfri åbne næsebor gælder kun det nye spil. |
| Svælg og larynx | `digestion-swallow.js`: eksisterende tungerod, epiglottis, stemmefolder og åben larynxindgang. Luft følger en passage rundt om bladet. |
| Kamera og labels | `digestion-camera-frames.js`, `digestion-route-camera.js`, `digestion-anatomy-labels.js`: stabil horisont, mobilens synsfelt og skarpe labels med plads til svar/infoboks. |
| Hjerte og klapper | `journey-chambers.js`, `journey-valves.js`, geometri-worker/loader: kamre, klapsejl, chordae, papillærmuskler og trabekler. Valgfri fjernelse af forkamrenes ekstra udløbsklap undgår en dobbelt AV-klap i den fælles scene. Standardindstillingerne i det gamle spil er uændrede. |
| Kar, erytrocytter og blodstrøm | `journey-3d-geometry.js`, `journey-3d-anatomy.js`, `journey-physiology.js`: eksisterende biconkave formel, karmaterialer, implicit forgreningsgeometri og fælles advektionshastighed. En ekstra fjern-LOD til erytrocytter ændrer ikke de eksisterende kvalitetsniveauer. |
| Navigationsindhold | `blood-routes.js`: eksisterende anatomiske navne, beskrivelser og relevante fejlsvar/forklaringer. |
| Næringsstof | `digestion-molecules.js`: eksisterende glukosemodel i den korte ATP-illustration. |
| Lyd | `journey-audio.js`: samme syntese af respiration, hjertelyde og blodstrøm. Nye indstillinger gemmes i spillets eget felt. |
| Brugerflade og gemning | `journey-ui.js`, `blood-viewport.js`, `digestion-save.js`: toolbar, indstillinger, svarlayout, kropssilhuet, telefonviewport og serialiseret checkpointkø. |
| Sluttest | `digestion-exam-controller.js`, ny fælles `learning-assessment.js`: samme testforløb, feedback og repetition med indsprøjtet ilt-spørgsmålspulje. Oprindelige fordøjelsesfunktioner og ældre testresultater understøttes fortsat. |
| Performance | `digestion-performance.js`: automatisk renderbudget. Nye afstands-LOD'er og instancing påvirker baggrundsgeometrien, ikke læringsmål eller antallet af cilier. |

## Nye modeller og faglig formidling

**Næse og luftveje.** Åbne næsebor, septum, conchae og fælles mund-/næse-/svælghulrum. Trachea har C-formede bruskringe med bagudrettet åbning, særskilt membranøs bagvæg, bægerceller, slim og cilier. Bronchier har bruskplader og glat muskulatur; bronkioler har ingen brusk. Terminale bronkioler har endnu ingen alveoleåbninger. Åbne, afrundede alveoleudposninger begynder i den respiratoriske del og bliver talrigere i ductus/saccus.

**Mucociliær transport.** 1.152 instancerede cilier i trachea. Separat periciliært væskelag og gel/slimlag. Hurtigt effektivt slag mod pharynx og langsommere returslag med faseforskydning mellem cilier. Den markerede bakterie har én vedvarende identitet, følger væggen og forsvinder først, når den når den proximale ende. Baggrundsbakterier og partikler genbruges ved afsnittenes ender. Bevægelsen fortsætter, mens spilleren venter på et svar. Næsens slimtransport er rettet bagud mod pharynx; i trachea/bronchier er den opad. Retningen ændres ikke under eksspiration. Cilierne bliver færre distalt og mangler i alveolerne.

Demonstrationen varer 13 simulationssekunder, og korrekt besvarelse fremhæver den eksisterende transport. Spilleren kan dreje tilbage og følge bakterien. Slag og transport er forstørret og tidsmæssigt tilpasset undervisningen; den viste cilieslagsfrekvens er ikke en klinisk måling.

**Alveole og gasudveksling.** Åben alveole med type I-flade, otte type II-celler, tynd surfaktantfilm, kapillærnet og instancerede erytrocytter. En diskret udvidelse/sammentrækning bevarer tilslutningerne. Barrieren vises i rækkefølgen epitel → tynd fælles basalregion → endotel. Det primære O₂ krydser derefter plasma og erytrocytmembran. Baggrunds-O₂ går til blodet, mens CO₂ går til alveoleluften. Det gælder også under CO₂-returrejsen.

**Hæmoglobin.** Fire afrundede underenheder, fire hæmgrupper, fire Fe²⁺-centre og højst fire bundne O₂. Den første plads bruger spillerens eksisterende O₂-model; der oprettes ikke en ny synlig kopi ved bindingen. Den samme erytrocyt og samme hæmoglobin følges i kredsløbet. Det primære O₂ frigives ved vævet, mens hæmoglobinet og de øvrige tre illustrative bundne O₂ bevares. Blodcellen bliver i kapillærens lumen.

**Væv, ATP og nyt CO₂.** En celle med kerne og åbent mitokondriesnit med cristae. O₂ bevæger sig fra hæmoglobin gennem plasma/kapillærvæg til celle og mitokondrie. Den eksisterende glukosemodel og små ATP-markører illustrerer energiomsætningen. O₂ bruges og forsvinder; et separat CO₂ med nyt carbon og en anden model introduceres med et læsbart centralt perspektivskilt. Det er ikke en morphing af O₂ til CO₂.

**CO₂-transport.** Den samme carbonpartikel følges fra CO₂ gennem HCO₃⁻ og tilbage til CO₂. Omdannelsen vises især inde i erytrocytten med efterfølgende transport i plasma. Den afbalancerede reaktion forklares uden ekstra syre-base-spørgsmål: **CO₂ + H₂O ⇌ H⁺ + HCO₃⁻**. Baggrundsmodeller viser flest hydrogencarbonationer i plasma, lidt opløst CO₂ og lidt CO₂ ved globindele. De er illustrative mængdeforhold, ikke faste procenttal. CO₂ bindes aldrig ved hæmjern.

**Udånding.** Samme valgte lunge og samme luftvejsmodeller. CO₂ forlader kroppen, alveolernes volumen falder, diaphragma går op, og thorax bliver mindre. En ny bakterie i slimlaget fortsætter stadig mod svælget.

## Spilmekanik og tilgængelighed

To liv, point, feedback og gentaget forsøg ved samme udfordring. Kun svarenes knapper registrerer besvarelser; klik på 3D-miljøet besvarer ikke spørgsmål. Animationer og læsepauser fortsætter automatisk. Der er ingen animationspaneler med gentag/fortsæt.

Pause, lyd til/fra, lydstyrke, roligere baggrundsbevægelse, grafikvalg, centrering og kropskort. Kvalitetsindstillinger fjerner ikke vigtig anatomi eller gasudvekslinger. På lave landskabsskærme ligger infoboksen til venstre, mens et asymmetrisk kamerafelt placerer 3D-fokus til højre. Modellerne flyttes ikke. Anatomiske labels er CSS-tekst i 18 px på desktop og 20 px på smalle skærme, forankret i modellerne og placeret uden overliggende kontrolpaneler. Antallet af samtidige labels begrænses for at holde anatomien synlig.

Checkpoints gemmer niveau, valgt indgang/lunge/udgang, molekyle, reaktion, animationsalder, blik, liv, point og sluttestens spørgsmålsidentiteter. Pause/indstillinger/skjult fane stopper fælles simulationsur og lyd. Gemning ved hændelser og periodisk under spillet. Gamle spilrecords ligger i deres egne uændrede felter.

## Filer

Nye spilmoduler: `oxygen-data.js`, `oxygen-engine.js`, `oxygen-network.js`, `oxygen-anatomy.js`, `oxygen-mucociliary.js`, `oxygen-molecules.js`, `oxygen-flow.js`, `oxygen-world.js`, `oxygen-game.js`, `oxygen-audio.js`, `oxygen.css` og den fælles `learning-assessment.js` i `public/`.

Integration i `app.js`, `model.js`, `home.js` og `index.html`. Små, bagudkompatible udvidelser i de ovenfor nævnte fælles fordøjelses-/kredsløbsmoduler. Katalogtests opdateres fra fem til seks indbyggede læringsstier; eksisterende tests af bevarelse af elevdata fastholdes. Nye Node-tests og browserkontroller har præfikset `oxygen`.

## Testresultater

Den første komplette browsergennemspilning fra start til sluttest blev kørt ved normal tid. Desuden gennemførtes Let og Mellem på desktop ved normal tid. Den samlede systematiske kontrol af alle tre niveauer på desktop og emuleret mobil bruger et dokumenteret 4× testur i browserens animationstimestamps; spillets produktionskode ændres ikke af dette testur. Optagelser og performancemåling bruger normal tid.

De separate kontroller af geometri, fysiologi, pause/gemning, spørgsmål og layout anvender faktiske eller deterministiske checkpointforløb. [Samlede resultater](testresultater.json), [seks gennemspilninger](gennemspilninger.json) og [layoutkontrol](layoutkontrol.json).

| Kontrol | Resultat |
| --- | --- |
| Node | **233/233**, heraf 203 eksisterende og 30 nye; ingen fejl |
| Eksisterende standardbrowserpakke | **19/19 scripts**, afviklet i delkørsler; tidsfølsomme forløb genkørt alene |
| Nyt spil | **6/6 komplette UI-rejser**: tre niveauer × desktop/mobil, alle 58 stationer og 5/5 i sluttesten |
| Fysiologi | Modsatrettet slimtransport, stationær spiller, udånding, hæmoglobin, vævsudveksling og bevaret carbonidentitet bestået |
| Kamera og synlighed | 64 kombinationer af desktop/mobil/landskab, højre/venstre lunge og molekyleanimationer; ingen kamerainversion og kontinuerlig Hb-zoom |
| Layout | 27 spørgsmålskontroller ved ni viewports; desuden komplet kropskort og billedtekst ved alle ni |
| Gemning og spilregler | To liv, retry, point, genoptagelse midt i animation/test, fem gemte spørgsmål, repetition og gamle spilrecords bestået |
| Lyd og fallback | Gesture, lydstyrke, mute, pause, genindlæsning, roligere baggrund, kvalitet, frit blik og manglende Audio/WebGL bestået |
| Bygget Pages-artifact | Undermappen `/sygepleje-laeringsstier/`, hash-adresserede filer, 3D-worker, hjertevalg, oprydning og øvrige læringsspil bestået |
| Build / whitespace | `npm run build` og `git diff --check` bestået |

Skærmstørrelser: **320×568, 375×667, 390×844, 768×1024, 844×390, 1024×768, 1280×800, 568×320 og 667×375**. Mobil er emuleret i Chromium med touch, ikke fysisk Safari.

To ældre browsertests blev synkroniseret bedre med den faktisk viste animation. De kunne tidligere kombinere en ny scenetilstand med en gammel scenealder eller nå at åbne pause efter, at en kort sekvens var slut. De oprindelige faglige assertions er bevaret. Der er ikke ændret funktion i de gamle spil af disse testrettelser.

## Performance

Den kontrollerede sammenligning bruger **samme komplette kode, modeller og kamera** med optimeringer slået fra/til i ABBA-rækkefølge. “Før” betyder uden afsnitsculling og afstands-LOD, ikke en historisk ældre spilversion. Opløsning, pixelratio, animationsalder og forberedte afsnit holdes ens. Målingen køres alene efter funktionstests. Rådata indeholder FPS, gennemsnitlig/p95-billedtid, CPU-renderarbejde, trekanter, draw calls, kamera og rendereren.

**1280×800, pixelratio 1**, samme kamera/pose og to kørsler pr. variant i ABBA-rækkefølge; 12 opvarmningsframes og 45 målte intervaller pr. kørsel. Rendereren: **ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)**. FPS/billedtid bruger browserens virkelige ur; animationsposeringer samples i ens trin på 1/30 sekund. Der bruges ikke det accelererede testur her. Miljøet har en CPU-kvote svarende til to kerner og ingen fysisk GPU.

| Scene | FPS før → efter | ms/billede før → efter | Trekanter før → efter | Tegnekald før → efter |
| --- | ---: | ---: | ---: | ---: |
| Trachea og cilier | 1.00 → 2.66 | 999.03 → 376.28 | 902,339 → 65,780 | 254 → 31 |
| Hæmoglobin | 1.08 → 1.28 | 929.96 → 780.89 | 581,936 → 132,568 | 105 → 65 |
| Venstre ventrikel | 1.25 → 1.86 | 802.75 → 537.57 | 857,548 → 125,990 | 291 → 53 |
| Vævets O₂-udveksling | 3.02 → 4.00 | 331.10 → 250.55 | 466,864 → 44,192 | 74 → 24 |

Resultaterne er gennemsnit af to kørsler pr. variant. Små forskelle bør tolkes forsigtigt i software-rendering; rådata indeholder også p95-billedtid og CPU-tid. CPU-tiden dækker JavaScript og indsendelse af renderarbejde, ikke hele GPU/SwiftShader-arbejdet. Anatomien i det relevante afsnit er bevaret. Trachea har fortsat **1.152 cilier**; den samlede diagnostiktælling over alle aktive afsnit kan ændre sig, når fjerne afsnit culles. [Sammenligningsbillederne findes i galleriet](galleri.html#performance).

Instancing samler cilier, bakterier, blodceller og baggrundsgasser. Fjerne cilier bevarer samme antal, længde og bølgebevægelse med færre trekanter. Fjerne baggrunds-erytrocytter bruger en enklere udgave af den eksisterende biconkave formel. Hæmoglobin og spillerens fokus-erytrocyt beholder deres geometri. Der udføres ikke individuelle matrixopdateringer for hver cilium hver frame; shaderen animerer slagene. Slimpartikler, blodstrøm og visse baggrundsmodeller opdateres med begrænset frekvens. Diagnostik og labelkontrol er tidsbegrænsede.

## Kendte begrænsninger og visuelle valg

- Dette er en forstørret anatomisk undervisningsmodel, ikke en patientskanning eller én fælles fysisk målestok. Distal luftvej, alveole, molekyler, erytrocyt og væv er forstørret, og blodkarruten er en sammenhængende undervisningsrute frem for en fuld kropsmodel.
- Der følges én repræsentativ gren pr. valgt lunge. Modellen forsøger ikke at gengive samtlige bronchiegenerationer eller hele alveolenettet.
- Alveolevæg, gasbarriere, udvekslingskapillærer, celle og fokus-erytrocyt vises som gennemsigtige undervisningssnit, så krydsning og binding kan ses. De er ikke bogstavelige huller i en normal intakt gasbarriere.
- Cilieslag, bakterier og molekyler er pædagogisk forstørrede. Tidsforløb og antal er ikke kliniske målinger. Baggrundsblodceller genbruges ved afsnitsgrænser; fokusblodcellen og de fulgte molekyleidentiteter bevares.
- Detaljer som carbonanhydrase, chloridshift, syre-base-regulering, ATP-støkiometri og fuld molekylær proteinstruktur ligger uden for dette indledende læringsmål. De simple forklaringer på diffusion, hæmjern og carbonkilde er bevaret.
- Browserkontrollen bruger Chromium med software-WebGL (SwiftShader) og emuleret mobil. En fysisk iPhone, Safari og en rigtig hardware-GPU kan ikke bekræftes af dette testmiljø. Software-FPS kan ikke bruges som løfte om en bestemt telefons billedhastighed.
- Videoerne er faktiske skærmoptagelser fra software-rendereren og kan derfor være mindre flydende end på en enhed med hardwareacceleration.

Den medfølgende Chromium-build mangler H.264-dekodning. Derfor følger hvert af de 14 MP4-klip også som færdigt VP8/WebM-fallback med samme indhold. Galleriet vælger automatisk et understøttet format. MP4-filerne er kontrolleret med ffprobe; Galleriets automatiske WebM-valg og afspilning er kontrolleret i Chromium. Det er ikke yderligere 14 forskellige sekvenser.

## Sådan gennemgås materialet

Åbn `galleri.html` i denne mappe. Billeder og MP4-videoer ligger relativt i `visuelt/`, og sammenligningsbilleder/målinger i `performance/`. Hele mappestrukturen skal bevares, hvis materialet flyttes. Det lokale spil kan åbnes via udviklingsserveren på `/#/sti/iltens-rejse/oxygen-easy` (eller `oxygen-medium` / `oxygen-hard`). Udgivelsesadressen er [Iltens rejse](https://martinkaaekristiansen.github.io/sygepleje-laeringsstier/#/sti/iltens-rejse/oxygen-easy). Den godkendte version er tilgængelig der, når [GitHub Pages-workflowet](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/workflows/pages.yml) for udgivelsescommittet er gennemført.



Visuel dokumentation: **32 PNG-billeder og 14 klip i MP4/H.264 og WebM/VP8**. [Videooversigt](videooversigt.json). Mappen indeholder de færdige billeder, videoer, billedforklaringer og måledata.
