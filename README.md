# Læringsstier

Dansk, mobilvenlig prototype til sygeplejestuderende. Kører uden elevlogin og analyseværktøjer. Progression og kladder gemmes lokalt i browseren. Godkendt undervisningsindhold kan udgives direkte fra editoren via en kodebeskyttet Cloudflare Worker og GitHub Pages. Løsningen er lavet til gratisabonnementerne.

**Aktivér publicering:** Følg [opsætningsvejledningen uden programmering](docs/publicering.md). Serveren og dens hemmelige nøgler skal aktiveres af ejeren én gang, før appen kan publicere.

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
5. Under **Multiple-choice spørgsmål** på hvert trin kan du klikke **Tilføj spørgsmål**. Udfyld spørgsmålet, mindst to svarmuligheder, korrekt svar og forklaring. Spørgsmål kan kombineres med alle indholdstyper: tekst, case, podcast, video, refleksion og quiz. Gem som kladde, forhåndsvis og udgiv til sidst. Eleven skal besvare alle spørgsmål på trinnet for at gennemføre det, men behøver ikke svare korrekt første gang.
6. Tilføj billedlinks eller upload PNG/JPEG/WebP på højst 1 MB. Video- og podcastfelter accepterer links, herunder YouTube. Direkte MP4/WebM- og lydlinks får en afspiller; andre links åbnes eksternt.
7. Underviseroversigten bruges til at oprette, redigere og slette læringsstier. Kladder gemmes automatisk og kan genåbnes til videre redigering.

## Editor, kladder og publicering (version 0.3)

1. Åbn **Underviser**, og indtast koden **7269**.
2. Vælg **Redigér** eller **Ny læringssti**. Udfyld titel, semester, fag og beskrivelse under **Om læringsstien**.
3. Vælg et trin i oversigten. Kun dette trin vises i editoren. Brug skabelonvælgeren til case, fagtekst, podcast, quiz, refleksion eller video.
4. Redigér spørgsmål, tilføj eller fjern svarmuligheder, og vælg det korrekte svar. Pilene flytter trin, spørgsmål og svar. Du kan duplikere trin og spørgsmål. **Fortryd seneste strukturændring** fortryder tilføjelser, fjernelser og flytninger, indtil editoren lukkes.
5. Klik **Forhåndsvis trin** eller **Forhåndsvis hele læringsstien** for at prøve indhold og quiz uden at ændre elevprogressionen.
6. Kladder gemmes automatisk. Vent på **Kladde gemt på denne enhed**, før du lukker browseren. Du kan fortsætte en kladde efter genindlæsning ved at låse underviserfunktionen op igen.
7. Klik **Gem kladde** for at gemme uden at offentliggøre. Kladden kan slettes særskilt i underviseroversigten.
8. Klik **Udgiv læringssti**, indtast den ekstra udgivelseskode og godkend aktivt. Manglende felter vises i en fejloversigt. Den korte underviserkode kan ikke publicere.
9. Appen viser **Afventer udgivelse**, indtil **Opdatér offentlig oversigt** finder den samme udgave på den offentlige hjemmeside. GitHub Actions bygger og udgiver automatisk; der skal ikke merges i GitHub ved almindelige indholdsændringer.
10. **Træk tilbage** fjerner en offentlig sti efter samme godkendelsesforløb. Tidligere indhold og lokal progression bevares.

## Flere fagområder på samme læringssti

Under **Om læringsstien → Fagområder** kan underviseren sætte kryds ved ét eller flere fag. Skriv et manglende fag i **Mangler et fag?**, og klik **Tilføj fag** (eller tryk Enter). Det nye fag vælges automatisk. Udgiv læringsstien for at vise den til alle studerende.

Stien vises under hvert valgt fag og kun én gang under **Alle fagområder**. Nye fag vises som filtre på det semester, hvor der er en offentlig læringssti med faget. En kladde tilføjer ikke fag til elevoversigten. Flyttes stien til et andet semester, følger fagene med. Fjernes fagtilknytningen eller den sidste sti med et nyt fag på et semester, fjernes det pågældende filter dér. Også de oprindelige fagfiltre skjules, hvis der ikke er en offentlig læringssti i faget på semesteret. »Alle fagområder« er altid tilgængelig. Underviserens fagvælger beholder alle standardfag.

Egne fag kan genbruges i editoren på tværs af semestre. Ekstra mellemrum og forskelle i store/små bogstaver opretter ikke dubletter. Navne må være op til 80 tegn. Der skal være mindst ét fag på en gemt sti; kladder må midlertidigt have ingen valgte fag. Eksisterende stier med ét fag virker fortsat. Ændringer af fag og semester bevarer progressionen.

## Quiz: ret svar og undersøg forklaringer

Studerende kan ændre et forkert svar ved at vælge en anden mulighed. Når svaret er korrekt, fastholdes det — også efter genindlæsning og navigation. Klik på de forkerte muligheder viser forklaringer uden at ændre det korrekte svar eller resultatet. Det undersøgte svar markeres særskilt fra det korrekte.

