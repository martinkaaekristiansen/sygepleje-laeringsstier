# Læringsstier

Dansk, mobilvenlig prototype til sygeplejestuderende. Kører uden elevlogin, serverdatabase, analyseværktøjer og betalte tjenester. Data gemmes lokalt i browseren.

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
4. Åbn **Underviser**, indtast din underviserkode, og klik **Lås op** for at oprette eller redigere en læringssti. Pilene i editoren flytter trin. Brug **Lås underviseradgang**, når du er færdig. Genindlæsning låser også adgangen.
5. Under **Multiple-choice spørgsmål** på hvert trin kan du klikke **Tilføj spørgsmål**. Udfyld spørgsmålet, mindst to svarmuligheder, korrekt svar og forklaring. Spørgsmål kan kombineres med alle indholdstyper: tekst, case, podcast, video, refleksion og quiz. Gem læringsstien til sidst. Eleven skal besvare alle spørgsmål på trinnet for at gennemføre det, men behøver ikke svare korrekt første gang.
6. Tilføj billedlinks eller upload PNG/JPEG/WebP på højst 1 MB. Video- og podcastfelter accepterer links, herunder YouTube. Direkte MP4/WebM- og lydlinks får en afspiller; andre links åbnes eksternt.
7. Underviseroversigten bruges til at oprette, redigere og slette læringsstier. Kladder gemmes automatisk og kan genåbnes til videre redigering.

## Editor, kladder og sikker lagring (version 0.2)

1. Åbn **Underviser**, og indtast koden **7269**.
2. Vælg **Redigér** eller **Ny læringssti**. Udfyld titel, semester, fag og beskrivelse under **Om læringsstien**.
3. Vælg et trin i oversigten. Kun dette trin vises i editoren. Brug skabelonvælgeren til case, fagtekst, podcast, quiz, refleksion eller video.
4. Redigér spørgsmål, tilføj eller fjern svarmuligheder, og vælg det korrekte svar. Pilene flytter trin, spørgsmål og svar. Du kan duplikere trin og spørgsmål. **Fortryd seneste strukturændring** fortryder tilføjelser, fjernelser og flytninger, indtil editoren lukkes.
5. Klik **Forhåndsvis trin** for at prøve indhold og quiz uden at ændre elevprogressionen.
6. Kladder gemmes automatisk. Vent på **Kladde gemt på denne enhed**, før du lukker browseren. Du kan fortsætte en kladde efter genindlæsning ved at låse underviserfunktionen op igen.
7. Klik **Gem læringssti** for at opdatere elevvisningen på denne enhed. Manglende felter vises i en fejloversigt med trinnummer. Lukning af en kladde sletter den ikke; den kan slettes særskilt i underviseroversigten.

## Lokal lagring og afgrænsning

Læringsstier, kladder, gennemførte trin, quizsvar og refleksioner gemmes i **IndexedDB** i den aktuelle browser på den aktuelle webadresse. Der sendes ingen data til en backend. Undlad patientoplysninger og andre personoplysninger. Sletning af browserens webstedsdata fjerner lokal lagring.

Undervisersiden er begrænset til oprettelse, redigering og sletning af læringsstier og kladder. Der er ingen knapper til import, eksport, kladdedownload, sikkerhedskopier eller indholdsopdateringer. Automatisk lagring og den interne kopi fra før seneste indholdsændring bevares. Kladdens **Fortryd** gemmes ikke på tværs af genindlæsninger. Billedupload er stadig højst 1 MB pr. billede.

Ved opgradering flyttes eksisterende lokale data automatisk. De gamle localStorage-nøgler efterlades urørte som ekstra sikkerhed. Ukendte eller beskadigede data giver en gendannelsesside med download af originalen frem for en tom app eller automatisk overskrivning. Kan browseren ikke gemme, vises en fejl med mulighed for at prøve igen; editoren holdes åben. Browseren advarer ved lukning, når der er ugemte ændringer. Flere faner kontrollerer versionsnummer ved skrivning: Ved konflikt skal eventuel ugemt tekst kopieres til et dokument, før siden genindlæses.

