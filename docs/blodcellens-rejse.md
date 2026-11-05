# Blodcellens rejse – afprøvning og faglig model

Spillet ligger under **1. semester → Anatomi og fysiologi → Blodcellens rejse**. Det bruger appens eksisterende JavaScript-moduler og IndexedDB. Projektet er ikke en React/TypeScript-app; der er derfor ikke indført et nyt framework eller ændret på de eksisterende læringsstiers dataformat.

## Afprøvning før offentlig udgivelse

Videreudviklingen med lyd og ny anatomi ligger på branchen `blodcellens-rejse-lyd-og-anatomi`. Den allerede offentliggjorte spilversion ændres ikke, før denne videreudvikling er godkendt. Den må først flettes ind i `main`, når ejeren har godkendt resultatet. GitHub Pages-workflowen udgiver ved ændringer på `main`; der er ikke tilføjet automatisk offentlig udgivelse af denne branche.

**Test uden installation:** Den genererede fil `artifacts/blodcellens-rejse.html` kan åbnes direkte i en nyere Chrome, Edge eller Firefox. Den indeholder hele appen til lokal afprøvning og sender ikke data til den offentlige hjemmeside. Den kan gendannes med `npm run build:preview`. Progression i testfilen er adskilt fra hjemmesidens progression.

Start projektets lokale forhåndsvisning med `npm run dev`, og åbn port 3000. På en lokal computer er adressen `http://localhost:3000/#/sti/blodcellens-rejse/blood-easy`. Åbn spillet fra semesteroversigten, eller brug dette link i den lokale forhåndsvisning.

1. Tryk eventuelt **Slå lyd til**. Justér lydstyrken, og vælg Hjerte, Lunger og Blodstrøm i lydpanelet. Lyden er slået fra første gang; også en gemt til-indstilling kræver et klik, før afspilning kan starte. Vælg **Let**, **Mellem** eller **Svær**, og start rejsen. Alle niveauer er tilgængelige fra starten.
2. Tryk på en af de to åbninger i tunnelen. På tastatur kan du bruge Tab og Enter; venstre/højre pil fokuserer den tilsvarende passage. Der er intet tidspres.
3. Et korrekt valg fører kameraet gennem den valgte åbning. Den næste struktur vises. Ved gasudveksling stopper rejsen kort til en forklaring, som afsluttes med **Fortsæt rejsen**.
4. Et forkert valg koster ét liv. Læs forklaringen, og tryk **Prøv igen ved samme skillevej**. To fejl viser **Game Over**, og næste forsøg starter fra aorta.
5. Brug **Afslut til læringsstien** for at gå tilbage til niveauoversigten. Det aktive forsøg kan genoptages efter lukning eller genindlæsning. Start af et nyt forsøg erstatter det aktive forsøg efter bekræftelse.
6. Gennemfør et niveau, genindlæs siden og kontrollér fluebenet. Senere mislykkede forsøg skal ikke fjerne gennemførelsen.
7. Kontrollér samme forløb på mobil, med tastatur og med systemindstillingen for reduceret bevægelse. Blodstrømmens baggrundsanimation kan også sættes på pause i spillet.

## Ruter og anatomiske afgrænsninger

Alle niveauer starter i iltrigt blod i aorta og slutter tilbage i aorta. Vi følger én pædagogisk rute gennem **udvekslingskapillærerne i højre overarms muskel**, tilbage gennem **vena cava superior** og videre gennem **højre lunge**. Rutevalget står synligt under spillet.

- **Let:** 11 strukturer / 10 overgange. Aorta → arterier → arterioler → kapillærer → venoler → vener → vena cava → højre side af hjertet → lungekredsløbet → venstre side af hjertet → aorta.
- **Mellem:** 17 strukturer / 16 overgange. Udvider den lette rute med de fire navngivne hjertekamre og separate lungearterier, arterioler, kapillærer, venoler og vener.
- **Svær:** 23 strukturer / 22 overgange. Tilføjer aorta ascendens, arcus aortae, trikuspidalklappen, pulmonalklappen, truncus pulmonalis, højre lungearterie, mitralklappen og aortaklappen i den angivne rækkefølge.

