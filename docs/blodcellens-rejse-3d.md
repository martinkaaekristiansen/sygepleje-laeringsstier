# Blodcellens rejse: første WebGL-demonstration

Denne gren er **ikke udgivet**. Den indeholder den ønskede første demonstrationssekvens: **aorta → arterier → arterioler → kapillærer**. Den fulde eksisterende læringsaktivitet med tre sværhedsgrader, hjertet, lungerne, spørgsmål og progression er bevaret. Den bruger endnu sin hidtidige renderer. Denne demonstration er et visuelt vurderingspunkt før en videre udbredelse af det nye udtryk.

## Afprøvning

- Start appen lokalt med `npm run dev`. Åbn `http://localhost:3000/#/blodcelle-3d`.
- Alternativt: gå til Blodcellens rejse og vælg **Prøv den nye 3D-demonstration**.
- `npm run build:preview:3d` laver `artifacts/blodcellens-rejse-3d.html`, en selvstændig HTML-fil med motor, kode og CSS indlejret. Ingen CDN, konto, server-API eller abonnement er nødvendigt. Testmiljøets politik blokerer `file://`; den selvstændige fil afprøves derfor via lokal HTTP her. En browser, der også blokerer lokale moduler, skal bruge den lokale webserver.
- Vælg **Begynd rejsen**. Kameraet transporterer dig frem mod en forgrening. Tryk på en gren eller dens lille skilt. Tab/Enter og venstre/højre pil virker også.
- To fejl afslutter forsøget. Et fejlfrit forsøg giver en særlig medalje. Prøvens resultater gemmes separat fra læringsstiens gennemførelser.
- Lydpanelet genbruger appens tre eksisterende lydlag og gemte lydindstillinger. Lyd er valgfri og starter først efter en brugerhandling. Lungelyden er naturligt stille i denne systemiske sekvens.
- **Grafik: Automatisk / Høj / Let** justerer opløsning, geometriens detaljer, skygger og antal erytrocytter. Reduceret bevægelse viser den samme 3D-geometri uden kontinuerlig kamera- eller cellebevægelse.

## Teknologivalg og arkitektur

Projektet er en JavaScript-app med ES-moduler, ikke React. Three.js bruges direkte gennem WebGL 2. React Three Fiber og Drei ville kræve en ny React-arkitektur uden at forbedre selve geometrien. Der er derfor ikke indført en anden UI-platform.

Three.js **0.180.0** er inkluderet lokalt med MIT-licens i `public/three-LICENSE.txt`. De to minificerede motorfiler fylder tilsammen ca. 720 kB før HTTP-komprimering. Motoren indlæses først, når man åbner 3D-demonstrationen. Overfladeteksturer genereres i browseren; der hentes ingen modeller, billeder eller lydfiler fra eksterne tjenester.

| Fil | Ansvar |
| --- | --- |
| `journey-3d-data.js` | Demonstrationsrute, konkrete anatomiske mål, mulige grene og feedback. |
| `journey-3d-geometry.js` | Sammenhængende implicit Y-geometri, glatte normaler, bikonkav erytrocyt og lokale vægteksturer. |
| `journey-3d-world.js` | WebGL-renderer, kamera, lys, instanser, partikelflow, pointer-raycasting, grafikniveau og oprydning. |
| `journey-3d-demo.js` | Tilgængelig brugerflade, to liv, forsøgsforløb, medalje og den eksisterende lydmotor. |
| `journey-3d.css` | Diskret HUD, responsive etiketter, kort og feedback. |

Karret er ét polygonnet fremstillet fra en glat union af kurvede kar. Det består ikke af flade billeder, sprites eller ovale CSS-flader. To overlappende, lukkede rør ville blokere grenene; derfor bruges implicit overfladegenerering og åbne forbindelser. Mesh- og raycast-test kontrollerer, at begge kamerapassager er åbne, og at der ikke er en tredje, ligeudgående åbning.

Erytrocytten er et lukket bikonkavt polygonnet. Flere celler renderes med instancing. Materialer reagerer på lys, og væggene får små overfladevariationer via lokale farve- og bumpteksturer. Belysning, normaler, perspektiv og kameratransport er tredimensionelle; CSS bruges kun til brugerfladen.

Kameraet følger kurver inde i lumen. Når en gren vælges, transporteres det gennem den samme geometri, som spilleren ser. Næste kar placeres i forlængelse af kameraets position og retning; WebGL-rendereren genstartes ikke mellem trinene. Ved ubeslutsomhed sænkes kameraet gradvist før skillevejen. Det kan ikke fortsætte forbi et nødvendigt valg eller springe trin over.

## Anatomiske valg

Demonstrationen følger blodet til et **aktivt muskelområde i højre biceps**. Første Y-forgrening er en forenklet fremstilling af truncus brachiocephalicus efter aorta: mod højre arm eller mod hoved/hals. Dernæst vælges mellem kar mod biceps og triceps og mellem to kapillærnet med forskellige lokale mål.

