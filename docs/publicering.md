# Udgiv læringsstier direkte fra appen

Når opsætningen er gennemført, kan underviseren gemme kladder, forhåndsvise og udgive i appen med den ekstra udgivelseskode. Underviseren behøver ikke en GitHub- eller Cloudflare-konto. Studerende behøver ingen konto.

**Status:** Koden er forberedt og testet lokalt. Publicering er først aktiveret, når du har gennemført nedenstående opsætning og bekræftet en udgivelse på hjemmesiden. Den aftalte udgivelseskode er ikke lagt i projektfilerne.

## Hvad koster det?

Løsningen er lavet til **Cloudflare Workers Free** og **GitHub Pages for et offentligt repository**. Der skal ikke købes domæne eller AI-tjenester. Vælg gratisabonnementet; der er ikke behov for at opgradere til Workers Paid.

Gratisabonnementerne har forbrugsgrænser. Cloudflare Free afviser yderligere operationer, når en grænse nås, indtil kvoten nulstilles; gratis drift er ikke ubegrænset kapacitet. Studerendes læsning går direkte til GitHub Pages og bruger ikke publiceringsserveren. Cloudflare bruges kun, når en underviser udgiver eller trækker indhold tilbage.

## 1. Læg denne opdatering på main i GitHub

Dette er en engangsopdatering af appens funktioner, ikke en godkendelse af fremtidige læringsstier.

1. Åbn [sammenligningen til main](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/compare/main...direkte-publicering).
2. Hvis ændringerne ikke allerede er flettet ind: vælg **Create pull request**, opret den, og vælg **Merge pull request → Confirm merge**.
3. Kontrollér under **Settings → Pages**, at **Source** er **GitHub Actions**. Repositoryet skal være offentligt på GitHub Free.
4. Vent på den grønne kørsel under **Actions**. Appen kan nu gemme kladder og forhåndsvise; publicering viser endnu, at serveren mangler at blive aktiveret.

## 2. Opret din gratis Cloudflare-konto

