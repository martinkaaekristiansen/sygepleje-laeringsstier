# Fase C – fysiologiske animationer, absorption og afslutning

Status: Fase C’s visuelle og faglige forbedringer er godkendt af brugeren. Rapporten dokumenterer den godkendte implementering og kontrollerne før commit.

Arbejdsgrundlag: `forbedringer-fordoejelse`, commit `8689f3d7bc548ba252ee5a77d7e19d7136c17981`. Arbejdstræet var rent ved opstart. Kun fase C er implementeret. Dato: 17. november 2026.

## Sammenhold med originalmaterialet

`START_HER_CODEX.md`, `README_GUIDE.md`, billedoversigten, originaldokumentets samlede tekst og alle syv oprindelige screenshots er gennemgået igen. DOCX-dokumentets tekst er kontrolleret mod den leverede Markdown-transskription.

To forskelle er afklaret efter den seneste C-bestilling:

- Den oprindelige brief ønskede ingen ekstra absorptionsstruktur. C-bestillingen kræver nu en synlig epitelbarriere og blod-/lymfetransport. Derfor åbnes et lokalt, skematisk vævsudsnit i den eksisterende jejunalvæg. Kameraet forbliver i lumen. Den tidligere fritstående, gennemsigtige absorptionskasse er fjernet.
- Toiletfinalen var tidligere placeret i en senere fase. Den seneste bestilling placerer den udtrykkeligt i C, så den indgår her. Der er ikke implementeret andre senere faser.

## Fysiologiske forbedringer

### Motilitet og fødeindhold

Oesophagus har en lokal kontraktionsbølge bag bolus. Ventriklen har svagere proximal bevægelse, distalt tiltagende antral kontraktion, retropulsion og små udløb gennem pylorus. Den gastriske cyklus er cirka 20 sekunder.

Duodenum, jejunum og ileum har forskellige kontraktionsstyrker og perioder. Nabosegmenter veksler mellem kontraktion og afslapning; fødepartikler bevæger sig både frem og tilbage med en samlet langsom fremdrift. Colon har langsommere, lokal haustral blanding og sjældnere fremaddrivende bølger. Caecum blander lokalt med kontrolleret passage gennem ileocøkalklappen. De korte undervisningsforløb komprimerer især colons tidsskala og erstatter ikke en fysiologisk motilitetsmåling.

Væg og villi anvender samme deformation på GPU'en. Villi forbliver rodfæstede, afrundede og bølgende ved alle eksisterende LOD-trin. Antallet er fortsat 2.200 i duodenum, 3.200 i jejunum og 1.500 i ileum. Epiglottis, appendix, caecums form og B-kamerapositionerne er bevaret.

### Nedbrydning og absorption

De eksisterende modeller for enzymatisk bindingsspaltning er genbrugt sammen med de korrekte enzymidentiteter og produktstadier. Dokumentationen viser amylases kortere kulhydratkæder, senere glukose, galdens emulgering uden bindingsklip, lipases dannelse af 2-monoglycerid og to frie fedtsyrer samt pepsins proteinspaltning. Galde behandles fortsat som en emulgator.

Et vægforankret udsnit viser et sammenhængende lag af 18 stiliserede enterocytter, cellekerner og en fin børstesøm mod lumen. Det åbnes langs synsretningen, så de omgivende folder ikke skjuler cellernes basale side og karrene. Det er et forklarende snit i den eksisterende kameraskala; celler og molekyler er ikke gengivet i fælles fysisk målestok. Det lokale snit skjuler væg-/villusfragmenter i åbningen; det reducerer ikke antallet af villi i modellen.

Glukose optages ved den apikale overflade og føres basolateralt videre. Proteinnedbrydningsprodukter vises som aminosyrer samt di- og tripeptider; de små peptiders bindinger forsvinder først inde i cellerne. Store intakte proteiner passerer ikke epitelet.

Micellen bliver i lumen og afleverer fedtsyre-/monoglyceridprodukter. Triglycerider gendannes inde i enterocytten, og chylomikroner samles, før de forlader cellen til lactealet. Intakte triglycerider og hele miceller passerer ikke direkte gennem epitelet.