På den lette rute er hjertets sider og hele lungekredsløbet samlede afsnit. Teksten forklarer de strukturer, der er samlet. På mellem er klapperne med i forklaringerne, mens de er egne strukturer på svær. Forgreningerne fra aortabuen mod højre arm nævnes i forklaringen, men testes som den samlede kategori »Arterier« i overensstemmelse med den ønskede rute.

**De to åbninger er pædagogiske rutehypoteser, ikke to virkelige åbninger ved alle anatomiske strukturer.** Der er eksempelvis ingen normal passage gennem skillevæggen fra højre til venstre hjertekammer. Dette står i både introduktionen, spillevisningen og relevante fejlforklaringer. Grafik og erytrocytter er stiliserede og ikke målfast anatomi.

To typer alternativer er adskilt i data:

- `not-next`: strukturen er ikke det næste sted i den normale fremadrettede strømning på den valgte rute. Forklaringen angiver den korrekte forbindelse og eventuelle mellemliggende strukturer. Den påstår ikke, at karret eller strukturen ikke findes.
- `other-route`: en anatomisk normal alternativ rute. Vena cava inferior er en normal returvej fra underkroppen, men ikke målet fra højre arm. Venstre lungearterie er en normal gren, men forsøgets mål er højre lunge. Forklaringen siger udtrykkeligt, at den alternative anatomi er korrekt.

Modellen beskriver ikke shunts, medfødte forbindelser, sygdomsbetinget tilbageløb eller andre særlige kredsløb. Det gør også målet om musklens udvekslingskapillærer entydigt uden at hævde, at alle kroppens kar kun har én mulig rute.

## Ilt, hjertevægge og klapper

- Iltrigt blod vises lysere rødt; iltfattigt blod vises mørkerødt og har stadig ilt. Venøst blod vises ikke blåt.
- I musklens kapillærer afgives O₂ til vævet, mens CO₂ optages. Erytrocytten bliver i karret.
- I lungekapillærerne optages O₂ fra alveolerne og bindes til hæmoglobin. CO₂ bevæger sig den modsatte vej. De efterfølgende lungevenoler, lungevener og venstre hjertehalvdel vises med iltrigt blod.
- Forkamrene er rundere og har tyndere væg end hjertekamrene. Venstre hjertekammer har en tydeligt tykkere muskelvæg end højre. Trabekler er stiliseret i grafikken.
- Trikuspidalklappen har tre sejl, og mitralklappen har to. De vises med chordae tendineae og stiliserede papillærmuskler. De to semilunarklapper vises med tre lommeformede flige uden chordae.

Dette er et undervisningsspil om rækkefølge og forbindelser, ikke en komplet anatomisk simulator. En fagunderviser bør gennemse grafik og forklaringer før anvendelse i undervisningen.

## Lagring og progression

Resultater ligger i den eksisterende `progress['blodcellens-rejse'].bloodJourney` i IndexedDB. Ingen oplysninger sendes til en server.

For hvert niveau gemmes:

- `completed`: om niveauet nogensinde er gennemført.
- `attempts`: antal startede forsøg; genoptagelse tæller ikke som et nyt forsøg.
- `best`: højeste andel af korrekte overgange i ét forsøg, i procent. Resultatet opdateres undervejs, også hvis forsøget afbrydes.
- `lastCompleted`: dato og tidspunkt for seneste gennemførelse.

Det aktuelle forsøg gemmes med position, liv, fejl, korrekt side ved hver skillevej og fase. Genindlæsning flytter ikke spilleren forbi en fejl og giver ikke nye liv. I appens samlede overblik tæller hvert gennemført niveau som ét af læringsstiens tre trin. Gennemførelse måler ikke en samlet klinisk kompetence.

## Kodestruktur

| Fil | Ansvar |
| --- | --- |
| `public/blood-routes.js` | Anatomiske ruter, betegnelser, forklaringer, iltstatus og læringsstiens metadata. |
| `public/journey-engine.js` | Rene, genanvendelige tilstandsovergange, to liv, valgmuligheder og resultatberegning. Ingen grafik, browserlagring eller tidsstyring. |
| `public/journey-physiology.js` | Anatomiske lydzoner, relative karprofiler, 70/14-rytmer, klapfaser og gradvis iltning. Rene funktioner uden browserafhængigheder. |
| `public/journey-audio.js` | Original Web Audio-syntese, vedvarende lydlag, fælles ur, bløde volumenkurver, brugeraktivering og lokale lydindstillinger. |
| `public/journey-scene.js` | Canvas med perspektiv, organisk tunnel, erytrocytter, vægge, klapper, gasudveksling og kamerabevægelse. Kender ikke korrekte svar eller progression. |
| `public/blood-game.js` | Startmenu, tilgængelige passager, spilforløb og resultatskærm; binder motor, grafik og appens lagring sammen. |
| `public/blood-game.css` | Responsive spilstile. |
| `public/app.js`, `public/model.js` | Integration i eksisterende navigation, indhold og progression. |

