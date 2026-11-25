# Ændringsoversigt og tilbageførsel

Udgangspunkt `b69df9b0cee9d2a284824c8c5d6a07159fa30f0b`, arbejdsbranch `optimering-oprydning-ci-cd`. Ændringer ligger i selvstændige commits på arbejdsbranchen; `main` merges/pushes ikke.

| Filer | Formål |
|---|---|
| `.github/workflows/pages.yml` | Main-afgrænset udgivelse efter den fælles validering og alle påkrævede regressioner |
| `.github/workflows/validate.yml` | Plan, fælles tests/build, isoleret browser-matrix og hård gate |
| `.github/workflows/regression.yml` | PR, arbejdsbranch, natlig og manuel regression uden udgivelse |
| `.github/workflows/ci-environment-benchmark.yml` | Ikke-udgivende sammenligning af native/cache/container/sparse |
| `scripts/ci/module-graph.js`, `change-plan.js`, `git.js` | AST/afhængigheder, konservativ ændringsplan og afgrænset Git-tillid |
| `scripts/ci/test-registry.js`, `browser-tasks.js`, `run-browser.js` | Komplet registrering, sharddækning, isolerede processer og tidsdata |
| `scripts/ci/check-syntax.js`, `syntax-worker.cjs`, `production-policy.js`, `scripts/build.js` | Hurtigere syntaks, sikre eksplicitte buildudeladelser og manifest |
| `scripts/ci/audit.js`, `check-docs.js` | Reproducerbar inventering og kontrol af ændrede dokumenters links |
| `scripts/ci/benchmark-environment.cjs`, `install-browser.sh` | Miljømåling og bevaret Ubuntu-spejlhåndtering |
| `scripts/static-server.js`, `server.js`, `tests-browser/oxygen-build.cjs` | Én afgrænset HTTP-server til udvikling og Pages-test |
| `public/digestion-world.js`, `public/oxygen-game.js` | Kun otte dokumenterede ubrugte importnavne fjernes |
| `public/oxygen.css` | Nødvendig rettelse af én landskabsværdi, fundet af iltens tidligere manglende CI-dækning |
| `tests-browser/oxygen-audio.cjs`, `oxygen-layout.cjs` | Vent på faktisk pauseframe og udskriv præcis layoutdiagnostik; alle assertions bevares |
| `tests-browser/ci-shards.cjs`, digestion/audio/v2 og oxygen-journeys | Desktop/mobil og v2-fællescases kan køres på separate runners; standardkørsel bevarer alle cases |
| `tests-browser/digestion-continuous.cjs` | Browserimports opløses relativt til det faktiske hash-entrypoint |
| `tests-browser/smoke-games.cjs` | Spilopstart, ilt-genoptag, assets/konsol og viewport på begge enheder |
| `test/ci-tools.test.js`, `build-contract.test.js`, `quality-fixes.test.js` | Nye kontrakttests og tilpasset eksisterende workflow-fejltest |
| `package.json`, `package-lock.json`, `.gitignore`, `README.md` | Låste dev-værktøjer, samlede testkommandoer, lokaloutput-afgrænsning og brugervejledning |
| `docs/codex-platform-optimering/` | Ti rapporter og varig, kompakt måleevidens |

## Hvad er fjernet?

- Otte importbindinger, svarende til fire færre fysiske linjer produktionskode netto.
- Ingen kildefiler, testfiler, kliniske tekster, historiske billeder/videoer eller dokumentationsfiler.
- Tre kilder er kun udeladt fra produktionsartifactet, når de er dokumenteret uden runtimeafhængighed. De ligger stadig i Git og bruges i Node-tests.
- Ét dobbelt HTTP-serverkodeområde er erstattet af et fælles modul. Bruttodiffens mange erstattede linjer i indrykning/workflows er ikke “fjernet ubrugt kode”.

## Tilbageførsel

Før merge kan arbejdsbranchen gennemgås via compare/PR. Efter en eventuel senere merge kan hele ændringen tilbageføres med et normalt revert-commit. Ingen force-push eller historikomskrivning er nødvendig. Den eksisterende Pages-workflow kan hentes fra baseline-commit; appens lagringsformat og data-ID'er er uændrede, så der kræves ingen datamigration ved tilbageførsel.

Dokumentationsarkivering er kun et forslag og er derfor ikke noget, der først skal genskabes ved revert. Alle originale filer er bevaret.
