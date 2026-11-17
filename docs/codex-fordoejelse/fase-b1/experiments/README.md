# Udviklingsmålinger

Disse enkeltkørsler blev brugt til at vælge den afsluttende løsning. De erstatter ikke de to gentagne før/efter-runder i mappens overniveau.

- `baseline-clean.json`: reference med oprindelig fase B, mobil.
- `cpu-only.json`: kun oprydning i statiske bounds, matrix- og diagnostikarbejde. Ingen sikker isoleret FPS-gevinst.
- `chunks-lod.json`: indledende LOD med otte længde- og fire vinkelsektioner; mange tegnekald.
- `sections-lod.json`: grovere længdeopdeling og justerede LOD-afstande, PBR og dobbeltsidet tarmvæg.
- `wall-candidate.json`: længdesektioner/LOD med frasortering af tarmvæggens bagsider. Denne kombination blev valgt.
- `phong-candidate.json`: alternativ belysningsmodel på den indledende finsektionerede model; fravalgt.
- `shader-candidate.json`: forudberegnede sinus/cosinus-koefficienter på længdesektionerne; fravalgt.
- `profile-before.json` og `profile-cpu.json`: særskilte instrumenterede CPU-kørsler, ikke afsluttende FPS-resultater.

Alle disse målinger bruger software-rendering og fast pixelratio 0,8. Rå billedintervaller er gemt. De fravalgte varianter er ikke indført i spillet.