Trin, spørgsmål og svarmuligheder har stabile ID'er. Titelændringer og omrokering bevarer progression. Ændres fagligt indhold, fjernes kun gennemførelse og quizsvar på de berørte trin. Refleksioner bevares, også i sikkerhedskopien for fjernede trin. Gamle quizsvar arkiveres i sikkerhedskopien. Progression er fortsat gennemførte trin, ikke en vurdering af klinisk kompetence.

Indbyggede stier og lokale tilpasninger bevares. Ændringer af det fælles undervisningsindhold håndteres i projektets kildefiler og udgives via GitHub Pages.

Underviserfunktionen har fortsat en lokal kodelås. Koden kontrolleres i browseren og kan læses i kildekoden; den er ikke sikker autentifikation. Genindlæsning låser adgangen. Rigtig adgangskontrol og fælles redigering på tværs af enheder kræver en separat løsning. Ændringer i editoren offentliggøres ikke automatisk på GitHub Pages.

Demopodcasten er browseroplæsning af den medfølgende tekst, ikke en indspillet lydfil. Dansk stemme og oplæsning afhænger af browserens installerede stemmer. Teksten er altid tilgængelig. Videoer og podcastlinks indlæses efter brugerens klik og kan involvere eksterne udbydere; billedlinks hentes, når trinnet åbnes. Brug lokale uploadede billeder for at undgå eksterne billedkald.

Demoen er undervisningsmateriale med en fiktiv case. Fagindholdet bør gennemgås af en underviser før brug i undervisning. Illustrationerne er dekorative, ikke anatomiske plancher.

## Udvikling og test

- `public/app.js`: navigation, tilstand og brugerhandlinger.
- `public/home.js` / `public/learner.js`: forside og elevvisning.
- `public/editor.js`: trinvis underviser-editor og formularopsamling.
- `public/model.js`: stabile ID'er, validering, migration og indholdsversioner.
- `public/storage.js`: atomiske IndexedDB-transaktioner, ændrede datasektioner, konflikttjek og automatisk indholdskopi.
- `public/progress.js`: beregning og filtrering af progression.
- `public/data.js`, `public/pharmacology.js`, `public/semester5.js`: eksisterende fagligt indhold.
- `public/theme.css` / `public/style.css`: UCN-farver og responsivt design.
- `npm test`: indhold, migration, versioner, progression og Pages-links.
- `npm run build`: syntakskontrol af alle moduler og statisk output. Filadresser indeholder et indholdshash, så en ny udgave ikke blandes med gamle browsercachede moduler.
- `npm run test:browser`: samlet Playwright-test mod en lokal server. Se nedenfor.

Appen anvender hash-links til læringsstier og trin, så bogmærker, browserens Tilbage/Frem og genindlæsning fungerer på GitHub Pages uden særlig 404-omdirigering. En undervisers lokale sti kan kun åbnes på en anden enhed, hvis indholdet er udgivet dér. Mobilens trinoversigt kan foldes ud; tastaturfokus flyttes til nyt indhold eller quizfeedback. Der er genvej til hovedindhold og synlige fokusmarkeringer.

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
- **Underviserændringer ses kun hos dig:** Det er forventet i prototypen. De gemmes lokalt og ændrer ikke GitHub-filerne. Fælles ændringer skal indarbejdes i projektfilerne og udgives på ny. Lokale fremskridt fra udviklingsadressen flytter heller ikke automatisk til Pages-adressen.
- **Video/podcast virker ikke:** Eksterne udbydere kan begrænse afspilning eller fjerne indhold. Demoens tekst og quiz kræver ingen eksterne medier.

Appens visninger åbnes i samme HTML-side. Relative filadresser gør, at navigation, genindlæsning, CSS og JavaScript virker både på en lokal adresse og i repositoryets undermappe; der kræves ingen særlig 404-omdirigering.

### Browsertest

`tests-browser/acceptance.cjs` samler test af kladder, kodelås, migration, lagringsfejl, oprettelse/redigering/sletning, elevprogression, alle 56 spørgsmål på 3. og 5. semester, browserhistorik, dybe links, fokus og mobilvisning. Kør mod en lokal server med Playwright og Chromium installeret:

```sh
PLAYWRIGHT_MODULE=/sti/til/playwright CHROMIUM_PATH=/sti/til/chromium APP_URL=http://localhost:3000 npm run test:browser
```

