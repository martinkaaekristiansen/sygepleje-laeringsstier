# Faglig vurdering og vedligeholdelse

Version 0.10.0. Teknisk og redaktionel gennemgang: 6. november 2026.
**Status: Afventer manuel faglig godkendelse.** Ingen ekstern fagperson har godkendt denne version. Datoen er ændringsdato, ikke dato for klinisk godkendelse.

| Indhold | Grundlag | Udført | Manglende faglig vurdering |
| --- | --- | --- | --- |
| Medicinhåndtering, 20 spørgsmål | Brugerens Medicinhåndteringsprøver.docx; [udvælgelse](medicinhaandtering.md) | Beregninger kontrolleret; m/v og slutvolumen præciseret; IM-vaccineforklaring nu skelnet fra systemisk lægemiddelabsorption; forklaring til hvert svar | Farmakologisk fagperson skal kontrollere facit mod aktuelle produktresumeer: insulin og IV-anvendelse, betablokkere/hypoglykæmi, metformin/nyrefunktion, præparatspecifik cytostatikatoksicitet. Dokumentet indeholder ikke et godkendt facit. |
| 5. semester, 36 spørgsmål | Udkast E26 semesterbeskrivelse; [målkobling](semester5-e26.md) | Distraktorer revideret; svarenes længde er ikke længere en systematisk ledetråd; specifik feedback; flere fagfiltre | Underviser skal vurdere sværhedsgrad, lokale akut-/transfusions-/PVK-instrukser samt samtykke, tvang og tolkning efter aktuelle danske regler. |
| Kredsløbsruter og aktiviteter | Fælles `blood-routes.js`; [anatomisk model](blodcellens-rejse-3d.md) | Rækkefølger og iltningsskift testet; mulige lungeforgreninger bruges ikke som anatomiske fejl | Anatomiunderviser skal validere læringsniveau og nomenklatur. Den fastlagte rute er gennem højre arm og højre lunge, ikke alle mulige ruter. |
| Hjertekamre, klapper og lyd | Proceduralt fremstillet undervisningsmodel; [kamre](circulation-and-chambers.md) | Ventrikulær tømning/fyldning og respirationsfase rettet; kamera og støtteapparat testes | Fagperson skal bedømme form, orientering, trabekler, chordae og kontraktioner visuelt. Modellen er forenklet, ikke målfast eller patientbaseret. |

## Sådan registreres en faglig godkendelse

1. Notér reviewerens navn, fagrolle, dato, præcis indholdsversion og anvendte kilder.
2. Notér konkrete ændringer og eventuelle forbehold; godkend ikke hele appen ud fra en enkelt stikprøve.
3. Ret indholdet i den relevante datafil og hæv dens `contentVersion`.
4. Kør tests og kontrollér opdatering på en profil med gamle data før udgivelse.

Teknisk test og en bestået øvelse er ikke dokumentation for selvstændig klinisk kompetence. Instrukser og produktresumeer skal anvendes ved klinisk medicinhåndtering. Personoplysninger skal ikke indtastes i refleksionerne.