Røde kapillærer og grønne lymfekar kan skelnes visuelt. Glukose/aminosyrer følger portalvejen til leveren. Chylomikronerne følger lymfen via ductus thoracicus og venstre venevinkel til det systemiske blod. Fortsættelsen efter det lokale kar er en kort, skematisk transportanimation med tilhørende forklaring; der er ikke bygget en ny helkropsmodel af kredsløbet.

### Finale, kamera og læringsfunktioner

Finalen viser rectum og to analsfinktere. De afslappes, før den brune, ufordøjelige rest falder ned i toiletvandet. Kameraet er over vandet, og lydens plask udløses ved anslaget. En tydelig tekst forklarer, at næringsstoffet allerede er optaget. Hver rejse har sin egen faglige afslutning og beholder resultat, pokaler, sluttest og mulighed for at prøve igen.

B-stationernes kameravinkler er uændrede. Sceneskift dækkes af den eksisterende canvas-fade; den gamle og nye geometri renderes ikke længere samtidigt. Kameraet følger ikke en ny flyverute gennem organvægge. Det står stabilt under spørgsmål og forklaringer, mens væg/indhold bevæger sig. Spilleren kan fortsat kigge rundt og bagud. Denne løsning prioriterer de godkendte synsvinkler og de læsbare spørgsmål frem for en kontinuerlig flyvetur mellem stationerne.

Ved 320 × 568 komprimeres HUD og kontroller, den supplerende farvelegend skjules, og de nederste scenelabels justeres fri af kropskortet. Det permanente informationsfelt og alle anatomiske strukturer bevares. I den nye toiletfinale tilpasses alene blikretningen på korte portraitskærme, mens kameraet fortsat er over vandet; B-organernes kameravinkler er uændrede. Landskab bruger et smallere informationsfelt ved siden af vævsudsnittet. Snittet flyttes til en højere synlig del af den faktiske tarmvæg og skaleres til cirka 150 skærmpixels, så kar og captions ligger over kontrollerne. Dette ændrer ikke B-kameraet eller den omgivende anatomi. Position og geometri genbruges ved resize; der raycastes kun igen, når der skiftes mellem landscape- og øvrig layouttype.

Animationer kan afspilles igen med en knap uden at ændre progression eller svar. Der gemmes et valideret animationscheckpoint, og genoptagelse bevarer det relevante forløb. Ældre fremskridt uden animationsfelt kan fortsat læses. Den permanente, molekylespecifikke læringstekst er bevaret, og farveforklaringen ved absorption ligger samlet under denne tekst.

## Ændrede kode- og testfiler

| Fil | Formål |
|---|---|
| `public/digestion-motility.js` (ny) | Regionale bølger, fælles væg-/villusdeformation og partikelprogression. |
| `public/digestion-flow.js` (ny) | Én instanced batch af fødepartikler langs organernes forløb. |
| `public/digestion-epithelium.js` (ny) | Forankret vævsudsnit, brush border, cellepassage, blod og lymfe. |
| `public/digestion-finale.js` (ny) | Sfinktere, toilet, anslag og tre næringsstofafslutninger. |
| `public/digestion-physiology-label.js` (ny) | Læsbare, teksttilpassede scenelabels på mobil/desktop. |
| `public/digestion-world.js` | Integration, scenegenbrug, synkroniseret lyd og fjernelse af gammel absorptionskasse/dobbeltrendering. |
| `public/digestion-mucosa.js` | Fælles deformation ved alle eksisterende villus-LOD'er samt udvidede culling-grænser. |
| `public/digestion-game.js` | Forklaringer, gentagelse, checkpoints, slutskærme og kompakt absorptionslegend. |
| `public/digestion-engine.js` | Validering af det valgfrie animationscheckpoint. |
| `public/digestion.css` | Sekvensknapper, læsbare slutpaneler og placering af farveforklaringen. |
| `test/digestion-phase-c.test.js` (ny) | Syv tests af bevægelser, villusrødder, fysiologisk rækkefølge og checkpoint-kompatibilitet. |
| `tests-browser/digestion-phase-c.cjs` (ny) | Faktiske billeder/videoer, kameraprogression, slutskærme og IndexedDB-genoptagelse. |
| `tests-browser/digestion-performance.cjs` | Valgfrie parametre for karakter og absorptions-/transportmåling; eksisterende standardmåling bevaret. |
| `package.json` | `npm run test:browser:digestion-c`. |

