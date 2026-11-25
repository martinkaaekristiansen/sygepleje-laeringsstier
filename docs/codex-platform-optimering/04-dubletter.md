# Dubletter og fælles kode

SHA-256 fandt **9 grupper** af identiske filer, med **6.468.176 bytes** i ekstra kopier (6,17 MiB). Den fulde liste med checksums og stier findes i [audit-data.json](audit-data.json). Alle er bevaret.

| Materiale | Ekstra bytes | Vurdering |
|---|---:|---|
| Uploadet screenshot 02/04 | 47.572 | Brugerens originale materiale; bevar |
| To continuous/state-checks JSON | 722 | Proveniens fra forskellige rapporter; bevar |
| Fase B.1 efter / fase C før, jejunum desktop | 980.330 | Sammenligningsreference, bevar semantik |
| Samme, mobil | 365.460 | Sammenligningsreference |
| Coarse/fine jejunum forward | 1.172.026 | Dokumenterer ens billede i en kontrol |
| Duodenum mobil i tre performanceforløb | 857.774 | Tre målesammenhænge |
| Jejunum desktop i tre performanceforløb | 2.404.350 | Tre målesammenhænge |
| Ilt, venstre ventrikel før/efter | 444.500 | Sammenligningsmateriale |
| Ilt, væv før/efter | 195.442 | Sammenligningsmateriale |

Byte-identiske før/efter-billeder kan være fagligt nyttige som dokumentation for uændret udseende. Deres filnavne må ikke blot erstattes uden at bevare relationen mellem rapport, måledata og billede. Ingen links er omskrevet som led i denne opgave.

## Kodedubletter

De tre spil anvender allerede fælles UI-, viewport-, lyd-, eksamens- og hjertegeometrimoduler. Der er ikke dokumenteret gevinst ved at samle deres forskellige kameraruter, mikroanatomi, sekretioner eller lydprofiler i én ny abstraktion. Det ville øge risikoen uden at løse CI-flaskehalsen.

Én reel udviklingsdublet er samlet: `server.js` og `tests-browser/oxygen-build.cjs` brugte hver deres statiske HTTP-server. De bruger nu [scripts/static-server.js](../../scripts/static-server.js). Fælles kode håndterer MIME, Pages-undermappe, en tilfældig lokal port, GET/HEAD, sti- og symlinkafgrænsning samt oprydning. Browser-testens eksisterende assertions er bevaret. Dette forbedrer vedligeholdelse og testisolation, men tælles ikke som en stor produktions- eller udgivelseshastighedsgevinst.

Fjernet i denne fase: **0 fil-dubletter**, **0 historiske billeder**, **0 tests**. To serverimplementeringer bliver til én fælles implementering. Ingen CSS-regler er slettet.
