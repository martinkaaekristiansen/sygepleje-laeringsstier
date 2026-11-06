# Læsbarhed og enklere spilbetjening · 0.10.2

- Anatomiske valg vises med 16 px på smalle telefoner og 18 px på større skærme. Feedback, knapper og indstillinger bruger mindst 16 px. Overskrifter, status og kropskortets tekster er også gjort større.
- Svarfelterne holdes på hver sin side uden overlap. Der reserveres plads til overskrift, feedback, kort og progression. Lang feedback kan scrolles inde i feltet; spillesiden forbliver låst.
- »Pause bevægelse«/»Start bevægelse« ligger i indstillingerne. En valgt pause bevares, når panelet lukkes.
- Spillet opretter 3D-motoren med `quality: 'high'` på alle enheder. Den automatiske nedjustering er dermed slået fra for læringsaktiviteten; grafikvælgeren er fjernet. Motorens generelle kvalitets-API bevares til eksisterende selvstændige demonstrationssider.
- Kropskortet hedder nu »KROPSKORT«. Facts og placeringens lille faktatekst er fjernet fra indstillingerne. Den ekstra instruktion »Vælg næste struktur · to rutehypoteser« er fjernet fra spilleskærmen. De anatomiske rutedata og fejlfeedback bevares.

`game-viewport.cjs` kontrollerer nu også skriftstørrelse, høj kvalitet på mobil/computer, fjernede kontroller, adskilte svarfelter og pause via indstillingerne. Eksisterende browserkontroller af facts er tilpasset den ønskede fjernelse. Visuel kontrol udføres i Chromium ved 320×568, 390×844, 844×390 og 1440×900. Fysisk telefon og Safari er ikke testet i dette miljø.
