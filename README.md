# Læringsstier

Dansk, mobilvenlig læringsapp til sygeplejestuderende. Appen fungerer uden login, AI-API, analyseværktøjer eller betalte tjenester. Progression, svar og refleksioner gemmes lokalt i browseren.

## Indhold og funktioner

- Valg af semester 1–7. Forsiden åbner på det første semester med indhold.
- Fagfiltre viser kun fag med læringsstier på det valgte semester. En sti kan tilhøre flere fag.
- **1. semester: Blodcellens rejse** — et visuelt kredsløbsspil med tre sværhedsgrader, to liv, anatomiske kar og klapper, dynamisk lyd, kropskort, funfacts og lokalt gemte resultater. Rejsen fortsætter direkte til næste valg uden ekstra fortsæt-knapper. Lyden er valgfri og bruger original syntese uden eksterne lydfiler. [Afprøvning og anatomisk model](docs/blodcellens-rejse.md).
- **3. semester: Medicinhåndtering og farmakologi** — fire trin med i alt 20 spørgsmål fra det uploadede dokument. [Kilder og udvælgelse](docs/medicinhaandtering.md).
- **5. semester: Akut og kritisk sygepleje** — 12 trin med 36 casebaserede spørgsmål, refleksionsopgaver og vejledninger. [Kobling til semesterbeskrivelsen](docs/semester5-e26.md).
- Overblikket **Fortsæt, hvor du slap** viser påbegyndte, ufærdige stier på tværs af semestre og fag med antal gennemførte trin og procent.
- Quizzer giver feedback og forklaringer. Forkerte svar kan ændres. Når et svar er korrekt, fastholdes det; klik på forkerte muligheder viser deres forklaring. **Genstart trinnet** nulstiller kun svar og gennemførelse på det valgte trin efter bekræftelse.
- Trin kan vise tekst, billeder, video, lyd og refleksionsguider. Eksterne medier åbnes efter et klik. Eksterne billedlinks hentes, når trinnet vises.

Underviserfunktionen, kodelåsene og publicering fra appen er fjernet. Læringsstien **Fordøjelsessystemet** på 1. semester er fjernet. På 1. semester findes nu læringsspillet **Blodcellens rejse** under Anatomi og fysiologi. Gamle links giver ikke adgang til den fjernede sti eller en editor.

Indhold vedligeholdes nu i projektfilerne og udgives med den almindelige GitHub Pages-workflow. Der bruges ingen Cloudflare-server, publiceringskode eller GitHub-token i appen. Eventuel tidligere oprettet Cloudflare Worker og dens adgangsnøgle kan fjernes hos de respektive tjenester; sletning af projektfiler afinstallerer ikke en allerede oprettet ekstern tjeneste.

## Blodcellens rejse i 3D

**Let, Mellem og Svær** bruger nu samme Three.js/WebGL-motor gennem hele kredsløbet. De tidligere 2D-versioner og den særskilte firetrinsdemonstration er fjernet. Det gamle link `#/blodcelle-3d` åbner den almindelige læringsaktivitet. Alle ruter, svarmuligheder, trin-id'er og eksisterende gennemførelser er bevaret.

[3D-arkitektur, anatomiske valg og test](docs/blodcellens-rejse-3d.md). `npm run build:preview:3d` laver en selvstændig HTML-prøve med alle tre niveauer i `artifacts/`.

## Eksisterende data

Appen bevarer IndexedDB-databasens navn, format og de stabile trin-, spørgsmåls- og svar-ID'er for de øvrige læringsstier. Besvarelser, refleksioner og progression for 3. og 5. semester bevares. Andre tidligere gemte læringsstier ændres ikke.

Den fjernede sti filtreres fra ved hver indlæsning, også på eksisterende enheder og efter gendannelse af gamle data. Gamle browserdata fra localStorage flyttes fortsat automatisk til IndexedDB. Tidligere kladder til øvrige stier kan fortsat ligge i browserdata, men der er ingen editor, som kan åbne eller udgive dem.

Lagring sker atomisk. Ved lagringsfejl vises en besked og **Prøv at gemme igen**. Flere faner kontrollerer versionsnummer for at undgå tavs overskrivning. Ukendte eller beskadigede data giver en gendannelsesside frem for automatisk nulstilling. Sletning af browserens webstedsdata sletter den lokale progression. Data flyttes ikke automatisk mellem enheder eller webadresser.

