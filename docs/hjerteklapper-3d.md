# Fire hjerteklapper i Blodcellens rejse — version 0.7.1

## Ændringen

Ved truncus pulmonalis vælges nu mellem **arteria pulmonalis dextra** og **aorta ascendens**. Sidstnævnte er ikke en normal direkte forbindelse: aorta modtager blod fra venstre ventrikel via aortaklappen. Venstre lungearterie bruges ikke længere som en fejlmulighed. Begge lungearterier er stadig beskrevet som normale i fagteksten. Rækkefølgen, antallet af trin, de øvrige svarnavne, liv, lyd og eksisterende progression bevares.

To svar er fortsat rutehypoteser. Der tegnes ingen faktisk forbindelse mellem lungearteriestammen og aorta. Den gamle Y-forgrening med højre/venstre lungevalg bruges derfor ikke længere i denne scene.

## Geometri og anatomi

`public/journey-valves.js` adskiller klapperne fra resten af spilmotoren. Modellerne er originale, parametrisk genererede overflader. De hentes ikke fra en ekstern server.

| Klap | Flige og tilhæftning | Støtteapparat | Bevægelse |
| --- | --- | --- | --- |
| Trikuspidal | Tre uens flige: anterior, posterior og septal. Den septale tilhæftning er fladere. | Tre illustrerede papillærmuskelgrupper; hver støtter to tilstødende flige gennem marginale og sekundære chordae. Trabekler og muskelbaser er forbundet med ventrikelvæggen. | Åbner ned i højre ventrikel under diastole. Lukker under systole. |
| Mitral | To flige med forskellig form og areal; anterior og posterior. Sadelformet annulus med atriale højdepunkter anteriort/posteriort og lavere kommissurer samt diskret tredeling af den posteriore fligs overflade. | To papillærmuskelgrupper, anterolateral og posteromedial. **Begge** har chordae til begge flige. Fra version 0.8.0: finere trabekler end på højre side; venstre ventrikels kompakte muskelvæg er tykkere. | Åbner ned i venstre ventrikel under diastole. Lukker under systole. |
| Pulmonal | Tre halvmåneformede lommer, U-formede tilhæftninger og tre sinusudvidelser ved udløbet. | Ingen chordae eller papillærmuskler. | Åbner mod arterievæggen i systolen. De frie rande mødes centralt ved lukning. |
| Aorta | Højre koronarflig, venstre koronarflig og non-koronarflig. Tre Valsalva-sinus og ostier i de to koronarsinus. | Ingen chordae eller papillærmuskler. Intet ostium i non-koronarsinus. | Åbner mod aortavæggen i systolen og lukker ved diastolens begyndelse. |

Fligene er krumme, deformerbare trekantsnet med faste tilhæftninger, tynde frie rande og en lille lokalt genereret kollagentekstur. De åbne og lukkede former interpoleres kontinuerligt. Den lukkede AV-model mødes langs en linje/Y; semilunarmodellen danner tre lommer med central sammenføjning. Chordae følger deres flige og muskelspidser, når ventriklen kontraherer. Kammermiljøet giver plads til støtteapparatet, og sinusvæggene følger klappernes tilhæftninger.

Kameraet nærmer sig klappen, venter på det åbne tidsvindue og føres helt gennem fligområdet. Det eksisterende hjerteur driver S1/S2, klapåbning og muskelkontraktion. Reduceret bevægelse viser klapperne åbne og stopper animationen. Svarfelter ligger under klappens centrum, og blodceller holdes væk fra det centrale observationsfelt for at bevare udsynet.

## Ophav, licensundersøgelse og afgrænsning

Undersøgt den 6. november 2026:

- **[Z-Anatomy / Models-of-human-anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy)**: projektets README beskriver et Blender-atlas, CC BY-SA 4.0 og særskilte attributioner, bl.a. BodyParts3D. Atlasset er en mulig kilde til mere detaljeret statisk anatomi. Den gennemgåede dokumentation bekræfter ikke et færdigt sæt af fire separate, animerede WebGL-klapper med chordae og fysiologisk cyklus. Ingen modeller er kopieret eller bearbejdet herfra.
- **[SlicerHeart](https://github.com/SlicerHeart/SlicerHeart)**: README og [BSD 3-Clause-licensen](https://github.com/SlicerHeart/SlicerHeart/blob/master/LICENSE) er gennemgået. Projektet indeholder bl.a. segmentering af flige, analyse af papillærmuskler og eksport til biomekanisk simulering. Det er et værktøj til arbejde med billeddata, ikke et færdigt lavpolygon-sæt til denne app. Softwarelicensen dokumenterer ikke automatisk rettigheder til alle eksterne patientdata eller eksempelmodeller. Ingen kode eller modeller er kopieret.
- De nye klapoverflader, ophæng og teksturer er skrevet direkte til dette projekt. De tilføjer ingen tredjepartsaktiver eller nye licenskrav. Three.js er fortsat den lokalt medleverede MIT-licenserede renderer.

**Modellerne er idealiserede undervisningsmodeller, ikke patientscanninger eller klinisk validerede simuleringer.** Antal flige, relationer, flowretning og åbningsfaser illustreres; individuel variation i chordae, papillærmuskler, fligsegmenter og orientering er forenklet. Der er ingen trykberegning eller mekanisk prolapsberegning: den animerede lukkestilling holdes på ventrikelsiden og chordae følger den. De fire modeller har lokal orientering omkring blodets fremadrettede akse, ikke en fælles målfast thoraxgeometri. Lyset, vævsfarver, større udsyn og skala er undervisningshjælpemidler.

## Kontroller

- `test/journey-valves.test.js`: umulig lunge-distraktor og korrekt livstab, central tæt lukning/åben passage ved raycasting, fast tilhæftning inklusive kommissurer gennem hele cyklussen, korrekt orienteret mitralsadel, kontinuerlig deformation, bevægelsesretning, papillærgruppernes forbindelse til begge naboflige, ingen støtteapparater på semilunarklapper, to koronarostier og sinus-tilhæftninger uden mellemrum.
- Eksisterende tests af alle tre ruter, to svar, liv, gemt progression og øvrige læringsstier bevares.
- `tests-browser/journey-anatomy.cjs`: gennemspiller Svær med bevægelige klapper og kontinuerlig lyd, kontrollerer kamerakrydsning i åben fase, tester den nye forkerte rute og gennemspiller hele Svær i mobilformat med reduceret bevægelse. Svarfelternes placering kontrolleres ved alle fire klapper.
- Åbne og lukkede modeller inspiceres desuden visuelt i Chromium/WebGL. Mobiltesten er browseremulering, ikke en test på fysisk telefon. SwiftShader i udviklingsmiljøet giver ikke et retvisende mål for en fysisk telefons GPU-ydelse.

Der tilføjes ingen backend, API, abonnementer eller nye datalagre. Publicering sker gennem den eksisterende GitHub Pages-workflow efter ejerens udtrykkelige anmodning.

## Trabekler i version 0.8.0

Se [trabekler-3d.md](trabekler-3d.md) for den sammenhængende væg, muskelbroer og forskellen mellem højre og venstre ventrikel.
