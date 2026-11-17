# Fordøjelsens vilde rejse – fase A

Arbejdsgrundlag: `forbedringer-fordoejelse`, commit `7272e50f4e96d86c273f5911a0ee2f88ef934a8d`.

## Ændringer

- Anatomiske vejvalg samler spørgsmålet »Hvad er næste anatomiske struktur?« og de to eksisterende svar i én kompakt boks. Indgangsvalget beholder sit særskilte spørgsmål.
- Kun svarknapper og deres tastaturbetjening afgiver svar. Canvas bruges fortsat til at kigge rundt; raycasting til svar er fjernet.
- Ét permanent, molekylespecifikt informationsfelt erstatter de tre ekstra infoknapper, læsepaneler og ekstra informations-/fremhævningskontroller i indstillingerne. Historiske læringsdata bevares i gemningsformatet.
- Fælles enzymidentiteter og silhuetter anvendes i SVG-ikoner, 3D-svarmodeller og relevante sekret-/børstesømsmodeller. Identitet følger navnet, uafhængigt af svarrækkefølge. Galde har et dråbesymbol og klassificeres ikke som et enzym.
- Bugspytkirtlen får sit eget ikon i stedet for fejlagtigt at matche »spyt«. Spytkirtler og galdeblære har særskilte silhuetter.
- Grafikvælgeren er fjernet. Renderopløsning tilpasses automatisk fra et højt udgangspunkt efter billedhastigheden og kan stige igen. Ved lavt renderbudget undgås også den dekorative overgang med to samtidige scenemodeller. Ingen anatomiske strukturer eller læringsanimationer fjernes. Gamle gemninger med `quality: low` kan fortsat læses, men indstillingen styrer ikke længere grafikken.
- Små skærme bruger tekstombrydning og intern rulning; ved 320 px står molekylesvarene under hinanden. Kropskort og informationsfelt holdes fri af svarboksen.

Nye moduler: `digestion-enzyme-identity.js`, `digestion-enzyme-model.js`, `digestion-performance.js`. Controller, CSS, præsentation, læring og sekreter er tilpasset. Den anatomiske rute, motorens scoring og gemningsvalidering samt lydsystemet er bevaret.

## Udført kontrol

- `npm test`: 130 bestået, 0 fejl, inklusive de eksisterende 126 tests og fire nye fase A-tests. Den eksisterende sekret-test er opdateret til de nye enzymmodeller frem for den gamle generiske torusknude.
- `tests-browser/digestion.cjs`: seks komplette rejser (alle tre molekyler på desktop og emuleret mobil), 15 stationer, fejlvalg/retry, tastatur, absorption, sluttest/repetition, gemning/genoptagelse, migrering og WebGL-fallback bestået.
- `tests-browser/digestion-audio.cjs`: desktop og mobil, brugeraktivering, gain/lydstyrke, mute, tygge-synkronisering, pause ved indstillinger, oprydning og manglende AudioContext bestået. Kontrollen af det fjernede læsepanel er erstattet med kontrol af indstillingspanelet.
- `tests-browser/digestion-phase-a.cjs`: layout ved 320×568, 390×844, 768×1024, 844×390 og 1280×800, lange svar, ingen overlap mellem information/kropskort/svarpanel, enzym-/ikonidentitet, ingen svar ved canvas-klik og bevaret trækbetjening bestået. Tilføjet til `npm run test:browser` uden at fjerne de eksisterende suiter.
- `tests-browser/game-viewport.cjs`: fælles betjening, start/genoptagelse, rotation, indstillinger, scroll-lås og oprydning på mobil/desktop bestået.
- Screenshots af desktop, mobil, landskab og lange svar er visuelt gennemset.
- `npm run build` og `git diff --check` bestået.

Mobilkontrollen bruger Chromium med emulerede skærmstørrelser/touch; fysiske iOS-/Android-enheder er ikke testet. Automatisk renderbudget er enhedstestet; software-rendering i cloud er ikke en måling af telefoners billedhastighed.

## Afgrænsning

Fase B–E er ikke implementeret. De tidligere identificerede problemer med portalringe, epiglottis, villi, absorptionsstruktur, organspecifik motilitet, colon-kamera og toiletfinale afventer de efterfølgende godkendte faser. Modeltildækning og placering af enzym/substrat hører fortsat til den senere synlighedskontrol; fase A ændrer deres identitet og betjening.