Grafikken bruger ingen billedfiler, eksterne fonte, 3D-biblioteker eller betalte API'er. Canvas begrænser pixelopløsningen til en device-pixel-ratio på 1,5 og tegner den løbende animation omkring 30 billeder/s. DOM knapper ligger over de visuelle åbninger og bevarer tastaturfokus og skærmlæsernavne. Animationer og ResizeObserver ryddes op ved navigation. Reduceret bevægelse giver statisk grafik og øjeblikkelige overgange uden kameraanimation.

## Verifikation

`npm test` kontrollerer de præcise ruter, to muligheder, fremdrift, liv, genstart, resultater, iltstatus og eksplicit håndtering af de normale alternative grene. `npm run test:browser` kontrollerer alle tre gennemførelser, fejl, Game Over, tastatur, touch, genindlæsning, lokal lagring, mobilvisning og de eksisterende 56 quizspørgsmål.

Testene køres også mod en lokal undermappe med samme struktur som GitHub Pages. Det er ikke en bekræftelse af en offentlig udgivelse. Efter godkendelse og udgivelse skal hjemmesiden åbnes, alle tre niveauer findes under 1. semester, og en gennemførelse/genindlæsning afprøves på den rigtige adresse. Performance er kontrolleret i browseremulering; en fysisk smartphone er ikke afprøvet her. Den selvstændige HTML-testfil er kontrolleret via den lokale webserver uden eksterne kald. Testmiljøets administrator blokerer `file://`, så direkte åbning af en downloadet fil kunne ikke verificeres her; en eventuel tilsvarende lokal browserpolitik kan kræve den lokale forhåndsvisningsserver.


## Dynamisk lyd og fælles rytme

Lyden er en **pædagogisk nærhedsmodel**, ikke en optagelse af lyde, som en erytrocyt ville høre. Normal laminar blodstrøm behøver ikke at være hørbar. Lungelydene skaber atmosfære og illustrerer lungernes placering; de påstår ikke, at vesikulære respirationslyde høres fra lungekapillærernes indre.

Alle lyddata genereres i browseren af projektets egen kode:

- Hjerte: dæmpede lavfrekvente vibrationer og filtreret støj giver to adskilte komponenter. S1 ligger ved begyndelsen af systolen, S2 cirka 0,31 sekunder senere. Hele cyklussen varer 60/70 sekund.
- Lunger: blødt båndbegrænset støjsignal med inspiration, svagere eksspiration og en stille pause, 14 gange i minuttet.
- Strøm: lav filtreret støj med diskret pulsmodulation i store arterier og hjertekamre. Kapillærer og vener har meget lavere niveau og næsten ingen/ingen pulsmodulation.

De tre lag har hver sin gain-kontrol; et ekstra internt signal modulerer strømningens puls. Kilderne får samme starttid og fortsætter gennem alle anatomiske trin. Skift i zone/lag udjævnes med eksponentielle kurver; mastervolumen tones også op og ned. Maksimale signalniveauer har plads til, at lagene blandes uden digital klipning. Bufferkanter er udjævnet eller lydløse.

| Område | Hjertelyd | Lungelyd | Strøm |
| --- | --- | --- | --- |
| Forkamre, ventrikler og klapper | Stærkest | Ingen; svag ved pulmonalklappen | Tydelig og pulserende |
| Aorta ascendens, aortabuen og truncus pulmonalis | Tydelig | Begynder svagt i truncus | Pulserende |
| Perifere arterier og vener | Svagere | Ingen | Afdæmpet; venøs strøm jævn |
| Systemiske arterioler, kapillærer og venoler | Næsten uhørlig | Ingen | Meget svag; langsomst i kapillærer |
| Lungearterier → pulmonale småkar | Aftagende fra hjertet | Tiltager mod kapillærerne | Afdæmpet |
| Lungekapillærer og lungevenoler | Meget svag | Mest fremtrædende | Meget svag |
| Lungevener og hulvene tæt på hjertet | Tiltagende | Aftager i lungevener; ingen i hulvenen | Svag og jævn |