1. Åbn [Cloudflare](https://dash.cloudflare.com/sign-up).
2. Opret en konto med din e-mail og en adgangskode, og bekræft e-mailen.
3. Gå til **Workers & Pages**. Hvis du bliver tilbudt at tilføje et domæne, er det ikke nødvendigt for denne løsning.
4. Brug **Workers Free**. Vælg ikke et betalt abonnement.

## 3. Opret publiceringsserveren fra GitHub

1. I **Workers & Pages**: vælg **Create application**, derefter **GitHub / Import a repository**. Vælg en **Worker**, ikke et nyt Pages-websted.
2. Forbind din GitHub-konto. Giv Cloudflare adgang til **kun** `sygepleje-laeringsstier`, hvis du får valget **Only select repositories**.
3. Vælg repositoryet `martinkaaekristiansen/sygepleje-laeringsstier`.
4. Udfyld felterne nedenfor. Teksten kan kopieres direkte; du skal ikke programmere.

| Felt | Værdi |
| --- | --- |
| Worker/project name | `laeringsstier-publisher` |
| Production branch | `main` |
| Root directory | Projektets rod, normalt `/` eller tomt felt |
| Build command | Tomt felt |
| Deploy command | `npx --yes wrangler@4.45.0 deploy --config publisher/wrangler.jsonc` |

5. Slå **preview builds / non-production branches** fra, hvis de tilbydes. Denne server skal kun udgives fra `main`.
6. Klik **Save and Deploy**. Vent på en vellykket udgivelse. Projektet opretter automatisk det lille lager, der begrænser kodeforsøg.
7. Kopiér Workerens **workers.dev**-adresse. Den ligner `https://laeringsstier-publisher.dit-kontonavn.workers.dev`. Du skal bruge din egen adresse i trin 5.
8. Under **Settings → Build → Build watch paths**: behold Include som `*`, og tilføj `content/*` og `docs/*` til Exclude. Så genudgives serverprogrammet ikke, hver gang underviseren ændrer undervisningsindhold. GitHub Pages udgiver stadig ændringerne.

Serveradressen er et API og viser ikke en forside. En afvisning ved almindelig åbning af adressen i browseren er derfor forventet.

## 4. Giv serveren adgang til at publicere

Der skal gemmes to hemmelige værdier **hos Cloudflare**. De må ikke skrives i GitHub-kode, GitHub Variables, screenshots eller chatten.

### Opret en begrænset GitHub-adgangsnøgle

1. Åbn [GitHubs side for nye fine-grained tokens](https://github.com/settings/personal-access-tokens/new), mens du er logget ind som repositoryets ejer.
2. Skriv navnet `Laeringsstier publicering`.
3. Vælg din konto som **Resource owner**.
4. Vælg en udløbsdato, eksempelvis 90 dage. Notér datoen, så du kan forny nøglen inden da.
5. Under **Repository access**: vælg **Only select repositories**, og vælg kun `sygepleje-laeringsstier`.
6. Under **Repository permissions / Add permissions**: giv **Contents → Read and write**. Metadata-læseadgang følger normalt med. Giv ikke adgang til Workflows eller andre repositories.
7. Klik **Generate token**, og kopiér den viste nøgle. Den vises kun én gang.

### Gem de to hemmeligheder i Cloudflare

1. Gå tilbage til **Workers & Pages → laeringsstier-publisher → Settings → Variables and Secrets**.
2. Klik **Add**. Vælg typen **Secret**, og brug navnet `GITHUB_TOKEN`. Indsæt GitHub-nøglen som værdien.
3. Tilføj endnu en **Secret** med navnet `PUBLISH_PASSWORD`. Indsæt **den ekstra udgivelseskode, som vi har aftalt**, som værdien. Brug ikke den korte underviserkode.
4. Gem og vælg **Deploy**, hvis Cloudflare viser den knap. Kontrollér, at den nye version er aktiv.

Brug Workerens **Variables and Secrets**, ikke **Build variables and secrets**. Sidstnævnte er kun til bygning og giver ikke den kørende server adgang til værdierne.

Hvis `main` kræver pull requests via en eksisterende branch-regel, kan nøglen ikke skrive direkte. Ejeren skal i så fald afklare en passende publiceringsrettighed i GitHub. Appen omgår ikke branch-beskyttelse og viser en fejl i stedet.

## 5. Forbind appen med serveren

1. Åbn [repositoryets indstillinger for Actions-variabler](https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/settings/variables/actions).
2. Vælg fanen **Variables**, derefter **New repository variable**.
3. Skriv `PUBLIC_PUBLISHER_URL` som **Name**.
4. Indsæt Workerens `https://…workers.dev`-adresse som **Value**. Brug kun adressen, uden `/publish` eller anden sti. Denne adresse er offentlig og er ikke en hemmelig nøgle.
5. Klik **Add variable**.
6. Åbn **Actions → Udgiv Læringsstier på GitHub Pages → Run workflow**. Vælg `main`, og start kørslen. Oprettelse af en variabel starter ikke automatisk en ny udgivelse.
7. Vent på grønne flueben ved både **build** og **deploy**.

## 6. Bekræft den første rigtige udgivelse

1. Åbn [Læringsstier](https://martinkaaekristiansen.github.io/sygepleje-laeringsstier/) og genindlæs siden.
2. Åbn **Underviser**, og lås editoren op med den sædvanlige underviserkode.
3. Opret en lille læringssti med en tydelig testtitel. Udfyld titel, semester, fag, beskrivelse og mindst ét trin.
4. Klik **Gem kladde**. Den må ikke være synlig for studerende endnu. Genåbn kladden.
5. Klik **Forhåndsvis læringssti** og gennemgå den. Trinoversigten skifter mellem trinnene.
6. Klik **Udgiv læringssti**. Indtast den ekstra udgivelseskode, sæt kryds ved godkendelsen, og vælg **Udgiv til alle**.
7. Appen viser **Afventer udgivelse**. Det betyder, at GitHub har modtaget ændringen, men hjemmesiden endnu ikke er bekræftet opdateret.
8. Vent et par minutter. Klik **Opdatér offentlig oversigt**, indtil den afventende udgivelse er væk. Ved behov kan du åbne **Se udgivelsesforløb** og kontrollere de grønne flueben i GitHub.
9. Åbn hjemmesiden i et privat browservindue. Find teststien på det valgte semester uden at logge ind. **Først nu er udgivelsen bekræftet.**
10. Fjern testen med **Træk tilbage** på undervisersiden. Bekræft med udgivelseskoden, vent på udgivelsen, og opdatér oversigten igen.

Fremover kan underviseren gøre trin 2–9 i appen uden at godkende eller merge i GitHub. GitHub Actions bygger automatisk den offentlige hjemmeside efter hver godkendt indholdsændring.

## Kladder, eksisterende indhold og progression

- **Gem kladde** og automatisk lagring gemmer kun på den aktuelle enhed. Der er endnu ikke deling af upublicerede kladder mellem undervisere eller enheder.
- Eksisterende offentlige læringsstier er flyttet til `content/paths/` med deres oprindelige trin-, spørgsmåls- og svar-ID'er. Det faglige indhold er bevaret.
- Tidligere lokale ændringer bevares som kladder ved opgraderingen, så de kan gennemgås og udgives. Den offentlige udgave er fælles for de studerende.
- Progression, quizsvar og refleksioner sendes ikke til publiceringsserveren eller GitHub. De bliver i den studerendes browser.
- Titelændringer og omrokering bevarer progression. Ved ændret fagligt indhold skal kun de berørte trin gennemføres igen. Tidligere besvarelser og refleksioner gemmes lokalt i historikken; de kan læses under **Tidligere udgaver og besvarelser** på læringsstien.
- **Træk tilbage** fjerner stien fra den offentlige oversigt efter udgivelse. Lokale fremskridt og den tidligere indholdsudgave slettes ikke. Underviseren kan genudgive den fra listen over tilbagetrukne stier.
- Hvis en anden underviser har udgivet en nyere version, skal du sammenligne versionerne og aktivt bekræfte kladdens nye udgangspunkt før udgivelse. Der foretages ikke automatisk sammenfletning.
- Hvis browserens webstedsdata slettes, mistes lokale kladder og progression. Offentliggjort indhold ligger fortsat i GitHub.

## Hvis noget går galt

| Besked eller problem | Hvad du gør |
| --- | --- |
| Publicering er ikke aktiveret | Kontrollér `PUBLIC_PUBLISHER_URL`, genkør Pages-workflowen fra `main`, og genindlæs appen. |
| Forkert udgivelseskode | Brug den ekstra kode. Den korte underviserkode kan ikke publicere. |
| For mange forsøg | Vent 15 minutter. Begrænsningen kan også ramme andre på samme netværk. |
| Serveren mangler hemmelige nøgler | Kontrollér, at begge værdier er runtime **Secrets**, og at serveren er genudgivet. |
| GitHub-adgangen virker ikke | Kontrollér tokenets udløb, valgt repository og **Contents: Read and write**. Udskift `GITHUB_TOKEN` hos Cloudflare ved behov. |
| Nyere udgave / konflikt | Opdatér oversigten, genåbn kladden og brug **Sammenlign med offentlig udgave**. Overfør eventuelle ændringer, du vil beholde, inden du godkender udgangspunktet. |
| Afventer bliver stående | Åbn **Se udgivelsesforløb**. En rød Actions-kørsel betyder, at hjemmesiden ikke er opdateret. Ret fejlen og genkør fra `main`; kladden og den hidtidige hjemmeside er bevaret. |
| Netværksfejl efter klik på Udgiv | Kontrollér offentlig oversigt og Actions før nyt forsøg. Samme indhold udgives ikke dobbelt, hvis serveren allerede har gemt det. |
| Læringsstien er for stor | Hver udgivelse må højst fylde 4 MB. Brug mindre/færre billeder eller billedlinks. |
| Cloudflare-kvote er opbrugt | Vent på nulstilling af gratis-kvoten. Den allerede udgivne hjemmeside kan stadig læses. |

Hvis en efterfølgende udgivelse har overhalet din afventende version, kan den gamle afventende markering blive stående. Sammenlign kladden med den aktuelle offentlige udgave før et nyt forsøg; slet ikke browserdata for at løse det.

## Vedligeholdelse og sikkerhed

Udgivelseskoden kontrolleres på serveren og gemmes ikke i browserens lagring eller i GitHub. Alle med koden har samme publiceringsrettighed; løsningen har ikke personlige underviserkonti eller individuel revisionshistorik. En kodeændring sker ved at erstatte `PUBLISH_PASSWORD` i Cloudflare og aktivere ændringen. GitHub-nøglen fornyes samme sted, når den udløber.

Serveren kan kun skrive én valideret indholdsfil ad gangen under `content/paths/` på `main`. Browseren kan ikke vælge repository, filsti, branch eller commitbesked. Studenters data medsendes ikke. Den oprindelige underviserkode i browseren er alene en lokal lås til editoren.

Ændringer af appens kode sker fortsat via GitHub. Almindelige indholdsændringer kræver hverken programmering eller GitHub-login hos underviseren. Cloudflare-opsætning, GitHub-token og eventuel fejlfinding af en mislykket udgivelse vedligeholdes af ejeren.

Teknisk dokumentation: [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [byggeindstillinger](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [build watch paths](https://developers.cloudflare.com/workers/ci-cd/builds/build-watch-paths/), [gratisgrænser for Durable Objects](https://developers.cloudflare.com/durable-objects/platform/pricing/).
