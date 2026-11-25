# Kodeaudit og afhængigheder

Alle 711 baseline-filer er opgjort med størrelse og SHA-256. Analyseværktøjet [audit.js](../../scripts/ci/audit.js) kan gentage gennemgangen af et vilkårligt Git-træ:

```sh
npm ci --ignore-scripts
node scripts/ci/audit.js b69df9b0cee9d2a284824c8c5d6a07159fa30f0b
node scripts/ci/audit.js HEAD
```

Analysen skelner mellem produktionskode, build-/udviklingsværktøjer, Node-tests, browserkontroller og historisk dokumentation. Testfixtures og historiske kodekopier tæller ikke som automatisk slettebare produktionsmoduler.

## Statisk og faktisk kontrol

Acorn læser imports, re-exports, bogstavelige dynamiske imports, workers, URL'er, require og fetch. PostCSS læser CSS-referencer og sammenligner hele regelblokke inklusive media-kontekst, deklarationsrækkefølge og `!important`. HTML-referencer indgår i produktionsgrafen. Grafen anvender både før- og efter-versionen ved ændringsanalyse, så slettede afhængigheder stadig kan påvirke testvalget.

Der er 101 poster i den normale runtime-lukning fra `public/index.html`; licensen kopieres derudover. Spilrøddernes transitive lukninger har henholdsvis 50 (fordøjelse), 20 (blod) og 45 (ilt) moduler. De overlapper med vilje: `journey-ui`, `blood-viewport`, `ui`, lyd/fysiologi og Three.js er fælles. Ilt bruger blandt andet fordøjelsens slugning, eksamen/save-hjælpere og kredsløbets hjertegeometri. Et filnavn med “digestion” er derfor ikke tilstrækkeligt til at afgrænse regressionen til ét spil.

To ikke-bogstavelige `new URL`-udtryk i `public/data.js` er URL-validering af brugerindhold. De er ikke dynamisk modulindlæsning. Uafklaret dynamisk import/worker/fetch i runtime-kode medfører derimod konservativ fuld kontrol og fuld kopiering til build.

Browserkontrol af det rigtige hash-build under `/sygepleje-laeringsstier/` kontrollerer netværksfejl, JavaScript-fejl, workers, navigation, alle seks læringsstier og spil på desktop/mobil. Node- og browserregression dækker lagring, gamle data, migration, korruption, backup, XSS, quiz og progression. Manglende runtime-dækning bruges aldrig alene som grund til sletning.

## Resultat af kodegennemgangen

- Otte lokale importnavne uden referencer er fjernet efter dokumentation; se [sletningsjournalen](03-ubrugt-kode.md).
- Ingen funktioner, klasser, exports, migrationsgrene, event listeners, anatomiske modeller eller lydfiler er slettet. Der blev ikke fundet lokale, ikke-eksporterede funktionsdeklarationer helt uden navngivne referencer i den supplerende AST-gennemgang. Det er ikke et bevis mod dynamisk anvendelse af alle andre kodetyper.
- Tre historiske moduler er stadig nødvendige for tests og historiske målinger. Kilderne bevares; kun produktionskopieringen udelader dem, hvis grafen bekræfter det.
- Ingen fuldstændigt identiske CSS-regelblokke blev fundet. Dynamiske klasser, medieregler, fokus og sjældne fejltilstande gør automatisk CSS-purge uforsvarlig her.
- `scripts/build-preview.js`, `build-3d-preview.js` og `build-oxygen-gallery.js` er eksplicitte dokumentationsværktøjer. De er bevaret og ligger uden for normal udgivelse; de er ikke dokumenteret forældede.
- Gamle fase B/C-animationstests genererer historiske sceneforløb. De bevares som eksplicit visuel pakke; den aktuelle funktionalitet kontrolleres af Node-, enzym/HCl-, v2- og sammenhængende-verden-tests.

Alle produktionsfiler bortset fra de to importoprydninger og én nødvendig CSS-værdi i iltspillets landskabslayout er byte-identiske med baseline, inklusive forside og klinisk indhold. JavaScript-AST'en i de to filer er identisk, når importdeklarationerne fjernes fra sammenligningen. Stabile ID'er, databaseskema og dataversioner er uændrede.

## Afhængigheder og sikkerhed

Appen og udviklingsserveren har fortsat ingen npm-runtimeafhængigheder. Three.js-version og alle tre leverandørchecksums er uændrede. Playwright 1.56.1 og Prettier 3.6.2 bevares. Nye låste udviklingsafhængigheder er Acorn 8.19.0, PostCSS 8.5.33 og YAML 2.9.1 til AST-, CSS- og workflowkontrol. `npm ci --ignore-scripts` benyttes i CI. Builds kræver nu disse udviklingsværktøjer; `npm ci` før build er dokumenteret.

GitHub Actions er låst til verificerede commit-SHA'er. Containerens indhold er låst med digest; Node opdateres stadig til seneste patch i version 22. Git-tillid afgrænses til det valgte checkout pr. kommando. Ingen global wildcard-tillid eller svækkelse af TLS er indført.
