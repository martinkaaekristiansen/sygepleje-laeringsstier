# Dødelig dosis – en klinisk mordgåde

En selvstændig, datadrevet efterforskningsplatform under **3. semester**. Første spilbare sag: **Sag 001 – Det sidste hjerteslag**. Der er ingen backend, AI ved afvikling, brugerregistrering eller eksterne dataopslag i spillet.

- [Udviklingsrapport](rapport.md)
- [Faglig kvalitetssikring og kilder](faglige-kilder.md) – indeholder løsningen
- [Narrativt flowchart](narrativt-flow.md) – indeholder løsningen
- [Datastruktur og nye sager](nye-sager.md)
- [Caseskabelon](case-template.js)
- [Illustrationsoversigt](illustrationer.md) og [individuelle prompts](illustrationer.json)
- [Galleri med screenshots og illustrationer](galleri.html)
- [Browsertestens resultater](browser-results.json)
- [Performance](performance.json)

Spillets direkte adresse efter udgivelse: [Dødelig dosis](https://martinkaaekristiansen.github.io/sygepleje-laeringsstier/#/sti/doedelig-dosis/sagsmapper).

Åbn `galleri.html` lokalt i browseren efter checkout/download af repositoryet. Dokumentationen er udviklingsmateriale og kopieres ikke til GitHub Pages-spillet.

## Lokal kontrol

Fra repositoryets rod:

```sh
npm ci --ignore-scripts
npm test
npm run build
node scripts/ci/run-browser.js core
node scripts/ci/run-browser.js task '{"id":"dose-investigation","group":"dose-investigation"}'
git diff --check
```

Playwright 1.56.1 skal være installeret med en kompatibel Chromium. Den eksisterende CI anvender fortsat det låste Playwright-containerimage og isolerede regressionstests. Den nye suite er registreret i den eksisterende testudvælgelse; der er ikke oprettet et ekstra deploymentworkflow.

Kør med `DOSE_SCREENSHOTS=1` for screenshots i `artifacts/dose`. Kør med `DOSE_OUTPUT` for et andet outputsted. Screenshots i denne mappe er udvalgt dokumentation, ikke build-input.

## Måling før og efter

Kør [målescriptet](measure-performance.cjs) efter øvrige browserjobs er færdige. Sæt `DOSE_BASELINE` til et separat worktree på baseline-commit `62efe8c38c552c08616a6951d80b91a002b40b2b`, med låste udviklingsafhængigheder installeret. Scriptet sammenligner tre builds og tre nye browserkontekster på hver version og skriver `performance.json`. Det ændrer ikke kildekoden.
