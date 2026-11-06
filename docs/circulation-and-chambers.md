# Kredsløb og hjertekamre – version 0.9.0

## Brug læringsstien

Vælg 1. semester → Anatomi og fysiologi → **Kan du finde vej gennem kredsløbet?**
Vælg let, mellem eller svær. Hver sværhedsgrad har fire selvstændige aktiviteter:

1. Flyt kort med mus, pilknapper eller et valgt pladsnummer. Kontrollér hele rækkefølgen samlet.
2. Vælg en anatomisk betegnelse i den kompakte vælger eller kortbanken og derefter en nummereret markør. Markørnumrene blandes uafhængigt af rutens rækkefølge ved hvert nyt forsøg. Den nummererede liste fungerer med tastatur og touch. Illustrationen er skematisk, set forfra; karrækker i arm og lunge er særskilte forstørrelser.
3. Angiv forgående og efterfølgende struktur, iltning og kredsløb ved seks placeringer. Kapillærer har en ændring i iltindhold, ikke én fast iltstatus.
4. Genskab hele ruten i fritekst. Ingen facitliste, hints eller løbende feedback. Samlet aflevering giver resultat og forklaringer.

Svar gemmes som kladder. Et nyt forsøg erstatter kun den aktuelle kladde; tidligere resultater og bedste resultat bevares. »Træn mine fejl« prioriterer strukturer, der tidligere har givet fejl. Fejloversigten skjules under en uafleveret sluttest.

Træning bestås ved mindst **80 %**, sluttesten ved **90 %**. Grænserne kan ændres i `public/circulation-config.js`. Grænsen gemmes med hvert resultat, så en senere ændring ikke omskriver tidligere vurderinger. Et afleveret trin tæller i trinprogressionen, også når det ikke er fagligt bestået. Faglig beståelse vises særskilt på forsiden og i aktivitetsfanerne.

## Data og arkitektur

`blood-routes.js` er fortsat eneste kilde til de tre rækkefølger. `circulation-data.js` tilføjer synonymer, aktivitetsbeskrivelser og kredsløbsmetadata. De fire visninger er adskilt fra vurderingsmotoren i `circulation-engine.js` og controlleren i `circulation-learning.js`.

I eksisterende IndexedDB gemmes `progress[pathId].circulation` med valgt niveau, kladder, resultater pr. niveau/aktivitet og antal forsøg med fejl pr. anatomisk struktur. Resultater indeholder korrekt/fejl, procent, dato, beståelsesgrænse og feedback. Seneste 100 resultater pr. aktivitet beholdes; samlede forsøg, bedste resultat og opnået beståelse bevares. Ingen database- eller schemaversion ændres. Eksisterende noter, svar, spilresultater og andre læringsstier bevares ved installation af den nye indbyggede sti.

Danske og latinske synonymer normaliseres for store bogstaver, diakritik og tegnsætning. Automatisk vurdering er en eksplicit synonymordbog, ikke AI eller fri sproglig fortolkning. Stavefejl og ukendte omskrivninger kan derfor kræve et nyt forsøg med en anerkendt betegnelse.

## Hjertekamre

`journey-chambers.js` bygger fire asymmetriske, implicitte hulrum med separate åbne ind- og udløb. Kamrenes geometri er adskilt fra de eksisterende kar. Højre atrium har hulveneindløb, venstre atrium fire lungeveneindløb og begge har lokaliserede aurikelstrukturer. Ventriklerne har forskellige former, grovere henholdsvis finere eksisterende trabekelfelter, vægtilhæftede broer og AV-klappernes støtteapparat.

`journey-3d-anatomy.js` vælger kammermodellen. `journey-3d-world.js` styrer langsommere indflyvning, større synsfelt og vending mod udløbet. `journey-valves.js` kan genbruge flige/chordae med nye, vægtilhæftede papillærmuskelankre uden at tilføje den gamle rørformede støttevæg. De fire eksisterende selvstændige klapsekvenser bevares.

Vægbevægelser er ikke en ensartet skalering: ventriklerne trækker sig ind med regionsafhængig styrke, længdeforkortning og beskeden venstresidig drejning. Atrierne kontraherer svagere og sent i cyklussen. De bruger samme ur og fysiologimodul som eksisterende lyd og klapper. Ved reduceret bevægelse er kamrene statiske og klapper åbne.

Modellerne er originale, proceduregenererede undervisningsmodeller – ikke patientskanninger, millimeterpræcise anatomiske rekonstruktioner eller klinisk validerede simuleringer. Blodcellers størrelse, kamera, belysning og vægbevægelser er tilpasset læsbarhed. Den enkelte skærm viser et udsnit, ikke hele organet samtidigt. Let niveau samler højre og venstre hjertehalvdel som hidtil.

## Test og drift

`npm test`, `npm run build`, `npm run test:browser`.

Browsertestene bruger den byggede app under `/sygepleje-laeringsstier/`, så relative moduler og dybe links testes som på GitHub Pages. Der er ingen nye runtime-afhængigheder, server, login eller eksterne API'er. Den eksisterende Pages-workflow tester før udgivelse.

Browsermålinger i cloudmiljøet anvender software-WebGL. De dokumenterer funktion og rendering, ikke en garanti for 60 FPS på fysiske telefoner. Test også den udgivne version på de enheder, som anvendes i undervisningen.

## Ændrede filer

- Nye aktiviteter og vurdering: `public/circulation-config.js`, `public/circulation-data.js`, `public/circulation-engine.js`, `public/circulation-order.js`, `public/circulation-labels.js`, `public/circulation-context.js`, `public/circulation-exam.js`, `public/circulation-learning.js`.
- Kamre og integration med eksisterende 3D: `public/journey-chambers.js`, `public/journey-3d-anatomy.js`, `public/journey-3d-world.js`, `public/journey-valves.js`.
- App, navigation, indhold og progression: `public/app.js`, `public/home.js`, `public/model.js`, `public/progress.js`, `public/style.css`. Det eksisterende `storage.js` gemmer de nye data uden schemaændring; `blood-routes.js` og de eksisterende ruter er uændrede.
- Nye tests: `test/circulation.test.js`, `test/journey-chambers.test.js`, `tests-browser/circulation.cjs`.
- Tilpassede regressionstests: `test/journey-myocardium.test.js`, `test/journey.test.js`, `test/model.test.js`, `tests-browser/acceptance.cjs`.
- Version og browser-testkommando: `package.json`. GitHub-workflowen `.github/workflows/pages.yml` viser eventuelle installations- og browserfejl i joboversigten. Nyere commits afløser forældede workflow-kørsler, og installationen af testbrowseren har en grænse på 15 minutter.
- Vejledning og afgrænsninger: `docs/circulation-and-chambers.md`.

De automatiserede tests dækker de fire aktiviteter på alle tre niveauer, synonymer, fejl og beståelse, gentagelser, bevaret bedste resultat, genindlæsning, opgradering af gamle data, kameraruter og senetråde gennem hjertets cyklus. De eksisterende tests dækker desuden de tidligere 56 quizspørgsmål, refleksioner, navigation, alle spilniveauer, liv, lydlag, klappassager, mobilbetjening og reduceret bevægelse. Alle fire kamre er også inspiceret visuelt i Chromium, inklusive sammenligning af ventriklernes systole og diastole med et almindeligt kar.