Dokumentationen ligger i denne rapport og `fase-c-screenshots/`. De godkendte A-, B- og B.1-rapporter/billeder er ikke overskrevet. B-browserens nye regressionsbilleder blev skrevet uden for de godkendte mapper.

## Testresultater

| Kontrol | Resultat |
|---|---|
| `npm test` | 144 bestået, 0 fejl: alle 137 eksisterende + 7 nye C-tests. |
| `npm run build` | Bestået; nye moduler medtaget i det indholdsadresserede build. |
| Fase A-browser | Bestået: desktop, tablet, 320 px mobil, landskab, knapvalg og enzymidentiteter. |
| Komplette rejser | 6 af 6 bestået: Stanley, Trine og Poul på desktop og emuleret mobil; 15 stationer, gemning, sluttest, indstillinger og WebGL-fallback. |
| Lyd-browser | Bestået på begge størrelser: brugeraktivering, faktisk gain, tygning, mute, læsepause, oprydning samt fallback uden lyd. |
| Fase B-browser | Bestået: synkning, anatomiske forskelle, 1.500–3.200 villi, stabile kameraer og mus/touch mere end 180° bagud. |
| Viewport-browser | Bestået: start, afbrydelse, genoptagelse, rotation, kontrolknapper og scroll-lås. |
| Fase C-browser | Bestået: 58 faktiske billeder, tre MP4-klip, alle tre slutskærme, gentagelse med tastatur og seks IndexedDB-genoptagelser. Ingen shader-/sidefejl. |
| `git diff --check` | Bestået. Nye tekstfiler er desuden kontrolleret særskilt for afsluttende mellemrum. |

Komplette logs ligger ved galleriet, herunder [node-tests.txt](fase-c-screenshots/node-tests.txt), [browser-six-journeys.txt](fase-c-screenshots/browser-six-journeys.txt) og [browser-phase-c.txt](fase-c-screenshots/browser-phase-c.txt). Node-version: 24.22.1. Chromium-version: 155.0.8059.79.


De 137 eksisterende Node-tests er bevaret, og syv C-tests er tilføjet. De nye tests kontrollerer blandt andet fremadgående oesophageal kontraktion, lokal blanding med bagudbevægelse, fælles deformation af samtlige villus-LOD'er, intracellulær peptidhydrolyse, re-esterificering før lymfetransport og sfinkterafslapning før anslag.

Billed-/layoutdelen og optagelses-/genoptagelsesdelen er kørt særskilt. En sessionlukningsfejl i testoptageren er rettet; alle tre klip og de seks genoptagelser er derefter genkørt med `DIGEST_REUSE_CAPTURES=1`. De 52 standardbilleder er bevaret, mens de seks responsive billeder er taget igen på den færdige løsning. Der er ikke registreret en tilsvarende spil- eller shaderfejl.

Browserkontrollen anvender det rigtige spil, WebGL, UI og IndexedDB. C-billedscenerne sættes op med gyldige fremskridt for at kunne sammenligne bestemte stadier. Den separate gennemspilningstest udfører alle tre rejser fra start til slut på begge skærmstørrelser.

## Performance før og efter

| Scene og størrelse | FPS før → efter | Median ms før → efter | Trekanter før → efter | Tegnekald før → efter | FPS-ændring |
|---|---:|---:|---:|---:|---:|
| Navigation · Emuleret mobil | 3,33 → 3,33 | 300,0 → 300,0 | 256 988 → 252 684 | 64 → 45 | 0,0 % |
| Navigation · Desktop | 1,94 → 2,00 | 516,6 → 500,0 | 257 852 → 252 684 | 67 → 45 | 3,3 % |
| Trines transport · Emuleret mobil | 3,33 → 3,00 | 300,0 → 333,4 | 255 294 → 248 234 | 57 → 35 | -10,0 % |
| Trines transport · Desktop | 2,07 → 2,00 | 483,3 → 499,9 | 260 762 → 248 234 | 103 → 35 | -3,3 % |

| Scene og størrelse | Gennemsnit ms før → efter | P95 ms før → efter | Tegnekald, interval før → efter |
|---|---:|---:|---|
| Navigation · Emuleret mobil | 303,3 → 304,1 | 883,2 → 650,0 | [60, 67] → [45, 45] |
| Navigation · Desktop | 523,9 → 519,6 | 1033,3 → 1016,7 | [65, 70] → [45, 45] |
| Trines transport · Emuleret mobil | 310,5 → 340,0 | 616,7 → 683,3 | [53, 58] → [35, 35] |
| Trines transport · Desktop | 494,4 → 514,1 | 1033,3 → 1166,6 | [102, 105] → [35, 35] |

