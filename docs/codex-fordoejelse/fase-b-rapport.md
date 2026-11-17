# Fase B – anatomiske 3D-forbedringer

Arbejdsgrundlag: `forbedringer-fordoejelse`, fase A-commit `a664d434e9773c9d3cccbbbd0421af8b577cb207`. Fase B og B.1 er godkendt af brugeren den 17. november 2026 og gemmes samlet med commit-beskeden `Fase B: Anatomiske 3D-forbedringer og performanceoptimering`. Fase C er ikke påbegyndt.

## Implementering

- **Epiglottis/synkning:** En tilpasset, let krum bladgeometri med smal tilhæftning erstatter den fladtrykte kugle. Den ligger bag tungeroden ved larynxindgangen. Oesophagus ligger posteriort for trachea. Larynx og øvre trachea løftes/føres frem, epiglottis bøjes bagud/nedad, stemmelæberne lukker, og den øvre oesophagusovergang åbner koordineret, mens bolus føres bag luftvejen. Efter bevægelsen vender modellen tilbage til hvile. Anatomien vises med en åben anterior tilgang, så relationerne kan ses.
- **Slimhinde:** Plicae er brede, let uregelmæssige deformationer af den sammenhængende tarmvæg. Villi er afrundede kapselgeometrier med rødder i den faktiske, buede overflade og retning efter slimhindens normal. Der er 2.200 i duodenum, 3.200 i jejunum og 1.500 i ileum. Jejunum har højere folder/længere villi; ileum lavere/kortere. En shader giver små, langsomme, faseforskudte bevægelser med stationære rødder. Ingen mikrovilli modelleres i stor skala, og der er ikke indført mikrozoom.
- **Caecum:** En asymmetrisk, blindt endende sæk med bund under ileums indmunding, bred opadgående fortsættelse og smalt, krumt appendix fra den posteromediale væg. Sidegrenene deler rigtige randvertices med sækken; de er ikke blot rør lagt oven på en lukket væg. Appendix har en lukket distal ende. Ileocøkalklappen repræsenteres af to slimhindelæber.
- **Navigation:** Den generiske fritstående udgangsring er fjernet ved alle stationer. Anatomiske strukturer som pylorus, analsfinkter, læber og tracheas bruskringe er bevaret. De to eksisterende anatomiske svarknapper styrer fortsat progression.
- **Kamera/synlighed:** Blikket følger organernes kurver, inklusive colon. Kameraet kan rotere hele vejen rundt med mus/touch og står stabilt under spørgsmål. Sceneskift placerer kameraet i den nye scene frem for at lade det flyve gennem en væg. Enzymer/substrat placeres i et fælles fokusområde efter kameraretning og skærmens bredde. Den lille faglige tekst for epiglottis og caecum er præciseret.
- **Performance:** Villi tegnes i to instancerede afstandsniveauer med en fælles shader-tid. Ved lavt renderbudget reduceres tessellering og villi-overfladens bump-effekt, mens alle villi bevares. Renderbudgettet anvender nu den faktiske framevarighed, så lange frames også udløser tilpasning; der oprettes ikke ekstra parallelle renderloops ved tilpasning.

## Berørte kodefiler

| Fil | Ansvar |
|---|---|
| `public/digestion-world.js` | Integration, sceneoprydning, fjernelse af portalringe, synlighed, lys, kamerabetjening og renderbudget. |
| `public/digestion-anatomy.js` | Regionale, sammenhængende plicae og UV-koordinater for slimhindeteksturen. |
| `public/digestion-swallow.js` | Bladgeometri og koordineret synkeanatomi/-animation. |
| `public/digestion-mucosa.js` | Regionale villi, forankring, shaderbevægelse, instancing og LOD. |
| `public/digestion-caecum.js` | Sammenhængende caecum-/ileum-/appendix-geometri og ileocøkallæber. |
| `public/digestion-camera.js` | Stationernes stabile kamera- og blikpunkter. |
| `public/digestion-anatomy-labels.js` | Små, ikke-interaktive anatomiske labels i 3D-scenen. |
| `public/digestion-learning.js` | Korte forklaringer for epiglottis og caecum. |
| `public/digestion-performance.js` | Hurtigere respons på reelt lange frames. |
| `test/digestion-phase-b.test.js` | Form, samlinger, blinde ender, villusforankring, LOD, synkning og kamerasynslinjer. |
| `tests-browser/digestion-phase-b.cjs` | Faktiske screenshots, desktop/mobil, kamerastabilitet, tilbageblik og cloudmåling. |
| `package.json` | Tilføjer `npm run test:browser:digestion-b`. De eksisterende tests er bevaret. |

