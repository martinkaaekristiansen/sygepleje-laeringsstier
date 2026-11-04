# Læringsstier

Dansk, mobilvenlig prototype til sygeplejestuderende. Kører uden login, database, analyseværktøjer og eksterne afhængigheder.

## Start

Kræver Node.js 22 eller nyere. Fra projektmappen:

```sh
npm run dev
```

Serveren lytter på port 3000. Brug miljøets portvisning eller åbn `http://localhost:3000` på din egen computer. Porten kan ændres med `PORT=3001 npm run dev`. Der kræves ingen `npm install`. Til GitHub Pages bruges `npm run build`, som opretter den statiske webmappe `dist/`.

## Afprøv

1. Vælg 1. semester og start **Fordøjelsessystemet**.
2. Gennemfør patientcasen, fagteksten, podcasttrinnet, quizzen og refleksionen.
3. Gå tilbage til forsiden eller genindlæs og vælg **Fortsæt læringssti**.
4. Åbn **Underviser**, indtast din underviserkode, og klik **Lås op** for at oprette eller redigere en læringssti. Pilene flytter trin og hele læringsstier. Brug **Lås underviseradgang**, når du er færdig. Genindlæsning låser også adgangen.
5. Under **Multiple-choice spørgsmål** på hvert trin kan du klikke **Tilføj spørgsmål**. Udfyld spørgsmålet, tre svarmuligheder, korrekt svar og forklaring. Spørgsmål kan kombineres med alle indholdstyper: tekst, case, podcast, video, refleksion og quiz. Gem læringsstien til sidst. Eleven skal besvare alle spørgsmål på trinnet for at gennemføre det, men behøver ikke svare korrekt første gang.
6. Tilføj billedlinks eller upload PNG/JPEG/WebP på højst 1 MB. Video- og podcastfelter accepterer links, herunder YouTube. Direkte MP4/WebM- og lydlinks får en afspiller; andre links åbnes eksternt.
7. Eksportér læringsstier som JSON og importér filen i en anden browser. Import tilføjer kopier; den overskriver ikke eksisterende stier.

## Lokal lagring og afgrænsning

Læringsstier, gennemførte trin og refleksioner gemmes med localStorage på den aktuelle browser og webadresse. Ingen data sendes til en backend. Undlad patientoplysninger og andre personoplysninger. Eksporten indeholder undervisningsindhold, ikke elevprogression eller refleksioner. Sletning af browserens webstedsdata fjerner lokal lagring. Eksportér indhold som backup; mange billeder kan overskride browserens lagerplads.

Underviserfunktionen har en lokal kodelås. Koden kontrolleres i browseren og er derfor synlig i den offentlige kildekode og kan omgås af en teknisk bruger. Den er en enkel spærring mod almindelig adgang, ikke sikker autentifikation. Adgang gemmes ikke mellem genindlæsninger. Egentlig sikker adgang kræver en backend eller en ekstern login-tjeneste. Redigering af en sti nulstiller dens elevprogression. Andre semestre og fagområder viser en tom tilstand, indtil du opretter indhold.

Demopodcasten er browseroplæsning af den medfølgende tekst, ikke en indspillet lydfil. Dansk stemme og oplæsning afhænger af browserens installerede stemmer. Teksten er altid tilgængelig. Videoer og podcastlinks indlæses efter brugerens klik og kan involvere eksterne udbydere; billedlinks hentes, når trinnet åbnes. Brug lokale uploadede billeder for at undgå eksterne billedkald.

Demoen er undervisningsmateriale med en fiktiv case. Fagindholdet bør gennemgås af en underviser før brug i undervisning. Illustrationerne er dekorative, ikke anatomiske plancher.

## Udvikling og test

- `public/app.js`: elevvisning, underviserredigering og lokal lagring.
- `public/data.js`: demo, quiz og hjælpefunktioner.
- `public/theme.css`: UCN-farvepalette og fælles farver for hele appen.
- `public/style.css`: responsivt design.
- `server.js`: lille statisk Node-server.
- `npm test`: tests af links, progression og demodata.

Prototypen er desuden afprøvet i Chromium med gennemførsel af demo, quiz, refleksion, genoptagelse, oprettelse/omorganisering af trin og mobilbredde på 390 px. Ingen browserfejl blev registreret.

## Udgiv gratis med GitHub Pages

GitHub Pages serverer filerne fra `dist/`. Node-serveren bruges kun lokalt. Appen kræver ingen server, database eller hemmelige nøgler på GitHub Pages. Med GitHub Free skal repositoryet være offentligt (Public). Gør kun repositoryet offentligt, hvis indholdet må være offentligt.