Progression måler gennemførte trin, ikke klinisk kompetence. Undlad personoplysninger i refleksioner. Materialet er til undervisning og erstatter ikke kliniske instrukser. Øvelsesfacit på 3. semester er ikke et officielt prøvefacit og bør gennemgås fagligt før brug til bedømmelse.

## Start lokalt

Kræver Node.js 22 eller nyere. Der kræves ingen installation af runtime-afhængigheder.

```sh
npm run dev
```

Åbn `http://localhost:3000`. Porten kan ændres med `PORT=3001 npm run dev`.

## Test og build

```sh
npm test
npm run build
```

Build kontrollerer JavaScript-syntaks og opretter `dist/`. Filadresser indeholder et indholdshash, så browseren ikke blander gamle og nye moduler. Hash-navigation understøtter dybe links, browserhistorik og genindlæsning under GitHub Pages-undermappen.

`tests-browser/acceptance.cjs` tester fjernet underviseradgang og publicering, fjernet læringssti på nye og eksisterende enheder, alle 56 spørgsmål, svarændringer, forklaringer, genstart, refleksioner, progression, migration, dybe links og mobilvisning.

Med Playwright og Chromium installeret kan testen køres mod den lokale server:

```sh
PLAYWRIGHT_MODULE=/sti/til/playwright CHROMIUM_PATH=/sti/til/chromium APP_URL=http://localhost:3000 npm run test:browser
```

`tests-browser/blood-game.cjs` tester de tre spilruter, to passager, liv, genstart, vedvarende gennemførelser, mus/tastatur/touch og mobilvisning. Spilmotorens anatomiske ruter testes separat i `test/journey.test.js`.

GitHub Actions kører også browsertesten mod en undermappe svarende til GitHub Pages. Browserens testværktøjer sendes ikke med appen.

## Udgiv gratis med GitHub Pages

1. Læg ændringerne på `main`. Hvis de ligger på en separat branche, opret en pull request og vælg **Merge pull request → Confirm merge**.
2. Åbn repositoryets **Settings → Pages**. På GitHub Free skal repositoryet være offentligt.
3. Under **Build and deployment**: sæt **Source** til **GitHub Actions**.
4. Åbn **Actions → Udgiv Læringsstier på GitHub Pages**. Workflowen starter ved ændringer på `main`. Du kan også vælge **Run workflow**, vælge `main` og starte den manuelt.
5. Vent på grønne flueben ved både **build** og **deploy**.
6. Åbn hjemmesiden og kontrollér ændringen. En lokal test eller en gemt workflow er ikke i sig selv en bekræftet offentlig udgivelse.

Adresse efter vellykket udgivelse:

**https://martinkaaekristiansen.github.io/sygepleje-laeringsstier/**

Ved 404: kontrollér Pages-kilden og seneste deploy. Ved en rød workflow: åbn kørslen og læs fejlen i det røde trin. Manglende Pages-indstillinger kan skyldes manglende administratoradgang eller et privat repository på gratisabonnementet.

## Projektstruktur

- `public/app.js`: navigation, elevhandlinger og lagringsstatus.
- `public/home.js`, `public/learner.js`, `public/quiz.js`: forside, trin og quizfeedback.
- `public/pharmacology.js`, `public/semester5.js`: de to indbyggede læringsstier.
- `public/model.js`, `public/storage.js`: datavalidering, migration, stabile ID'er og lokal lagring. Kompatibilitet med tidligere gemte kladder og indhold bevares.
- `public/progress.js`, `public/subjects.js`: progression og fagfiltre.
- `public/theme.css`, `public/style.css`: UCN-farver, mobilvisning og tastaturfokus.

UCN-farverne følger den leverede oversigt: brand blå mørk `#004250`, brand blå `#00646E`, turkis `#0096A0`, turkis lys `#A5DCCD`, brand blå lys `#BED6DB`, grå `#E7EBED` og sidebaggrund `#F1F6F9`. Primære knapper er sorte med hvid tekst. Gul lys `#FFE673` bruges som sekundær accent. Status formidles også med tekst, og reduceret bevægelse respekteres.