## Visuel dokumentation og anatomisk kontrol

Se `fase-b-screenshots/galleri.html` og `fase-b-screenshots/BILLEDOVERSIGT.md`. Der er 15 faktiske screenshots, herunder to tydeligt mærkede, supplerende modelkontroller udefra/gennemskåret. Galleri og billedoversigt forklarer, hvad der skal vurderes i hvert billede, og linker til de anvendte anatomiske referenceillustrationer.

Kontrollen er foretaget mod OpenStax figur 23.12–23.14 og 23.19, University of Oklahoma Health Sciences' histologimateriale samt Anatomy Atlases Plate 37, Figure 6. Form, anterior/posterior relation, blinde ender, forbindelser, regional slimhinde og synlighed er vurderet. Der er ikke foretaget uafhængig fagfællevalidering af modellerne.

## Tests

- `npm test`: 134 bestået, 0 fejl, inklusive de eksisterende 130 tests og fire nye fase B-tests.
- `tests-browser/digestion.cjs`: alle tre molekylerejser gennemført på desktop og emuleret mobil; 15 stop, rigtige/forkerte knapvalg, retry, absorption, sluttest/repetition, lagring/genoptagelse, migration og WebGL-fallback bestået.
- `tests-browser/digestion-audio.cjs`: desktop/mobil, brugeraktivering, gain/lydstyrke, mute, tygge-synkronisering, indstillingspause, oprydning og manglende AudioContext bestået.
- `tests-browser/digestion-phase-a.cjs`: kompakt UI ved 320, 390, 768, 844 og 1280 px, lange svar, ingen overlap mellem svar/information/kropskort, knapvalg, enzym-/ikonidentitet og bevaret trækbetjening bestået.
- `tests-browser/digestion-phase-b.cjs`: screenshots fra faktiske scener, hvile/synkning, villusantal, stabilt kamera og tilbageblik med mus/touch på desktop/mobil. Bestået uden JavaScript-/shaderfejl. Den afsluttende cloudmåling er gemt sammen med billederne.
- Geometrikontrollen finder kun de to tilsigtede åbne rande i caecum-modellen, til ileum og colon ascendens; ingen ekstra huller eller non-manifold-samlinger. Appendix og caecums bund er lukkede.
- `npm run build` og `git diff --check` bestået.

## Åbne begrænsninger

- Cloudmiljøet bruger **SwiftShader/software-rendering**, ikke en fysisk telefon-GPU. En isoleret emuleret mobilmåling gav cirka 5 FPS for fase A og cirka 3 FPS for den væsentligt mere detaljerede fase B efter optimering. Før korrektion af budgetmålingen var fase B cirka 1,8 FPS. Det er fortsat en væsentlig begrænsning i software-rendering; der påstås ikke god mobilperformance på baggrund af disse målinger. Fysisk iOS-/Android- og hardwareaccelereret desktopmåling mangler. Den afsluttende måling gemmes i `fase-b-screenshots/performance-cloud.json`.
- Overfladedetaljer og molekyler er pædagogisk forstørrede, og synkeområdet er en forenklet åben undervisningsmodel. Det er ikke en komplet model af alle halsens væv eller en målfast patientmodel.
- På smalle mobilskærme kræver undersøgelse af caecums sideåbninger og den opadgående fortsættelse manuel kiggen/swipe. De supplerende udvendige billeder gør sækform og tilhæftning tydeligere end et enkelt indvendigt stillbillede.
- Det langsomt bølgende villusmønster er en diskret undervisningsstilisering, ikke en gengivelse af konstant havplanteagtig fysiologi.
- Den separate absorptionsillustration og den øvrige organspecifikke motilitet afventer fase C. Toiletfinalen er heller ikke omarbejdet i fase B.