**Genstart trinnet** nulstiller efter bekræftelse kun quizsvar og gennemførelse på det aktuelle trin. Andre trin og refleksioner bevares. Det er herefter muligt at svare helt forfra. Samme quizadfærd kan afprøves i editorens forhåndsvisning uden at ændre elevprogressionen.

Underviseren kan skrive en **Forklaring til svar A/B/C…** under hver svarmulighed. Forklaringen følger svarmuligheden ved omrokering og duplikering. Hvis feltet er tomt, vises den eksisterende fælles faglige forklaring, tydeligt mærket som fælles ved undersøgelse af forkerte svar. Tilføjelse af disse forklaringer bevarer tidligere svar og progression. Ændringer af selve opgaven eller facit følger fortsat reglerne for ændret fagligt indhold.

## Lokal lagring og afgrænsning

Læringsstier, kladder, gennemførte trin, quizsvar og refleksioner gemmes i **IndexedDB** i den aktuelle browser på den aktuelle webadresse. Kun den aktivt godkendte læringsstis undervisningsindhold sendes til publiceringsserveren og GitHub. Progression, quizsvar og refleksioner sendes ikke med. Undlad patientoplysninger og andre personoplysninger. Sletning af browserens webstedsdata fjerner lokal lagring.

Undervisersiden er begrænset til oprettelse, redigering og sletning af læringsstier og kladder. Der er ingen knapper til import, eksport, kladdedownload eller sikkerhedskopier. Offentlige udgaver kan opdateres fra oversigten. Automatisk lagring og den interne kopi fra før seneste indholdsændring bevares. Kladdens **Fortryd** gemmes ikke på tværs af genindlæsninger. Billedupload er stadig højst 1 MB pr. billede.

Ved opgradering flyttes eksisterende lokale data automatisk. De gamle localStorage-nøgler efterlades urørte som ekstra sikkerhed. Ukendte eller beskadigede data giver en gendannelsesside med download af originalen frem for en tom app eller automatisk overskrivning. Kan browseren ikke gemme, vises en fejl med mulighed for at prøve igen; editoren holdes åben. Browseren advarer ved lukning, når der er ugemte ændringer. Flere faner kontrollerer versionsnummer ved skrivning: Ved konflikt skal eventuel ugemt tekst kopieres til et dokument, før siden genindlæses.

Trin, spørgsmål og svarmuligheder har stabile ID'er. Titelændringer og omrokering bevarer progression. Ændres fagligt indhold, fjernes kun gennemførelse og quizsvar på de berørte trin. Refleksioner bevares, også i sikkerhedskopien for fjernede trin. Gamle quizsvar arkiveres lokalt og vises under **Tidligere udgaver og besvarelser** på læringsstien. Progression er fortsat gennemførte trin, ikke en vurdering af klinisk kompetence.

Eksisterende indhold og ID’er er bevaret i `content/paths/`. Tidligere lokale tilpasninger flyttes til kladder ved første katalogopdatering, så de kan gennemgås og udgives. Nye offentlige udgaver indlæses ved genindlæsning eller opdatering af oversigten. Ved netværksfejl bevares det lokale indhold. Ændringer af fælles undervisningsindhold udgives fra editoren via GitHub Pages.

Underviserfunktionen har fortsat en lokal kodelås. Koden kontrolleres i browseren og kan læses i kildekoden; den er ikke sikker autentifikation. Genindlæsning låser adgangen. Publicering bruger en separat kode, der kontrolleres af Cloudflare-serveren. Koden og GitHub-nøglen opbevares kun som serverhemmeligheder. Kladder deles ikke mellem enheder. Hvis en anden underviser har udgivet en nyere version, kræves en sammenligning og aktiv godkendelse før overskrivning.

Demopodcasten er browseroplæsning af den medfølgende tekst, ikke en indspillet lydfil. Dansk stemme og oplæsning afhænger af browserens installerede stemmer. Teksten er altid tilgængelig. Videoer og podcastlinks indlæses efter brugerens klik og kan involvere eksterne udbydere; billedlinks hentes, når trinnet åbnes. Brug lokale uploadede billeder for at undgå eksterne billedkald.

Demoen er undervisningsmateriale med en fiktiv case. Fagindholdet bør gennemgås af en underviser før brug i undervisning. Illustrationerne er dekorative, ikke anatomiske plancher.

## Udvikling og test