Tabellen angiver relative niveauer, ikke decibel eller målte anatomiske afstande. De konkrete værdier findes i `anatomyProfile`. På let repræsenterer det samlede lungeafsnit især gasudvekslingsområdet.

Lydpanelets indstillinger gemmes separat i localStorage under `laeringsstier-blood-audio-v1`; progressionens IndexedDB-format ændres ikke. Hvis indstillinger ikke kan gemmes, virker betjeningen stadig i den åbne session, og en besked vises. Ved manglende Web Audio eller afvist lydstart kan man fortsætte uden lyd. En baggrundsfane fades til stilhed, og lydmotoren suspenderes. Ved navigation væk fra spillet lukkes motoren og dens ressourcer.

## Anatomiske visninger og bevægelse

- Store arterier har elastiske, relativt tykke vægge med diskret pulsation og glat endotel. Arterioler får snævrere lumen og relativt markant muskulatur.
- Kapillærer har kun en tynd væg illustreret med endotel og basalmembran. Cellerne vises langs én linje, deformeres og bevæger sig langsommere. Venoler er smallere end de større, eftergivelige vener.
- Veneklapper vises alene i modellen af den perifere armvene. De indsættes ikke i hulvener, lungevener eller arterier.
- Forkamre er afrundede. Ventriklerne har en tilspidset kavitet, trabekler og papillærmuskler; venstre ventrikel har kraftigere muskelvæg end højre. AV-klappernes sejl har chordae; semilunarklappernes tre lommer har ikke.
- Animationen anvender samme ur som hjertelyden. Ventrikulær kontraktion følger systolen. AV-klapper åbner i diastolen; semilunarklapper åbner i uddrivningsfasen. Ved et korrekt valg i en klapscene nærmer kameraet sig, venter på den åbne fase og passerer fligplanet inden for den fase.
- Et tydeligt mærket undervisningsvindue viser alveoler **uden for** kapillæren og en tynd alveole-kapillærbarriere. O₂ bevæger sig mod blodet, CO₂ mod alveolen. I vævskapillærer går retningerne omvendt. Røde farver ændres gradvist over fire sekunder. Hb-bjælken er skematisk, ikke en målt saturation; iltfattigt blod har stadig en betydelig mængde bundet ilt.
- Gasudvekslingen nulstilles ikke ved “Fortsæt” i samme kapillær. Reduceret bevægelse eller animationspause viser en statisk illustration med faste pile, sluttilstand for iltningen og åben klap; ingen kamerabevægelse. Dette er et bevidst stillbillede, ikke en påstand om, at klapper altid er åbne.

Rutehypoteserne er fortsat tydeligt mærkede, og alle eksisterende forklaringer og anatomiske rutedata er bevaret. Den visuelle model er pseudo-3D og skematisk; vægtykkelser, størrelsesforhold og afstanden mellem organer er ikke målfast.

## Supplerende lyd- og grafiktest

- Enhedstest: samtlige lydzoner, 70/14-rytmer, to hjertelydskomponenter, buffersamlinger, signalheadroom, klappernes åbne faser og tidsvinduer for passage, vægtykkelser og iltning.
- Browsertest: ingen automatisk lyd før et klik, samme lydmotor gennem trinskift, individuelle lydlag, glidende gain-kurver, volumen med tastatur, gemte indstillinger, mute/genstart og oprydning ved navigation.
- Hele den svære rute gennemspilles også med lyd og bevægelse aktiveret. Alle kilder kontrolleres for fælles starttid og for, at de ikke genstartes mellem trin. Lunge- og klapvisninger kontrolleres på desktop og i mobilformat; reduceret bevægelse skal give uændret Canvas-billede.
- Der er ikke brugt en fysisk iPhone/Android-enhed eller foretaget en klinisk bedømmelse af lydens naturtro kvalitet. Mobiltestene er Chromium-emulering. Lyden bør derfor også afprøves med almindelige højttalere/hovedtelefoner og på de ønskede enheder før offentlig udgivelse.
