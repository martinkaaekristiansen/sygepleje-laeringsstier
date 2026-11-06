# Kvalitetsrettelser 0.10.0

Udgangspunkt: kvalitetsgennemgangen af 0.9.1. Implementeringen omfatter fejlrettelser og konkrete forbedringer i A–C. De nye produktidéer i D (nye forgrenede cases og selvsikkerhedsvurdering) er ikke indført som del af stabiliseringen.

## Rettelser

- **A1:** `set -euo pipefail`, eksplicit serverkontrol og fejldiagnostik i Pages-workflowen. En negativ test demonstrerer, at en fejl før `tee` giver fejlstatus.
- **A2, B1:** faktisk råsnapshot ved gendannelse; kompatibelt eksport-/importformat; normal sikkerhedskopi fra siden; reset først efter eksport; validering af spilstatistik og aktive forløb; tekstescaping som ekstra beskyttelse. Oprindelige data overskrives ikke ved valideringsfejl.
- **B2:** versioneret opdatering af indbygget undervisningsindhold. Historik, noter og tidligere gennemførelser bevares; ændrede svar arkiveres og trin markeres til repetition. Lokale ændringer bevares som en separat kopi. Bevidst slettede stier geninstalleres ikke.
- **B3, B12:** særskilt tømning/fyldning af ventrikler, minimumsvolumen ved slutningen af systolen og fyldning efter klapåbning. Respirationslyd og alveoleudvidelse følger samme cyklus. Det er fortsat en pædagogisk, ikke patientbaseret model.
- **B4, C2:** alle 36 spørgsmål på 5. semester får mere plausible distraktorer og kortere, mere ligeværdige formuleringer. Alle 56 quizspørgsmål har feedback til hvert svar. Farmakologiske beregningsantagelser og IM-vaccineforklaring præciseres.
- **B5, B10:** gennemgang adskilles fra mestring. Forkerte svar og reviderede trin forbliver synlige på forsiden. Første svar registreres separat. Repetitionsbehov aftager efter to korrekte besvarelser i træk i den relevante dimension; historiske fejl bevares.
- **B6, B8:** kammerberegning i worker, genbrug af kammergeometri, fælles beregning af hjertefase pr. frame, begrænsede DOM-opdateringer, ingen løbende renderloop under pause/reduceret bevægelse. Automatisk nedjustering skifter også mesh. Bedre fyldlys, større friholdelse foran kameraet og en valgfri kameraretning mod klapapparat/venøse indløb med færre blodceller gør anatomien lettere at undersøge. Ingen påstand om anatomisk ekspertgodkendelse eller 60 FPS på alle telefoner.
- **B9, C3, C5:** spilbaggrund er inert bag menuer/resultater; fokus flyttes til menuen. Smalle rækkefølgekort ombrydes. Skiplink ændrer ikke læringsstiens URL. Semester/fag huskes.
- **B11:** semester-5-stien findes under de fag, den faktisk inddrager, ikke kun Sygepleje.
- **C1, C4, C6:** centrale moduler formateret, fælles katalogtilføjelse genbrugt; nye regressions- og browsertests; reproducerbar testinstallation og dokumenteret vendor-licens/kontrolsum.

## Bevarelse af data

`schemaVersion` og databasenavn er uændrede. Indholdsversionen for farmakologi og semester 5 er hævet fra 1 til 2. En fixture af den faktiske 0.9.1-tilstand tester opgradering, historik og idempotens. Kryptering og synkronisering indføres ikke: data forbliver på enheden. Flere faners revisionskontrol bevares.

## Faglig afgrænsning

[Indholdsregisteret](content-review.md) angiver præcist, hvad der stadig skal vurderes af en underviser eller klinisk fagperson. Der er ikke opfundet reviewer, faglig godkendelse eller officielle prøvefacit. 3D-skala og geometriske former er fortsat forenklede.

## Afprøvning

Kontroller gennemført 6. november 2026:

- `npm test`: alle 17 testfiler bestået, herunder 11 nye regressionsscenarier.
- `npm run build`: bestået; relative assets, syntakskontrol og vendor-kontrolsummer.
- `npm run test:browser`: alle otte browserforløb bestået i Chromium 155. Alle 56 quizspørgsmål, tre spilniveauer, to aktiviteter på tre niveauer, lyd, klappassager, genindlæsning, gamle data, sikkerhedskopi, fejltilstande, fokus og 320-pixel-visning er dækket.
- Fire hjertekamre gennemset visuelt med normal og alternativ kameraretning. Automatisk kontrol af klappassage og reduceret bevægelse bevaret.
- Kammerberegning i worker: 44.416 trekanter på cirka 1,13 sekunder; browserens 16-ms-timer fortsatte 70 gange imens. Den tunge beregning blokerer således ikke brugerfladens tråd i denne kontrol.
- Software-WebGL målte cirka 100 ms pr. frame i anatomiforløbet. Der loves ikke 60 FPS på baggrund af denne test. Reelle GPU'er og smartphones skal måles særskilt.
- `npm run build:preview:3d` og kontrol af dokumentationslinks bestået. Offlinekopien har en dokumenteret synkron fallback til kammerberegning.

Browserkontrollerne kører på den byggede app under `/sygepleje-laeringsstier/`. Reelle telefoner, Safari og skærmlæserbetjening kræver supplerende manuel afprøvning. Direkte adgang til `github.io` er blokeret af testmiljøets netværkspolitik; offentlig udgivelse skal derfor bekræftes via GitHub Actions' build- og deploy-status.

## Berørte filer

- Data og lagring: `model.js`, `storage.js`, `backup.js`, `content-version.js`, `builtin-baselines.js`.
- Navigation, læring og feedback: `app.js`, `home.js`, `learner.js`, `quiz.js`, `progress.js`, `circulation-engine.js`, `circulation-learning.js`, `circulation-order.js`, `circulation-context.js`.
- Indhold: `pharmacology.js`, `semester5.js`.
- Spil: `blood-game.js`, `journey-engine.js`, `journey-physiology.js`, `journey-audio.js`, `journey-chambers.js`, `journey-3d-anatomy.js`, `journey-3d-world.js`, `journey-geometry-loader.js`, `journey-geometry-worker.js` samt CSS.
- Test, build og dokumentation: workflow, testfiler og v0.9.1-fixture, buildscript, låste udviklingsværktøjer, vendor-manifest, README og denne gennemgang. Filerne ovenfor ligger i `public/`, medmindre andet er angivet.
