# Ny CI/CD-struktur

## Arbejdsgang

[pages.yml](../../.github/workflows/pages.yml) udgiver kun fra `main`. [validate.yml](../../.github/workflows/validate.yml) er den fælles validering uden Pages-skriverettigheder. [regression.yml](../../.github/workflows/regression.yml) bruger den til PR'er, arbejdsbranchen, natlig kørsel og manuel fuld regression. Ingen `pull_request_target`, hemmelighedsvideregivelse eller udgivelse fra en featurebranch er indført.

1. **Plan:** sparse checkout, hele Git-ændringsintervallet, før/efter-afhængighedsgrafer og dokumentationskontrol.
2. **Fælles kontrol:** syntaks i al egen JavaScript, alle Node-tests, ét produktionsbuild og platform-/Pages-/spil-smoke på desktop og mobil.
3. **Relevant regression:** selvstændige matrixjobs med hver sin runner/container, browser, IndexedDB, tilfældige port og artifactmappe. Maksimalt 16 jobs samtidigt; kun én browsertestproces pr. runner.
4. **Gate:** enhver fejlet, annulleret eller manglende påkrævet kontrol giver fejl. Dokumentation alene må have bevidst oversprungne runtimejobs.
5. **Pages, kun main:** download det allerede testede artifact, configure/upload Pages og deploy. Ingen genopbygning af en anden udgave efter test.

Concurrency annullerer forældede forløb inden for deres gruppe. Pages har én fælles udgivelsesgruppe. En ældre kørsel kan ikke fortsætte uhindret og overskrive den nyere. Browserfejl og timeouts føres direkte tilbage til exitstatus; `tee` og shell-pipelines kan ikke skjule dem.

## Konservativt testvalg

| Ændring | Kontrol |
|---|---|
| Ikke-runtime README, rapport, screenshots/video | Ændrede dokumenter/linkkontrol; ingen build/deploy |
| AST-verificeret tekst i kendt indholdsmodul | Alle Node-tests, build og fælles platform/spil-smoke |
| Kommentar/format uden AST-ændring | Samme fælles kontrol |
| Spil-logik/geometri/lyd | Fælles kontrol og samtlige funktionelle grupper for alle transitivt berørte spil |
| Fælles CSS | Fælles kontrol samt layoutgrupper på tværs af alle spil |
| Blandet CSS/logik | Unionen af layout- og berørte spilgrupper |
| App, model, storage, backup, data, build, workflow, pakker, vendor | Fuld funktionel regression |
| Nye/slettede/ukendte afhængigheder, uafklaret runtimeindlæsning | Konservativ omfattende kontrol; et manglende asset stopper build |
| Kun testkode | Relevant fuld validering, ingen unødvendig deploy |

Tekstgenvejen kræver identiske AST'er bortset fra bogstavelige tekster i en snæver liste af tekstfelter. Ændrede ID'er, facit, tal, funktioner og ukendte indholdsmoduler må ikke bruge genvejen. Dokumentation, der findes i runtime-grafen, kan ikke filtreres fra som almindelig dokumentation.

`push.before..github.sha` anvendes for hele pushen, ikke kun seneste commit. PR-base sammenlignes med det faktiske merge-checkout. Første push, manglende base eller ikke-ancestral historik udløser fuld kontrol. Rename vises som sletning plus tilføjelse, så begge ender tæller med. Unit-tests dækker multi-commit-push, merge, rename, slettet dependency, blandede ændringer og ukendt base.

## Pakker, isolation og artifacts

[Testregisteret](../../scripts/ci/test-registry.js) klassificerer hver browserfil præcis én gang. De oprindelige 19 tests bevares. Alle syv ilt-tests og de to tests af den sammenhængende verden er med; derudover kommer en fælles spil-smoke. Lange fordøjelsesrejser og lyd opdeles efter desktop/mobil; iltrejser fordeles på alle seks kombinationer af enhed og sværhedsgrad. De længste forløb prioriteres først i matrixen. V2-genoptag opdeles i to checkpointjobs og ét fælles job. Standardkørsel uden selector bevarer alle cases. Ugyldige selectors giver fejl frem for nul gennemførte tests.

Virkelige læse- og checkpointintervaller samt normal animationshastighed bevares. `OXYGEN_TEST_SPEED=1` i CI. Ingen reduktion af renderkvalitet eller WebGL-krav for at pynte på tiderne.

Store billeder/logs uploades ved fejl eller udtrykkeligt bestilt visuel/performance-kontrol. Små `timings.json`-filer og testplanen bevares for alle kørsler. `dist` bygges én gang og deles som uforanderligt artifact. Historiske dokumentationsmapper skrives ikke over af de almindelige funktionelle testjobs.

## Valg af miljø

[Miljøforsøget](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/runs/45590994379) sammenlignede samme Node-tests, build og Pages/WebGL-test i seks miljøer. Valget er sparse checkout og versions-/digestlåst Playwright-container. Den undgår apt/browserinstallation på hver runner og gav mindre variation end cachede Ubuntu-installationer. Den var ikke hurtigst i alle enkeltmålinger: varm cache brugte 69 sek. i første forsøg mod 103 sek. i andet.

Container: `mcr.microsoft.com/playwright:v1.56.1-noble@sha256:f1e7e01021efd65dd1a2c56064be399f3e4de00fd021ac561325f2bfbb2b837a`. Image-opstart tog 19–30 sek. i de målte job. npm-cache har nøgle med OS, Node 22, Playwright 1.56.1 og lockfilehash. Browserfiler/systembiblioteker er en del af det versionslåste image. Den alternative native browsercache i benchmark har tilsvarende versionsnøgler. Den verificerede Ubuntu-spejlrettelse er bevaret i [install-browser.sh](../../scripts/ci/install-browser.sh).

En mislykket første containerprøve skyldtes Git-ejerskab og regnes ikke som en bestået måling. Rettelsen betror kun det eksplicitte checkout pr. Git-kommando, aldrig `safe.directory=*`.

Første grønne fulde kørsel med loft på otte runners tog 17 min. 47 sek. og viste op til 699 sekunders kø for små jobs. Et efterfølgende forsøg hæver loftet til 16 isolerede runners; antallet af tests/jobs og antal browsere pr. runner er uændret. Endelige målinger og valg fremgår af performancerapporten.