Begge grene er anatomisk mulige. Et andet mål koster et liv i denne fastlagte rute, men feedbacken siger udtrykkeligt, at grenen er normal. Demonstrationen ændrer ikke de definerede strukturrækkefølger i det eksisterende spil.

De gamle distraktorer omfatter f.eks. aorta → vener og forbindelser på tværs af hjertets skillevæg. De kan ikke uden videre tegnes som faktiske 3D-forbindelser. Når motoren udbredes til resten af spillet, skal rutehypoteser og anatomisk eksisterende forbindelser fortsat holdes adskilt. Der må ikke modelleres fiktive åbninger i hjertet for at få to svarmuligheder.

## Kapillærer og gasudveksling

Lumen bliver væsentligt mindre, og blodcellerne passerer i én række. Deres form tilpasses den snævre passage. Den tynde væg er delvist transparent som et undervisningsvindue, så muskelvævet kan anes udenfor. Små O₂-markører bevæger sig mod vævet, mens CO₂-markører bevæger sig ind i blodet.

Erytrocytternes røde nuance afhænger af deres position gennem kapillæren: nytilført blod har mere bundet ilt end blod, som har passeret udvekslingsområdet. Iltfattigt blod forbliver rødt og har stadig bundet ilt. Der gives ikke et tal for saturation; farven er en kvalitativ illustration.

Lys inde i blodkarret, transparens, synlige gasmarkører og lyde er bevidste undervisningshjælpemidler. Det er ikke en bogstavelig optagelse fra blodbanen. Modellen er ikke målfast, og celletætheden er reduceret for at gøre ruten læsbar.

## Performance og tilgængelighed

- Genbrug af én WebGL-renderer, instancing og lokale, små teksturer.
- Forberedte geometrier gemmes i hukommelsen til genbrug; arbejdet opdeles, så UI kan reagere under klargøring.
- Automatisk lavere opløsning og færre celler på mobile/svage enheder. Software-renderere genkendes og bruger et lavere renderbudget.
- Lys er begrænset, skygger deaktiveres i let kvalitet, og der bruges ingen tung efterbehandling.
- Reduceret bevægelse og pause standser animationen. Statiske scener behøver ikke genrendering ved hvert animationstik.
- Tastaturbetjente HTML-etiketter ligger ved de projicerede 3D-grene. Raycasting gør selve passagerne klikbare. Liv, mål og fejl er tilgængelige som tekst.
- WebGL-fejl giver en tydelig besked og en vej tilbage til den eksisterende læringssti. Der skiftes ikke skjult til en ny, flad 2D-version.

## Verifikation og begrænsninger

Enhedstest kontrollerer demonstrationsruten, to entydige valg, reelle alternative mål, lukket bikonkav cellegeometri og åbne Y-passager. Browsertest dækker WebGL, sceneskift, liv, genstart, tastatur/touch, reduceret bevægelse, resultatlagring og adskillelse fra eksisterende progression. Fejlbeskeden kontrolleres også inde i mobilens spillefelt. Appens tidligere regressionstest er bestået, herunder alle 56 spørgsmål og de tre eksisterende spilruter.

Verificeret lokalt: `npm test` (12 testfiler), `npm run build`, `npm run test:browser` og `npm run build:preview:3d`. Efter de sidste materialeændringer er den særskilte `npm run test:3d` og den selvstændige HTML-fil afprøvet igen. HTML-prøven gennemfører alle fire scener og viser resultatet uden eksterne netværkskald eller JavaScript-fejl. Pages-adfærd er testet under `/sygepleje-laeringsstier/` på en lokal server; der er ikke foretaget offentlig udgivelse.

Grafikken er faktisk åbnet og visuelt gennemgået i Chromium. Miljøet bruger **ANGLE/SwiftShader**, dvs. WebGL i software. De løbende afprøvninger har ligget omkring **5–7 FPS ved den viste desktop-scene i dette miljø**. Det er ikke en måling af almindelige enheders GPU-ydelse, og der gives derfor ingen garanti om 60 FPS eller godkendelse på fysiske smartphones. Den automatiske lette profil er aktiv under disse softwaretests. Der skal foretages afprøvning på de ønskede telefoner/computere før offentlig udgivelse.

## Næste udvidelse efter vurdering af demonstrationen

1. Tilpas den visuelle retning ud fra brugerens vurdering af den kørende prøve, især materialer, lys og kamerafølelse.
2. Byg særskilte venemiljøer, atrier og ventrikler med genkendelig muskulatur og trabekler.
3. Byg AV- og semilunarklapper som deformerbare 3D-flader og koordinér kameraets passage med det eksisterende fælles hjerteur.
4. Byg det pulmonale kapillærnet med alveoler, respiration og den modsatrettede gasudveksling.
5. Kobl den nye renderer til alle tre eksisterende ruter uden at ændre gemte trin-id'er, liv eller gennemførelser. Gennemtest og udgiv først efter brugerens godkendelse.

Den første demonstration er altså ikke en påstand om, at den fulde 3D-konvertering af hjertet, lungerne og alle tre sværhedsgrader er færdig.
