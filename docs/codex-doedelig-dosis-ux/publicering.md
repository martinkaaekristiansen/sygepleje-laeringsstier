# Bekræftet udgivelse – Dødelig dosis UX

Kontrolleret 2026-11-26T19:57:58+01:00 (dansk tid). **Deployment og den faktiske offentlige version er verificeret.**

- [Åbn spillet](https://martinkaaekristiansen.github.io/sygepleje-laeringsstier/#/sti/doedelig-dosis/sagsmapper).
- [Åbn forsiden](https://martinkaaekristiansen.github.io/sygepleje-laeringsstier/).
- [Se billeder direkte på GitHub](billedoversigt.md) · [Rapport](rapport.md) · [18 opgavemålinger](opgavemaalinger.md).

## Git og gendannelse

| Trin | Identifikation |
|---|---|
| Tidligere main | `6818b56e82d690d4efc209c010985f49ab8092e1` |
| Backupbranch | `backup-main-foer-doedelig-dosis-ux` → `6818b56e82d690d4efc209c010985f49ab8092e1` |
| Udviklingsbranch | `doedelig-dosis-ux` – bevaret |
| Implementeringscommit | `b59a4f0f027372e17159026183d0330ab2c147d7` |
| PR | [#14](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/pull/14) |
| Merge og udgivet kode | `e607953b9b3d3073c8a9dadc5a48340b21055870` |
| Offentlig assetversion | `assets/a7be319f5e1a` |

Main havde ikke nyere ændringer før merge. Mergecommitten har både den oprindelige main og implementeringscommitten som forældre. Ingen force-push. Ingen udviklings- eller backupbranch er slettet. Den efterfølgende dokumentationscommit ændrer ingen filer i `public/`; den offentlige kode er identisk med mergecommitten.

## Automatiske kvalitetskontroller

| Kontrol | Resultat | Link |
|---|---|---|
| Normal PR-validering | 25/25 jobs bestået | [Run 45876080085](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/runs/45876080085) |
| Pages inklusive main-validering, prepare og deploy | 27/27 jobs bestået | [Run 45877894721](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/runs/45877894721) |
| Faktisk offentlig browserkontrol | Bestået | [Run 45879551053](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/runs/45879551053) |

Begge normale valideringer bekræfter **282 Node-tests, 0 fejl**, reproducerbart build og samme assetversion. Den fulde platformregression er bestået, inklusive eksisterende læringsspil. Lokal `git diff --check` bestod før commit. [Maskinlæsbare workflowresultater](ci-resultater.json).

## Offentlig kontrol efter deployment

Forsiden svarer HTTP 200 og henviser til `a7be319f5e1a`. Alle **127 udgivne aktiver** er hentet med normal TLS-kontrol og matcher kildefilerne byte for byte, inklusive JavaScript, CSS, caseindhold, alle billeder og øvrige spils afhængigheder. [Resultater og SHA-256](public-assets.json).

En enkelt, separat QA-branch kører read-only browserkontrol mod den offentlige adresse og checker den præcise udgivne mergecommit ud. Den ændrer ikke produktionskode, bygger ikke hjemmesiden igen og anvender ikke deaktiveret certifikatkontrol. Main indeholder ingen ekstra permanent workflow.

Den offentlige browserkontrol bekræfter:

- Korrekt publiceret assetversion, forside, quiz, migration, backup og navigation.
- De tre eksisterende læringsspil på både desktop og emuleret mobil.
- Fire komplette Dødelig dosis-ruter, heraf to på mobil; også en rute med vildledende spor. Afleveringer giver de uændrede forventede 100 point.
- Fire hovedfaner, notesbog, kildevisning uden nye fund, tavle, hypoteser, hints, struktureret afslutning, UTH og eksport.
- Fem syntetiske saves fra den gamle v1-motor samt genoptagelse midt i den nye afslutning.
- Ti skærmstørrelser, 30 tavlespor, tekstzoom, reduceret bevægelse, fokus/scroll og alternativ infusionsfixture.
- Ingen registrerede JavaScript-fejl eller fejlede ressourceforespørgsler i de fulde sagsruter.

Browserkørslen foregår på GitHub-runneren, fordi det lokale Chromiums certifikatlager ikke accepterer miljøets HTTPS-forbindelse. Den offentlige kontrol bruger almindelig certifikatvalidering. Native HTTPS-hentning af de 127 filer fungerer også med almindelig TLS-validering lokalt.

## Begrænsninger

Ingen kendte blokerende fejl i de gennemførte tests. Mobiltest er emuleret Chromium, ikke fysisk iPhone, VoiceOver eller et virkeligt skærmtastatur. Målingerne er automatiserede og heuristiske, ikke et undervisningsforsøg med studerende. Clipboard kræver browserens tilladelse; eksport/print er alternativer. Gamle, brugerplacerede tavlekort flyttes ikke automatisk, selv om de overlapper. Se [rapportens afvejninger og performance](rapport.md).