Testen bruger isolerede browserprofiler. De tidligere browserindgangsfiler starter nu samme samlede regressionstest. GitHub Actions kører også testen mod en undermappe som på Pages. Browserens testværktøjer bruges kun under udvikling og sendes ikke med appen.

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

## 3. semester: Medicinhåndtering og farmakologi

Vælg **3. semester → Farmakologi → Medicinhåndtering og farmakologi**. Forløbet indeholder fire quiztrin med fem spørgsmål i hvert, udvalgt tilfældigt fra brugerens dokument *Medicinhåndteringsprøver.docx*. Hver opgave angiver prøve og oprindeligt opgavenummer. Udvalget er fast, så progressionen kan genoptages.

Dokumentet indeholder ikke et facit. Øvelsesfacit og forklaringer er udarbejdet til læringsstien; de er ikke et officielt prøvefacit og bør gennemgås af en underviser før brug som bedømmelsesgrundlag. Se [kildeoversigt og udvælgelse](docs/medicinhaandtering.md).

Nye indbyggede læringsstier tilføjes én gang til eksisterende browserdata. Egne stier, ændringer og progression bevares. Hvis underviseren efterfølgende sletter en indbygget sti, tilføjes den ikke automatisk igen. `public/pharmacology.js` indeholder forløbet, og `public/model.js` håndterer migration og indholdsversioner. `public/catalog.js` bevares med tests som dokumentation for det gamle katalogformat.

Browsertesten `tests-browser/pharmacology.cjs` kontrollerer eksisterende browserdata, filtrering, alle 20 spørgsmål, progression, redigering og sletning. Den køres med samme miljøvariabler som undervisertesten.

## 5. semester: Akut og kritisk sygepleje

Vælg **5. semester → Sygepleje → Akut og kritisk sygepleje – fra vurdering til handling**. Det tværfaglige forløb bygger på det uploadede udkast til semesterbeskrivelse for E26, SPL-CSV-S24.

De 12 trin følger fire kliniske temaer: akut abdomen/peritonitis, akut koronart syndrom, livstruende infektion og det akut syge barn/familien. 36 casebaserede spørgsmål kobles med 12 refleksionsopgaver og udfoldelige refleksionsguider. Forløbet omfatter også omsorg, etik, sundhedsulighed, kultur, pædagogik, forskningsmetoder, IMRaD, klinisk lederskab og kvalitetsudvikling. Vejledende tid er 120 minutter plus eventuel litteraturlæsning og drøftelse.

Refleksionsguiderne kan redigeres i underviserfunktionen. Refleksionerne gemmes lokalt og bedømmes ikke automatisk. Cases og spørgsmål er udarbejdet til øvelsen og er ikke officielle eksamensopgaver eller en klinisk instruks. Læringsstien er et øvelsesforløb med fokus på centrale læringsmål, ikke en fuldstændig erstatning for pensum, simulation eller klinisk uddannelse.

Se [koblingen mellem trin, fag og semesterbeskrivelse](docs/semester5-e26.md). Indholdet ligger i `public/semester5.js`. `tests-browser/semester5.cjs` afprøver alle 36 svar og 12 refleksionsguider samt bevarelse af eksisterende data, redigering og mobilvisning med samme miljøvariabler som de øvrige browsertests.

## Overblik over igangværende læringsstier

Øverst på startsiden vises **Fortsæt, hvor du slap**. Overblikket samler påbegyndte, ufærdige stier på tværs af semestre og fag, uanset de valgte filtre længere nede på siden. Hvert kort viser titel, semester/fag, antal gennemførte trin, procent og det senest åbnede trin samt en knap til at fortsætte.

En læringssti registreres som påbegyndt, når den åbnes første gang, også før første trin er gennemført (0 %). Progressionen måles i gennemførte trin, ikke quizresultater. Den senest åbnede sti vises først; ældre gemt progression uden tidsstempel vises også. Fuldførte, slettede og tomme stier vises ikke. Hvis der ikke er ufærdige stier, viser panelet en kort forklaring og en genvej til semesteroversigten. Alle oplysninger gemmes lokalt i den aktuelle browser.

`public/progress.js` samler beregning og filtrering. `tests-browser/progress.cjs` tester første åbning, 0 %, genoptagelse, eksisterende data, fuldførelse, bevarelse af progression ved omrokering og mobilvisning med de samme miljøvariabler som øvrige browsertests.
