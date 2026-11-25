# Dokumenteret ubrugt kode

Baseline: `b69df9b0cee9d2a284824c8c5d6a07159fa30f0b`. Der slettes ingen anatomi, animation, fagtekst, eksport eller kompatibilitetsfunktion.

## Sikre fjernelser

Acorn gennemgår den faktiske JavaScript-AST. Importbindingerne nedenfor har ingen reference i deres modul. Modulerne har andre, bevarede imports, så evaluering og sideeffekter bevares. Ingen af de to moduler bruger eval eller dynamisk JavaScript-generering. Linjer henviser til baseline.

| Fil | Linje | Importnavn | Afhængighed | Risiko og kontrol |
|---|---:|---|---|---|
| `public/digestion-world.js` | 22 | `buildCaecumGeometry` | `./digestion-caecum.js` | Lav: kun ubrugt lokal binding; AST, Node og spilregression |
| `public/digestion-world.js` | 30 | `buildOrganSurface` | `./digestion-anatomy.js` | Lav: kun ubrugt lokal binding; AST, Node og spilregression |
| `public/digestion-world.js` | 30 | `organCurve` | `./digestion-anatomy.js` | Lav: kun ubrugt lokal binding; AST, Node og spilregression |
| `public/digestion-world.js` | 30 | `lumenRadius` | `./digestion-anatomy.js` | Lav: kun ubrugt lokal binding; AST, Node og spilregression |
| `public/digestion-world.js` | 37 | `reactionState` | `./digestion-engine.js` | Lav: kun ubrugt lokal binding; AST, Node og spilregression |
| `public/digestion-world.js` | 39 | `CHARACTERS` | `./digestion-data.js` | Lav: kun ubrugt lokal binding; AST, Node og spilregression |
| `public/digestion-world.js` | 39 | `PRODUCTS` | `./digestion-data.js` | Lav: kun ubrugt lokal binding; AST, Node og spilregression |
| `public/oxygen-game.js` | 1 | `OXYGEN_ID` | `./oxygen-data.js` | Lav: kun ubrugt lokal binding; AST, Node og spilregression |

## Bevares trods manglende produktionsimport

- `public/digestion-absorption.js`: bruges af `test/digestion-absorption.test.js` og historisk faglig dokumentation.
- `public/digestion-camera.js`: bruges af geometri-/performancetests og historiske referencekørsler.
- `public/digestion-epithelium.js`: bruges af `test/digestion-phase-c.test.js` og dokumenterer tidligere epitelvisualisering.

Disse tre filer må ikke slettes som “ubrugte”. Mulig udeladelse fra det statiske produktionsartifact afprøves særskilt med dependency- og runtimekontrol.

Ubrugte eksportkandidater og CSS kræver konservativ vurdering af dynamiske kald, tests og sjældne tilstande. Ingen CSS-regler fjernes alene ud fra runtime coverage. Ingen historiske filer slettes.