Transportscenen har i den endelige målerunde cirka 10 % lavere median-FPS på emuleret mobil og 3 % lavere på desktop end B.1, mens navigationen er på niveau eller lidt hurtigere. Stenciloptimeringen reducerede meromkostningen, men eliminerede den ikke. Der er ikke sænket renderopløsning eller anatomisk tæthed for at skjule denne forskel.

Rå frameintervaller og rendererdata: [performance-summary.json](fase-c-screenshots/performance-summary.json) samt de fire `*-final.json`-målefiler. Kun de endelige før/efter-målinger og det dokumenterede stencilforsøg er medtaget; foreløbige målinger og dubletter er fjernet. Resultater fra softwareværten varierer; der udledes ikke en garanteret hardwaregevinst eller en statistisk sikker procentforbedring af disse enkeltkørsler. Transportmålingen indeholder efter opvarmningen både afslutningen af transporten og den færdige transportscene, mens væg-/villusbevægelser fortsætter.


Målebetingelser: samme Chromium, SwiftShader, samme serverkode bortset fra den testede revision, DPR 1, bevægelse til, standardkamera/FOV 74, renderfaktor låst til 0,8 alene i måleharnessen. Mobil: viewport 390 × 844, buffer 312 × 675. Desktop: viewport 1280 × 800, buffer 1024 × 640. Fem sekunders opvarmning og derefter 90 frameintervaller i jejunal navigation samt 60 i Trines jejunale transport. Målingerne køres sekventielt uden andre browser-tests på samme tid.

Baseline-serveren er et separat, uændret udtræk af den godkendte B.1-revision `8689f3d7bc548ba252ee5a77d7e19d7136c17981`. Performance-harnessen monterer det rigtige spil med isolerede, gyldige fremskridt; IndexedDB-I/O holdes ude af begge målinger. Slutskærm og stillestående scener bruges ikke som FPS-mål. Billedtid er intervallet mellem browserframes, ikke en isoleret GPU-timer. FPS beregnes som 1000 divideret med medianbilledtiden. Trekanter/tegnekald er medianer fra `renderer.info`, ikke optællinger af kildekodeobjekter.

Den låste renderfaktor sikrer sammenlignelighed. I selve spillet er den automatiske tilpasning fortsat aktiv, starter med bedst mulig kvalitet og har samme nedre grænse som B.1. Der er ikke indført en lavere renderopløsning eller fjernet villi.

Vævsudsnittets første udgave brugte en projektionsberegning i hvert væg-/villusfragment. En kontrolleret C-mod-C-test af en stencilmaske gav 2,73 → 3,00 median-FPS på emuleret mobil (cirka 10 %), mens desktopmedianen var 1,88 FPS i begge varianter. Desktopgennemsnittet gik fra 537,2 til 526,9 ms. Samme celleudsnit og alle villi var bevaret; masken tilføjer kun 48 trekanter og ét tegnekald. Derfor er stencilmasken valgt. Rå forsøgsdata findes i `fase-c-screenshots/experiments/candidate-cone.json` og `candidate-stencil.json`. Den endelige før/efter-tabel er målt igen på den færdige løsning.

De vigtigste besparelser er én instanced batch frem for 26 individuelle partikeltegninger, delte shader-uniformer frem for CPU-deformation af væggen, genbrug af miljøet under lokale læringssekvenser og ophør med at rendere forrige scene samtidig samt stencilmasken frem for beregning i hvert billedpunkt. Vævets geometri/materialer genbruges; børstesømmen er en fin tekstur i stedet for hundredvis af store mikrogeometrier. De almindelige fødeprikker skjules under absorption/transport, så de ikke forveksles med næringsstoffernes produkter; væg og villi bevæger sig fortsat. Begge tiltag forbedrede også den visuelle læsbarhed.

## Visuel dokumentation og åbning

