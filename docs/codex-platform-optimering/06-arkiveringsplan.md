# Arkiveringsplan — afventer særskilt godkendelse

**Intet historisk materiale er slettet, flyttet eller publiceret til et nyt arkiv. Git-historikken er uændret.** Sparse checkout løser den dyre CI-hentning uden at kræve permanent sletning.

## Kategori 1: Bevares i repositoryet

- Aktuel kode, vendorlicens/-manifest, alle tests og fixtures, README, faglige kilder, arkitekturbeskrivelser og aktuelle rapporter.
- `docs/content-review.md`, de faglige semester-/medicinreferencer og spilbeskrivelser med deres nødvendige bilag.
- Originale brugerrettelser i `Codex_fordoejelsesspil_rettelser_og_screenshots/` (12 filer, 2.492.977 bytes). De har selvstændig kildeværdi.
- Fasegrænser, godkendelsesgrundlag, kendte begrænsninger, checksums og links til eventuelt kommende arkiv.

## Kategori 2: Kandidater til eksternt arkiv

| Område | Filer | Bytes før oprydning | Foreslået håndtering |
|---|---:|---:|---|
| `docs/codex-fordoejelse/` | 413 | 186.721.912 | Historiske medieserier/gallerier kan arkiveres; relevante aktuelle Markdown-rapporter bevares |
| `docs/codex-iltens-rejse/` | 69 | 28.257.607 | Historiske videoer, screenshots og performancepakker kan arkiveres |
| PNG/MP4/WebM på tværs af dokumentationen | 378 | 213.852.526 | Øvre medievolumen, ikke en automatisk sletteliste |

Største enkeltfil er kamera-videoen `kamera-oesophagus-mave-duodenum.mp4` på 2.164.317 bytes. Derefter følger iltspillets WebM-/MP4-klip. Største 20 filer samt ni dubletgrupper og SHA-256 findes i [audit-data.json](audit-data.json).

Foretrukken enkel mulighed: en GitHub Release med fx navnet `platform-historik-b69df9b`, et samlet ZIP/TAR-arkiv med den oprindelige mappestruktur og et separat checksum-manifest. Det bevarer relative gallerilinks ved lokal udpakning og binder materialet til en kendt kodeversion. Et særskilt dokumentationsrepository er et alternativ, hvis gallerierne skal browses løbende. Ingen af mulighederne er oprettet endnu.

Før en fremtidig flytning skal den konkrete filfortegnelse godkendes. Derefter: opret arkiv, download og verificér hver SHA-256, kontrollér alle indgående Markdown-/HTML-/JSON-/kodehenvisninger, bevar nødvendige landingssider og opdatér relative links kontrolleret. Test gallerier efter udpakning og spillets runtimegraf. Først efter verifikation og godkendelse kan aktive kopier fjernes. Arkivets URL, commit, dato, filantal og kontrolsummer skal fremgå af de bevarede rapporter.

## Kategori 3: Kan fjernes efter konkret kontrol

Lokale `dist`, `artifacts`, browsercacher, test-results og debuglogs er reproducerbare og versionsstyres ikke. `.gitignore` forhindrer nye utilsigtede tilføjelser, uden at skjule bevidst dokumentation under `docs`.

De ni byte-dubletgrupper er **ikke** automatisk kategori 3: mange er før/efter-referencer med særskilt proveniens. De kan eventuelt deles via et kontrolleret link-/manifestlag i et fremtidigt arkiv. Potentielle 6,17 MiB ekstra kopier må ikke forveksles med en godkendt besparelse. Ingen versionsstyret ZIP er dokumenteret overflødig og slettet her.

## Historik og tilbageførsel

At slette 200 MB fra et nyt commit fjerner ikke de gamle Git-blobs. Derfor lover planen ikke en tilsvarende reduktion af historiske fulde kloner. Historikomskrivning og force-push er udelukket. Sparse checkout med blob-filtrering reducerede i det faktiske CI-forsøg arbejdsfiler fra 219.885.726 til 2.316.290 bytes og pakkede Git-objekter fra 199.558 til 773 KiB. Denne besparelse er allerede opnåelig uden arkivflytning.

Baseline-træet indeholder ingen versionsstyrede ZIP-filer. De lokale gennemgangsarkiver fra tidligere arbejde er derfor ikke slettet som en del af oprydningen. Git-træ-sammenligningen bekræfter desuden, at både `docs/` og det oprindelige uploadmateriale er bevaret.
