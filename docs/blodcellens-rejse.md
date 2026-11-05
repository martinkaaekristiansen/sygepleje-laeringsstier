# Blodcellens rejse – afprøvning og faglig model

Spillet ligger under **1. semester → Anatomi og fysiologi → Blodcellens rejse**. Det bruger appens eksisterende JavaScript-moduler og IndexedDB. Projektet er ikke en React/TypeScript-app; der er derfor ikke indført et nyt framework eller ændret på de eksisterende læringsstiers dataformat.

## Afprøvning før offentlig udgivelse

Ændringen ligger på branchen `blodcellens-rejse`. Den må først flettes ind i `main`, når ejeren har godkendt resultatet. GitHub Pages-workflowen udgiver ved ændringer på `main`; der er ikke tilføjet automatisk offentlig udgivelse af denne branche.

**Test uden installation:** Den genererede fil `artifacts/blodcellens-rejse.html` kan åbnes direkte i en nyere Chrome, Edge eller Firefox. Den indeholder hele appen til lokal afprøvning og sender ikke data til den offentlige hjemmeside. Den kan gendannes med `npm run build:preview`. Progression i testfilen er adskilt fra hjemmesidens progression.

Start projektets lokale forhåndsvisning med `npm run dev`, og åbn port 3000. På en lokal computer er adressen `http://localhost:3000/#/sti/blodcellens-rejse/blood-easy`. Åbn spillet fra semesteroversigten, eller brug dette link i den lokale forhåndsvisning.

1. Vælg **Let**, **Mellem** eller **Svær**, og start rejsen. Alle niveauer er tilgængelige fra starten.
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
| `public/journey-scene.js` | Canvas med perspektiv, organisk tunnel, erytrocytter, vægge, klapper, gasudveksling og kamerabevægelse. Kender ikke korrekte svar eller progression. |
| `public/blood-game.js` | Startmenu, tilgængelige passager, spilforløb og resultatskærm; binder motor, grafik og appens lagring sammen. |
| `public/blood-game.css` | Responsive spilstile. |
| `public/app.js`, `public/model.js` | Integration i eksisterende navigation, indhold og progression. |

Grafikken bruger ingen billedfiler, eksterne fonte, 3D-biblioteker eller betalte API'er. Canvas begrænser pixelopløsningen til en device-pixel-ratio på 1,5 og tegner den løbende animation omkring 30 billeder/s. DOM knapper ligger over de visuelle åbninger og bevarer tastaturfokus og skærmlæsernavne. Animationer og ResizeObserver ryddes op ved navigation. Reduceret bevægelse giver statisk grafik og øjeblikkelige overgange uden kameraanimation.

## Verifikation

`npm test` kontrollerer de præcise ruter, to muligheder, fremdrift, liv, genstart, resultater, iltstatus og eksplicit håndtering af de normale alternative grene. `npm run test:browser` kontrollerer alle tre gennemførelser, fejl, Game Over, tastatur, touch, genindlæsning, lokal lagring, mobilvisning og de eksisterende 56 quizspørgsmål.

Testene køres også mod en lokal undermappe med samme struktur som GitHub Pages. Det er ikke en bekræftelse af en offentlig udgivelse. Efter godkendelse og udgivelse skal hjemmesiden åbnes, alle tre niveauer findes under 1. semester, og en gennemførelse/genindlæsning afprøves på den rigtige adresse. Performance er kontrolleret i browseremulering; en fysisk smartphone er ikke afprøvet her. Den selvstændige HTML-testfil er kontrolleret via den lokale webserver uden eksterne kald. Testmiljøets administrator blokerer `file://`, så direkte åbning af en downloadet fil kunne ikke verificeres her; en eventuel tilsvarende lokal browserpolitik kan kræve den lokale forhåndsvisningsserver.
