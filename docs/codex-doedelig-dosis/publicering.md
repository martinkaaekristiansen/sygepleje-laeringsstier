# Bekræftet publicering · 25. november 2026

**Dødelig dosis er merget og offentligt udgivet på GitHub Pages.** Både deployment, de offentlige filer og den faktiske browseroplevelse er efterfølgende verificeret.

- [Åbn Dødelig dosis](https://martinkaaekristiansen.github.io/sygepleje-laeringsstier/#/sti/doedelig-dosis/sagsmapper)
- [Hjemmesidens forside](https://martinkaaekristiansen.github.io/sygepleje-laeringsstier/)
- [Pull request #13](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/pull/13)
- [Fuld PR-kontrol · bestået](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/runs/45698746186)
- [GitHub Pages · bestået](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/runs/45700956753)
- [Offentlig browsertest · bestået](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/runs/45703208111)
- [HTTP- og SHA-256-kontrol af alle offentlige assets](public-assets.json)

## Commits og branches

| Formål | Commit |
| --- | --- |
| Stabil main før udvikling og udgivelse | `62efe8c38c552c08616a6951d80b91a002b40b2b` |
| Komplet implementering, billeder, tests og dokumentation | `218bd051f12a73683146e77bc5f54b59d403d5f9` |
| Entydig katalogvælger i eksisterende regressionstest | `14a5192775d5ceb2ed2a0610936d8dccbc01f640` |
| Merge til main og det bekræftede produktionsbuild | `535e23574c2c4d1bfc4e9d23e4f97a47d4e2380e` |

Udviklingsbranchen **doedelig-dosis** bevares. Backupbranchen **backup-main-foer-doedelig-dosis** peger på den tidligere main, `62efe8c…`. De tidligere udviklings- og backupbranches er ikke slettet. Der er ikke anvendt force-push eller omgået branchbeskyttelse.

Denne publiceringsnote og assetbeviset tilføjes som et efterfølgende **rent dokumentationscommit**. Det ændrer ingen publicerede kode- eller billedfiler. Produktionskoden svarer fortsat til merge-committet ovenfor, og den eksisterende CI kan derfor springe build/deployment over for dokumentationsopdateringen.

## Testresultater

- **266/266 Node-tests** består, heraf 19 nye motor-/datatests. Syntaks, build og `git diff --check` består.
- Fuld regression omfatter **39 browserkørsler fordelt på 30 funktionelle scripts**, organiseret i den eksisterende parallelle matrix.
- PR-kørslen: **25/25 jobs bestået**, samlet **12 minutter og 30 sekunder**.
- Produktionskørslen: **27/27 jobs bestået**, inklusive prepare og deploy, samlet **12 minutter og 28 sekunder**.
- Den nye browsergruppe brugte **47,167 sekunder** på selve testen i PR-kørslen. Den bliver ikke føjet til hver af de lange 3D-grupper.
- Fire komplette nye caseforløb består: tre forskellige hovedveje og et forløb med vildledende spor. De omfatter genoptagelse, noter, markering, individuelle prøver, manuel tavle, mus, touchtræk, tastatur, tre hypotesestop, hints, eksport, evaluering, rekonstruktion og simuleret UTH.
- Otte viewports er kontrolleret fra 320 pixels bredde til desktop og landskab.

## Offentlig kontrol

Den offentlige forside returnerede HTTP 200 med **assets/db987f5385ae**. **126 af 126 assetfiler** returnerede HTTP 200 og matchede de godkendte kildefilers SHA-256. Dette omfatter JavaScript, CSS, de eksisterende spilressourcer og alle 19 nye WebP-billeder.

Browsertesten brugte almindelig TLS-kontrol på en isoleret GitHub-runner, fordi det lokale browsermiljø afviste sit proxycertifikat. Ingen certifikattillid er ændret, og TLS-fejl er ikke ignoreret. Kontrollen lå på en separat QA-branch med kun læseadgang og ændrede ikke main-pipelinen eller hjemmesiden.

På den faktiske offentlige adresse er følgende bestået:

1. Forside → 3. semester → Dødelig dosis → start af sag 001.
2. Fire komplette efterforskningsveje, inklusive egne noter, tavle, gemning/genoptagelse, slutrapport og lokal UTH-eksport.
3. Platformens eksisterende quiz-, migrations-, backup-, korruptions-, XSS- og navigationskontroller.
4. Blodcellens rejse, Fordøjelsens vilde rejse og Iltens rejse ved opstart på desktop og emuleret mobil.
5. Ingen uventede JavaScript-fejl, HTTP-fejl eller eksterne dataanmodninger i gennemspilningerne. En tilsigtet billedfejl indgår særskilt i fallbacktesten.

## Resultat og begrænsninger

Se [rapporten](rapport.md), [faglige kilder](faglige-kilder.md), [illustrationer](illustrationer.md), [screenshots](screenshots/) og [galleriet](galleri.html). Der er 19 genererede fotos, en kontrolleret SVG-pulsgraf og 24 faktiske screenshots. Ingen diagnostisk EKG-kurve er genereret med AI.

Forsidens dekodede ressourcer vokser kun med **1.947 bytes**; sagsbilleder indlæses efter behov. Det lokale build ligger fortsat omkring ét sekund. Udgivelsestiden er fortsat omkring 12½ minut og er ikke vendt tilbage til den tidligere time.

Ingen fysisk iPhone/Safari er til rådighed for kontrollen. Mobil og touch er emuleret med Chromium. Der er ingen lyd, ingen seks yderligere komplette sager og ingen importfunktion til spillets JSON-eksport. Platformens tidligere backupformat inkluderer ikke disse separate sagsdata; brug spillets egen eksport.

En mindre UX-begrænsning ved fremtidige caseversionsskift: noter og gyldige fund bevares, og en gammel slutvurdering nulstilles, men opdateringsbeskeden kan forsvinde ved første vellykkede autosave. Det påvirker ikke denne førstegangsudgivelses gennemspilning eller gemning. Før en senere indholdsopdatering af en eksisterende sag bør beskeden gøres vedvarende og genkontrolleres.

Der er ingen kendte kritiske fejl i den offentliggjorte gennemspilning. Kildekontrollen er dokumenteret, men er ikke en uafhængig klinisk certificering. Sagen er fiktiv undervisning og erstatter ikke kliniske instrukser.

Kommende sager tilføjes med eget datamodul, lokale billeder og en registerpost; se [vejledningen og caseskabelonen](nye-sager.md). Den ikke-offentlige infusionsfixture kontrollerer, at motoren fungerer med andet indhold end digoxin. Der er ikke påbegyndt seks yderligere sager.