58 spilbilleder (26 desktop + 26 emuleret mobil + 6 på kort portrait/landskab) samt 8 særskilte B.1/C-sammenligningsbilleder fra performance-harnessen. De tre optagelser modtog henholdsvis 34, 19, 117 faktiske browserframes. MP4-formatet bruger variable billedtidsstempler uden genererede mellemframes; tidsbasens afrunding kan udelade nogle kildeframes. De kodede frametal og den faktiske videolængde fremgår af `recordings.json`.

Slutskærmene i C-billedserien bruger isolerede testfremskridt, så deres tællere kan stå på nul; billederne dokumenterer layout og faglig sluttekst. De seks fulde gennemspilninger er særskilt verificeret i browserloggen. På mobil kan slutpanelet rulles indvendigt for at nå de nederste knapper.


Galleriet er desuden åbnet i Chromium på desktop og mobil: alle 66 PNG-filer indlæses, de tre H.264-klip har afspillelige metadata, filtrene virker, og der er ingen sidefejl eller vandret scroll. Log: `fase-c-screenshots/gallery-validation.txt`.

Åbn [galleri.html](fase-c-screenshots/galleri.html). Galleriet har billedforklaringer, skift mellem desktop og emuleret mobil, sekventielle billeder og MP4-afspilning. [BILLEDOVERSIGT.md](fase-c-screenshots/BILLEDOVERSIGT.md) forklarer hvert billede; `captures.json` indeholder faktisk scenetid, kamera, geometri og fysiologisk tilstand ved optagelsen.

Hvis lokale HTML-filer blokeres af browseren, kør fra repositoriet:

```sh
python3 -m http.server 3009 --directory docs/codex-fordoejelse
```

Åbn derefter `http://localhost:3009/fase-c-screenshots/galleri.html`. Ved ZIP-gennemgang skal hele arkivet pakkes ud, så de relative billed- og videostier bevares. ZIP-filen afleveres som et separat link i chatten. På understøttede desktopklienter kan linkets **Save as… / Gem som…** bruges; chatklientens downloadfunktion kan ikke garanteres fra browsermiljøet.

## Begrænsninger og forhold til godkendelsen

- Miljøet har ingen fysisk GPU. WebGL anvender SwiftShader; tallene kan ikke bruges som dokumentation for hardwareaccelereret desktop eller en fysisk telefon. Software-renderingen er fortsat langsom. Et testforløb på en almindelig GPU og fysisk mobil er fortsat relevant før en performancegodkendelse til produktion.
- Motilitetsperioder, molekylestørrelser og transportvejenes længder er undervisningsmæssigt tilpassede. Der simuleres ikke fuld væskedynamik, nervesignalering eller hæmodynamik.
- Shaderen flytter den eksisterende geometri uden en ny CPU-beregning af samtlige normaler pr. frame. Det bevarer den afrundede geometri med en enkel tilnærmelse af belysningen under kontraktion.
- Børstesømmen vises som en fin overflade i vævsudsnittet; der er ingen dyr, separat model af hver mikrovillus. Koralrevets eksisterende villi og bevægelse er bevaret.
- De faktiske optagelser kan have ujævn billedhastighed. CDP-optagelsen har selv en omkostning; videoer bruges til at vise rækkefølge og synlighed, ikke som FPS-benchmark.
- Farverne og det lokale, forstørrede vævsudsnit forklarer transporten skematisk. De gør ikke molekyle- og organstørrelser fysisk sammenlignelige. Karsystemets fortsættelse til lever/venevinkel er forklaret og animeret lokalt, ikke modelleret som en helkropsrejse.

Der er ikke fundet en blokerende fejl i de gennemførte tests. Fase C er visuelt og fagligt godkendt af brugeren. De beskrevne begrænsninger ved software-rendering og fysisk hardwaretest består.

## Faglige referencer

- [OpenStax – Chemical Digestion and Absorption](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-7-chemical-digestion-and-absorption-a-closer-look): næringsstofspaltning, peptidoptagelse, intracellulær hydrolyse, portal-/lymfeveje.
- [OpenStax – The Small and Large Intestines](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-5-the-small-and-large-intestines): segmentering, haustral blanding, massebevægelser og defækation.
- [OpenStax – The Stomach](https://openstax.org/books/anatomy-and-physiology/pages/23-4-the-stomach): antral transport, retropulsion og pylorus.
- [OpenStax – Digestive System Processes and Regulation](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-2-digestive-system-processes-and-regulation): forskellen på peristaltik og segmentering.
