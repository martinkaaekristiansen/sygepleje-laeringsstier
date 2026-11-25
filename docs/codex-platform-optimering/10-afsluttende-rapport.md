# Afsluttende rapport

Arbejdet foregår på `optimering-oprydning-ci-cd` med udgangspunkt i `b69df9b`. **Main er ikke ændret eller udgivet.**

Udgivelsesprocessen er opdelt i fælles kvalitetskontrol, konservativt valgte regressioner og en main-afgrænset Pages-deploy. Den tidligere browserpakke stod for 56 af cirka 58 minutter. Testene afvikles nu på isolerede runners, og iltspillet er med i den samlede regression. Små dokumentationsændringer kan undgå build/deploy helt.

Sparse checkout reducerede CI-arbejdsfiler fra cirka 220 MB til 2,3 MB uden at slette historik. Byggetiden faldt i samme lokale måleopstilling fra median 2,67 til 0,95 sekunder. Produktets bytes faldt beskedent, 0,34 %. Spillets FPS og grafik er ikke ændret.

Otte ubrugte importnavne er fjernet efter dokumentation. Ingen kildefiler, tests, fagtekster, modeller, brugerdata eller historisk dokumentation er slettet. Arkivering af store historiske medieserier afventer konkret godkendelse; se [planen](06-arkiveringsplan.md).

247 Node-tests, build, syntaks og den fælles browserpakke består lokalt. Endelig CI-status, fuld regression og måleresultater færdiggøres i [testresultater](07-testresultater.md) og [før/efter](08-performance-foer-efter.md), når den igangværende kørsel er afsluttet.

## Fremover, efter godkendt merge

- Merge almindeligt til `main`; ændringsanalysen vælger automatisk de nødvendige kontroller. Små kendte tekstrettelser får den fælles pakke; spil-/kernemodulændringer får relevant eller fuld regression.
- Dokumentation alene kontrolleres uden en unødvendig Pages-udgivelse.
- Brug **Fuld regression og PR-kontrol → Run workflow** til fuld manuel funktionel kontrol. Kør performance- og dokumentationsscripts særskilt mod de ønskede versioner. Den natlige kørsel giver ekstra funktionel kontrol.
- Brug **Udgiv Læringsstier på GitHub Pages → Run workflow**, branch `main`, hvis en fuld manuel udgivelse ønskes. Deployment starter kun efter alle krævede kontroller.
- Lokalt: `npm ci`, `npm test`, `npm run build`, `npm run test:browser:smoke`; `npm run test:browser` inkluderer hele den funktionelle pakke og starter selv Pages-testservere.

Første produktionstid efter merge skal stadig måles. 2–5/5–10 minutter er mål, ikke garanti for alle ændringer. Hardware/iPhone-oplevelse er ikke målt på en fysisk enhed her. Store realtidsforløb og runnerkø kan fortsat være begrænsende.

[Baseline](01-baseline.md) · [Kodeaudit](02-kodeaudit.md) · [Ubrugt kode](03-ubrugt-kode.md) · [Dubletter](04-dubletter.md) · [CI/CD](05-ci-cd-optimering.md) · [Arkivplan](06-arkiveringsplan.md) · [Tests](07-testresultater.md) · [Målinger](08-performance-foer-efter.md) · [Alle ændringer](09-aendringsoversigt.md).