- `public/app.js`: navigation, tilstand og brugerhandlinger.
- `public/home.js` / `public/learner.js`: forside og elevvisning.
- `public/editor.js`: trinvis underviser-editor og formularopsamling.
- `public/model.js`: stabile ID'er, validering, migration og indholdsversioner.
- `public/storage.js`: atomiske IndexedDB-transaktioner, ændrede datasektioner, konflikttjek og automatisk indholdskopi.
- `public/progress.js`: beregning og filtrering af progression.
- `content/paths/*.json`: offentlige indholdsudgaver, skrevet af publiceringsserveren.
- `public/publication.js`: indholdsvalidering, versionsaftryk, katalogsynkronisering og bevaring af gamle besvarelser.
- `public/publisher-client.js` / `public/publisher-ui.js`: godkendelse og udgivelsesstatus.
- `publisher/`: Cloudflare Worker, kodekontrol, begrænsning af forsøg og GitHub-skrivning.
- `public/data.js`, `public/pharmacology.js`, `public/semester5.js`: oprindeligt indhold til migration og isolerede regressionstests.
- `public/theme.css` / `public/style.css`: UCN-farver og responsivt design.
- `npm test`: indhold, migration, versioner, progression og Pages-links.
- `npm run build`: syntakskontrol af alle moduler og statisk output. Filadresser indeholder et indholdshash, så en ny udgave ikke blandes med gamle browsercachede moduler.
- `npm run test:browser`: samlet Playwright-test mod en lokal server. Se nedenfor.
- `npm run publisher:check`: pak Cloudflare-serveren uden at udgive.
- `npm run publisher:deploy`: udgiv serveren med allerede konfigureret Cloudflare-adgang; ejeren kan i stedet bruge dashboardets GitHub-integration som beskrevet i vejledningen.

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

Fremover tester, bygger og udgiver workflowen automatisk ved ændringer på `main`. En pull request skal først flettes ind i `main`, før denne udgivelse starter. Selve Pages-workflowen bruger GitHubs indbyggede token. Publiceringsserveren skal derimod have en begrænset personlig GitHub-nøgle for at gemme indhold og udløse en ny workflow; se [opsætningen](docs/publicering.md).

### Hvis noget ikke virker

- **404 / siden findes ikke:** Kontrollér Pages-kilden og at den seneste **deploy** er grøn. Vent et par minutter efter udgivelsen, og genindlæs siden.
- **Rød workflow:** Klik den røde kørsel under **Actions**, åbn jobbet med fejlen og se det røde trin. Fejl ved **Klargør GitHub Pages** skyldes ofte, at Pages endnu ikke er aktiveret.
- **Mangler Settings eller Pages:** Log ind som repositoryets ejer/administrator. På en gratis konto skal repositoryet være offentligt for at bruge Pages gratis.
- **Underviserændringer ses kun hos dig:** En kladde er lokal. Brug **Udgiv læringssti** og bekræft, at udgivelsen er færdig. Serveren skal først være aktiveret som beskrevet i vejledningen. Lokale fremskridt fra udviklingsadressen flytter heller ikke automatisk til Pages-adressen.
- **Video/podcast virker ikke:** Eksterne udbydere kan begrænse afspilning eller fjerne indhold. Demoens tekst og quiz kræver ingen eksterne medier.

Appens visninger åbnes i samme HTML-side. Relative filadresser gør, at navigation, genindlæsning, CSS og JavaScript virker både på en lokal adresse og i repositoryets undermappe; der kræves ingen særlig 404-omdirigering.

### Browsertest

`tests-browser/quiz.cjs` tester ændring af svar, fastholdelse af korrekte svar, forklaringer og genstart. `tests-browser/subjects.cjs` tester flere fag, egne fag, semesterfiltre, kladder og mobilvisning. `tests-browser/acceptance.cjs` samler test af kladder, kodelås, migration, lagringsfejl, oprettelse/redigering/sletning, elevprogression, alle 56 spørgsmål på 3. og 5. semester, browserhistorik, dybe links, fokus og mobilvisning. Kør mod en lokal server med Playwright og Chromium installeret:

```sh
PLAYWRIGHT_MODULE=/sti/til/playwright CHROMIUM_PATH=/sti/til/chromium APP_URL=http://localhost:3000 npm run test:browser
```

Testen bruger isolerede browserprofiler og et simuleret publicerings-API med en fiktiv testkode. `tests-browser/publishing.cjs` tester også godkendelse, serverfejl, private kladder, forsinket udgivelse, en ny studerendes browser og konflikter. Regressionstests bruger et fast testkatalog, så underviserens lovlige ændringer af offentligt indhold ikke fejler gamle indholdsforventninger. Det aktuelle offentlige katalog valideres separat under test og build. Ingen browsertest skriver til GitHub. De tidligere browserindgangsfiler starter nu samme samlede regressionstest. GitHub Actions kører også testen mod en undermappe som på Pages. Browserens testværktøjer bruges kun under udvikling og sendes ikke med appen.

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

Det fælles katalog i `content/paths/` er nu kilden til offentligt indhold. `public/pharmacology.js` bevarer originalforløbet til migration og tests. Tidligere lokale tilpasninger bevares som kladder, og offentlig tilbagetrækning respekteres på tværs af enheder. `public/catalog.js` bevares med tests som dokumentation for det gamle katalogformat.

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