1. Sørg for, at projektfilerne og `.github/workflows/pages.yml` er lagt på `main` i GitHub. Hvis de ligger på en separat branche, opret en pull request til `main` og vælg **Merge pull request** → **Confirm merge**.
2. Åbn repositoryet `martinkaaekristiansen/sygepleje-laeringsstier` på GitHub.
3. Klik **Settings** → **Pages** i venstre side. Du skal have administratoradgang til repositoryet.
4. Under **Build and deployment** skal **Source** sættes til **GitHub Actions**. Vælg ikke **Deploy from a branch**. Den medfølgende workflow skal bruges; du behøver ikke oprette en ekstra workflow fra en skabelon.
5. Klik **Actions**. Hvis GitHub beder dig aktivere workflows, skal du gøre det.
6. Vælg **Udgiv Læringsstier på GitHub Pages**, derefter **Run workflow**, vælg **main**, og klik den grønne **Run workflow**-knap. Hvis workflowen ikke vises, kontrollér, at filen er på `main`.
7. Åbn den nye kørsel, og vent på, at både **build** og **deploy** har grønt flueben. Hvis den første kørsel fejlede, fordi Pages ikke var aktiveret endnu, start en ny kørsel efter trin 4.
8. Åbn webadressen nedenfor og kontrollér, at forsiden og demoen virker. Først da er udgivelsen bekræftet. En gemt workflow eller et vellykket lokalt build er ikke en bekræftet udgivelse.

Forventet adresse, når udgivelsen lykkes (uden eget domæne):

**https://martinkaaekristiansen.github.io/sygepleje-laeringsstier/**

Fremover tester, bygger og udgiver workflowen automatisk ved ændringer på `main`. En pull request skal først flettes ind i `main`, før denne udgivelse starter. Workflowen bruger GitHubs indbyggede token og behøver ingen personlige adgangstokens eller secrets.

### Hvis noget ikke virker

- **404 / siden findes ikke:** Kontrollér Pages-kilden og at den seneste **deploy** er grøn. Vent et par minutter efter udgivelsen, og genindlæs siden.
- **Rød workflow:** Klik den røde kørsel under **Actions**, åbn jobbet med fejlen og se det røde trin. Fejl ved **Klargør GitHub Pages** skyldes ofte, at Pages endnu ikke er aktiveret.
- **Mangler Settings eller Pages:** Log ind som repositoryets ejer/administrator. På en gratis konto skal repositoryet være offentligt for at bruge Pages gratis.
- **Underviserændringer ses kun hos dig:** Det er forventet i prototypen. De gemmes lokalt og ændrer ikke GitHub-filerne. Brug eksport/import for at dele dem. Lokale fremskridt fra udviklingsadressen flytter heller ikke automatisk til Pages-adressen.
- **Video/podcast virker ikke:** Eksterne udbydere kan begrænse afspilning eller fjerne indhold. Demoens tekst og quiz kræver ingen eksterne medier.

Appens visninger åbnes i samme HTML-side. Relative filadresser gør, at navigation, genindlæsning, CSS og JavaScript virker både på en lokal adresse og i repositoryets undermappe; der kræves ingen særlig 404-omdirigering.

### Browsertest af underviserfunktion

`tests-browser/teacher.cjs` afprøver forkert/rigtig kode, genlåsning, den eksisterende demo, spørgsmål på alle trintyper, feedback, progression, refleksion, import/eksport og mobilvisning. Kør mod en lokal server med Playwright og Chromium installeret:

```sh
PLAYWRIGHT_MODULE=/sti/til/playwright CHROMIUM_PATH=/sti/til/chromium APP_URL=http://localhost:3000 node tests-browser/teacher.cjs
```

Testen bruger en isoleret browserprofil og ændrer ikke dine egne gemte læringsstier.

## UCN-farvetema

Farverne følger HEX-koderne i den UCN-farveoversigt, som blev leveret til projektet:

| Rolle | Farve |
| --- | --- |
| Brand blå mørk | `#004250` |
| Brand blå | `#00646E` |
| Turkis | `#0096A0` |
| Turkis lys | `#A5DCCD` |
| Brand blå lys | `#BED6DB` |
| Grå | `#E7EBED` |
| Sidebaggrund | `#F1F6F9` |
| Sekundær accent, gul lys | `#FFE673` |
| Primære knapper | Sort `#000000` med hvid tekst |
| Sekundære knapper | Hvid, med brand blå lys ved hover |

Temaet gælder også SVG-illustrationer, quizfeedback, formularer og underviserens kodelås. Gul er valgt som eneste sekundære accent i visningerne, i overensstemmelse med oversigtens vejledning om ikke at kombinere sekundærfarver på samme side. De øvrige sekundærfarver er defineret i paletten til senere brug, men anvendes ikke i visningerne. Status vises også med tekst, så farver ikke er den eneste information.

Alle farver vedligeholdes i `public/theme.css`. Temaet hentes lokalt uden forbindelse til UCN's hjemmeside. Farveoversigten er grundlaget for farvevalget; appen bruger fortsat sit eget navn og logo.
