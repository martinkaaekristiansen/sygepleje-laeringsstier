# Mundstart, tungens midterlinje og mobilkamera

Fejlrettelse fra `main` ved `1c7eb85ffaef550e35fe2d1f47d2b9e3e1686f43`, 19. november 2026. Arbejdsbranch: `rettelser-mund-og-mobilkamera`. Gendannelsespunkt: `backup-main-foer-mund-mobilkamera` ved samme udgangspunkt.

## Rettelser

- **Start uden for munden.** Ansigtet har en egentlig åbning ved mundhulens indgang. Start og indgangsvalg vises udefra; efter det korrekte valg flyver kameraet kontinuerligt gennem åbningen. Ansigt og fordøjelseskanal ligger i samme scene. Nye spil nulstiller også et tidligere kameras position og retning. Ældre gemninger ved indgangsvalget kommer ligeledes tilbage til den udvendige visning; nye gemninger midt i indflyvningen kan genoptages uden spring ind i munden.
- **Centreret tunge.** Den bageste tungedel brugte svælgets oprindelige nulpunkt, mens mundhulen var flyttet. Begge tungedele bruger nu mundens midterlinje. Tungens forreste del er tilpasset mundhulens længde, så den hænger sammen med tungeroden og ikke strækker sig ind foran larynx. Fødepartiklerne bruger samme mundkoordinater. Den koordinerede synkebevægelse bevares.
- **Mere overblik på telefonen.** Portrætformat får et bredere lodret synsfelt, så det vandrette udsyn svarer til en kvadratisk visning. Ved 390 × 844 pixels ændres det lodrette synsfelt fra 74° til cirka 117°, og det vandrette fra cirka 38° til 74°. Ekstremt høje formater begrænses til 120° lodret for at begrænse perspektivforvrængning. Desktop og landskab beholder 74° lodret. Kameraet flyttes ikke ud gennem slimhinden for at skabe overblik, og anatomiske modeller, villi og læringsanimationer bevares.

## Kontrol

- **184 Node-tests består**, herunder fysisk mundåbning, udvendig start, negativ kameraafstand ved gemning, sammenhængende indflyvning, tungens midterlinje, synkecollisioner og mobilens synsfelt.
- Build og `git diff --check` består.
- Den eksisterende layoutkontrol består ved 1280×800, 1024×768, 768×1024, 390×844, 375×667, 320×568, 568×320, 667×375 og 844×390. Spørgsmål, infoboks og kropskort overlapper ikke; kun knapper registrerer svar.
- Genoptagelse, pause, ingen dobbeltpoint, automatisk optagelse/perspektivskift, korte galde-/micelletekster og historiske testresultater består fortsat.
- Den nye browserkontrol dokumenterer mundstart, mundhule, epiglottis og jejunum på desktop og mobil. Alle tre molekyler testes fra en rigtig ny start frem til det første spørgsmål inde i munden.
- Supplerende visuel kontrol ved **390×664 CSS-pixels og DPR 3**, der giver en browserhøjde tættere på telefonens skærm med browserlinjer. Det er Chromium-emulering; en fysisk iPhone/Safari er ikke testet.
- Den nye regression indgår også i standardkommandoen `npm run test:browser`, som GitHub Pages-workflowet kræver før deployment.

[Åbn billedgalleriet](mund-mobilkamera/galleri.html) med før-/efterbilleder og de to billeder ved høj pixeltæthed. Billedstillingerne er pauset for at kunne sammenlignes; spillets normale indflyvning og animationer fortsætter automatisk. [Aktuelle browserkontroller](mund-mobilkamera/checks.json) og [førmålinger](mund-mobilkamera/before-checks.json).

Testkommandoer:

```sh
npm test
npm run build
APP_URL=http://127.0.0.1:3030/ npm run test:browser:digestion-oral
APP_URL=http://127.0.0.1:3030/ node tests-browser/digestion-phase-a.cjs
APP_URL=http://127.0.0.1:3030/ node tests-browser/digestion-continuous-state.cjs
git diff --check
```

Alle tidligere anatomiske spørgsmål, enzymopgaver, de tre molekylerejser, absorption, sluttests, lyd, pause og automatisk kvalitetstilpasning bevares. Den fulde browserpakke køres igen på GitHub før udgivelse. Deploymentstatus ses i [Pages-workflowet](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/workflows/pages.yml).
