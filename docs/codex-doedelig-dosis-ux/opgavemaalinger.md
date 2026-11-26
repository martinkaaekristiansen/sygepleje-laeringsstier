# Opgavemålinger før og efter

18 automatiserede opgaver ved to skærmstørrelser (72 registreringer). **Dette er en reproducerbar UI-måling, ikke en undersøgelse med studerende.** Maskinens køretid er ikke brugerens løsningstid. Klik tæller DOM-click; indtastning og valg i native select tæller ikke som pointerklik. Rulning inkluderer browserens automatiske rulning.

## 1280 pixels

| Opgave | Klik før → efter | Rulning før → efter (px) | Synlige felter før → efter |
|---|---:|---:|---:|
| 1. Start sag | 1 → 1 | 448 → 493 | 0 → 0 |
| 2. Genoptag fra sagsmapper | 1 → 1 | 520 → 545 | 0 → 0 |
| 3. Åbn interview | 1 → 1 | 722 → 0 | 0 → 0 |
| 4. Gem oplysninger i scenen | 1 → 1 | 0 → 0 | 0 → 0 |
| 5. Skriv hurtig scenenote | 2 → 2 | 815 → 827 | 0 → 1 |
| 6. Find næste handling fra dokumentstart | 0 → 1 | 752 → 0 | 0 → 0 |
| 7. Åbn notes kilde | 1 → 1 | 996 → 0 | 0 → 0 |
| 8. Vend tilbage til aktiv efterforskning fra kilde | 2 → 1 | 45 → 545 | 0 → 0 |
| 9. Søg i notesbog | 1 → 0 | 122 → 0 | 8 → 2 |
| 10. Fastgør note | 1 → 1 | 920 → 754 | 8 → 2 |
| 11. Forbind to spor uden obligatorisk forklaring | 1 → 3 | 967 → 1113 | 3 → 3 |
| 12. Gem foreløbig hypotese | 2 → 2 | 765 → 533 | 44 → 3 |
| 13. Hent mindst afslørende hint | 2 → 2 | 0 → 0 | 0 → 0 |
| 14. Sammenhold journal og administration via arkiv | 4 → 4 | 896 → 2648 | 0 → 0 |
| 15. Start egen afsluttende konklusion | 1 → 2 | 0 → 0 | 49 → 3 |
| 16. Aflevér færdig kladde | 3 → 8 | 3177 → 1437 | 0 → 0 |
| 17. Åbn rekonstruktion efter afslutning | 0 → 1 | 2309 → 0 | 0 → 0 |
| 18. Genoptag gammelt v1-spil og se bevarede noter | 1 → 1 | 0 → 0 | 14 → 2 |

## 390 pixels

| Opgave | Klik før → efter | Rulning før → efter (px) | Synlige felter før → efter |
|---|---:|---:|---:|
| 1. Start sag | 1 → 1 | 513 → 661 | 0 → 0 |
| 2. Genoptag fra sagsmapper | 1 → 1 | 679 → 661 | 0 → 0 |
| 3. Åbn interview | 1 → 1 | 1174 → 0 | 0 → 0 |
| 4. Gem oplysninger i scenen | 1 → 1 | 774 → 632 | 0 → 0 |
| 5. Skriv hurtig scenenote | 2 → 2 | 1389 → 1199 | 0 → 1 |
| 6. Find næste handling fra dokumentstart | 0 → 1 | 1314 → 0 | 0 → 0 |
| 7. Åbn notes kilde | 1 → 1 | 1972 → 0 | 0 → 0 |
| 8. Vend tilbage til aktiv efterforskning fra kilde | 2 → 1 | 895 → 661 | 0 → 0 |
| 9. Søg i notesbog | 1 → 0 | 878 → 0 | 8 → 2 |
| 10. Fastgør note | 1 → 1 | 1325 → 632 | 8 → 2 |
| 11. Forbind to spor uden obligatorisk forklaring | 1 → 3 | 987 → 1327 | 3 → 3 |
| 12. Gem foreløbig hypotese | 2 → 2 | 811 → 213 | 44 → 3 |
| 13. Hent mindst afslørende hint | 2 → 2 | 0 → 0 | 0 → 0 |
| 14. Sammenhold journal og administration via arkiv | 4 → 4 | 3123 → 4420 | 0 → 0 |
| 15. Start egen afsluttende konklusion | 1 → 2 | 0 → 0 | 49 → 3 |
| 16. Aflevér færdig kladde | 3 → 8 | 3513 → 1591 | 0 → 0 |
| 17. Åbn rekonstruktion efter afslutning | 0 → 1 | 3023 → 0 | 0 → 0 |
| 18. Genoptag gammelt v1-spil og se bevarede noter | 1 → 1 | 0 → 0 | 14 → 2 |

## Fortolkning og afvejninger

- Fire hovedfaner mod otte før. Hypotese, farmakologi og afslutning kræver nu ét ekstra menutryk.
- Næste handling kræver ét tryk og ingen dokumentrulning; tidligere lå valgene nederst.
- Kilder kan ses uden at ændre den aktive scene, og retur kræver ét tryk.
- Notesøgning behøver ikke Anvend filter og bevarer tastaturfokus og markør.
- Tavlens forklaring er valgfri. Den nye tretryksmetode giver et entydigt valg af to kort; alternativet med formular er bevaret.
- Afslutningen bruger flere videre-tryk for at vise færre felter og adskille egen konklusion fra svarmuligheder. Alle spørgsmål og point er bevaret.
- Ingen automatiske modalafbrydelser, automatiske hints eller tvungen tutorial. Dialoger åbnes kun efter brugerens handling.
- Tab/fokus, søgning, kilde-retur og gemmehandlinger kontrolleres særskilt af browser-regressionen; målte tab af fokus og uventede rulninger dér: 0.

De fire komplette afleveringstests og den separate genoptagelsestest dokumenterer korrekt progression, herunder aflevering uden alle valgfrie spor. [Rådata](task-metrics.json), [kontrolmålinger](after-metrics.json), [browserresultater](ux-results.json).
