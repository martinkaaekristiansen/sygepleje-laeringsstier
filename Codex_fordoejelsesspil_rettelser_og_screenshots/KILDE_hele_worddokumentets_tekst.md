# Originaltekst fra Word-dokumentet (uforkortet)

Altid høj grafik, fjern mulighed/indstilling.

Ryk enzymer og substrat frem i munden så man kan se dem, lige nu ligger de gemt bag noget andet (se billede). Dette skal sikres hele vejen gennem spillet.

Lav symbolet ved hvert enzymnavn hver sin farve så de tydeligt matcher enzymet i spillet. Lav yderligere hvert enzym unikt så de ikke bare har forskellige farver, men ser forskellige ud. Match symbolet for enzymerne ved hvert navn så de tydeligt kan genkendes og ligner de unikke enzymer i spillet.

Lav hvert organsymbol så det ligner omridset af de organer der står (se billede).

Fjern mulighed for at trykke på strukturerne i spillet. Det skal kun være muligt at trykke på knapperne.

Fix at tekst står oven i knapperne (se billede). Det skal kun være teksten der hører til knappen der skal være på den. Dette skal sikres i helet spillet.

Når man skal vælge næste anatomiske struktur, skal det tydeliggøres at det er det man skal. Tilføj teksten: ”Hvad er næste anatomiske struktur?” så det står over de to muligheder. Lav en boks med spørgsmålet og mulighederne så det minder om resten af boksene med spørgsmål og muligheder (se billede)

FORBEDR EPIGLOTTIS OG SYNKNING I FORDØJELSESSPILLET

Du skal forbedre den eksisterende 3D-model og animation af epiglottis (strubelåget) i "Fordøjelsens vilde rejse".

Undersøg først den aktuelle kode, der genererer pharynx, epiglottis, larynx, trachea og oesophagus, samt den tilhørende kamerastyring og synkeanimation.

Du skal ikke bygge spillet forfra. Du skal forbedre den eksisterende anatomiske scene.

1. PROBLEMET MED DEN NUVÆRENDE MODEL

På det vedhæftede skærmbillede fremstår området omkring epiglottis som en samling cirkulære strukturer og rør.

Epiglottis er ikke tydeligt genkendelig.

Den studerende kan ikke umiddelbart identificere strubelågets form, placering eller funktion.

Dette skal forbedres markant.

2. SKAB EN ANATOMISK KORREKT EPIGLOTTIS

Epiglottis skal modelleres som en tredimensionel, bladformet struktur af elastisk brusk beklædt med slimhinde.

Modellen skal have:

En bred, afrundet øvre del.

En smallere nedre del, som er fæstnet til larynx.

En naturlig, let buet overflade.

Realistisk tykkelse og afrundede kanter.

En lyserød til rødlig slimhindeoverflade.

Blød belysning, som tydeliggør strukturen.

Den må ikke ligne en ring, et rør, en kugle eller en flad trekant.

Anvend gerne en tilpasset Three.js BufferGeometry eller en tilsvarende organisk mesh frem for simple standardprimitiver.

3. PLACÉR STRUKTURERNE ANATOMISK KORREKT

Vis følgende strukturer i korrekte indbyrdes relationer:

Tungeroden – radix linguae.

Strubelåget – epiglottis.

Strubehovedet – larynx.

Indgangen til strubehovedet – aditus laryngis.

Luftrøret – trachea.

Spiserøret – oesophagus.

Svælget – pharynx.

Epiglottis skal være placeret bag tungeroden og ved indgangen til larynx.

Trachea skal fortsætte nedad fra larynx, mens oesophagus ligger posteriort for luftvejen.

Vis en anatomisk plausibel overgang mellem pharynx og oesophagus.

Sørg for, at spilleren tydeligt kan forstå, hvorfor fødebolus skal passere til oesophagus og ikke trachea.

4. ANIMÉR SYNKNINGEN KORREKT

Når spilleren når epiglottis, skal synkebevægelsen visualiseres.

Animationen skal vise:

Fødebolus bevæger sig fra mundhulen mod pharynx.

Larynx bevæger sig opad og fremad under synkning.

Epiglottis bevæger sig bagud og nedad og bidrager til at beskytte indgangen til larynx.

Luftvejen beskyttes gennem koordineret lukning af larynx.

Fødebolus ledes mod oesophagus.

Epiglottis vender tilbage til sin hvileposition efter synkningen.

Vigtigt: Epiglottis må ikke fremstilles som et simpelt låg, der alene lukker trachea. Beskyttelsen af luftvejene sker gennem flere koordinerede mekanismer, herunder lukning på larynxniveau.

Bevægelsen skal være glidende og anatomisk plausibel.

5. FORBEDR KAMERAETS PLACERING

Den nuværende kameravinkel gør det svært at genkende strukturerne.

Tilpas kameraet, så epiglottis kan ses tydeligt fra en skrå, anatomisk informativ vinkel.

Spilleren skal kunne se:

Epiglottis' bladform.

Dens relation til tungeroden.

Indgangen til larynx.

Retningen mod oesophagus.

Kameraet skal stå stille, når spilleren skal vælge den næste anatomiske struktur.

Bevar muligheden for at kigge rundt med mus eller touch.

Kameraet må ikke zoome automatisk, mens spilleren venter.

6. GØR SYNKEBEVÆGELSEN INTERAKTIV

Når spilleren når epiglottis, skal der fortsat være to anatomiske valgmuligheder:

Spiserøret – Oesophagus

Luftrøret – Trachea

Spiserøret er korrekt.

Begge destinationer skal være synlige i 3D-miljøet.

Når spilleren vælger spiserøret:

Afspil synkeanimationen.

Vis epiglottis' bevægelse.

Vis fødebolus passere sikkert til oesophagus.

Afspil en passende synkelyd.

Når spilleren vælger luftrøret:

Vis kort, hvorfor luftvejen er den forkerte destination.

Afspil en diskret hostelyd.

Giv en kort humoristisk forklaring.

Lad spilleren vælge igen.

Bevar samme layout og svarsystem som i "Blodcellens rejse".

7. TILFØJ EN KORT, PERMANENT FAGLIG FORKLARING

Vis følgende forklaring i spillets eksisterende lille informationsfelt:

"Epiglottis hjælper med at beskytte luftvejene, når føden synkes mod spiserøret."

Teksten skal blive stående, indtil spilleren fortsætter.

Den må ikke forsvinde automatisk efter få sekunder.

Undgå store tekstbokse, der dækker anatomien.

8. FORBEDR GRAFIKKEN

Epiglottis og de omkringliggende strukturer skal have markant bedre grafisk kvalitet.

Prioritér:

Organisk og anatomisk genkendelig geometri.

Bløde, realistiske overflader.

Naturlige slimhindefarver.

Troværdig belysning.

Tydelig dybde og afstand mellem strukturerne.

Glidende animationer.

Ingen synlige geometriske overlap eller unaturlige ringstrukturer.

Grafikken må gerne være stiliseret, men anatomien skal være korrekt.

9. KVALITETSKONTROL

Efter implementeringen skal du kontrollere:

At epiglottis tydeligt ligner en bladformet struktur.

At dens placering i forhold til tungerod og larynx er korrekt.

At oesophagus ligger posteriort for trachea.

At synkeanimationen er fysiologisk plausibel.

At begge anatomiske valg fungerer.

At kameraet ikke fortsætter med at zoome.

At animationen fungerer på mobil og desktop.

At de øvrige anatomiske stationer ikke påvirkes negativt.

Tag gerne screenshots af den nye scene i hvileposition og under synkning, hvis browsermiljøet understøtter det.

Sammenlign med troværdige anatomiske referenceillustrationer.

SLUTMÅL

Den studerende skal kunne se epiglottis og genkende den som strubelåget uden først at skulle læse navnet.

Den studerende skal visuelt kunne forstå, hvordan synkning leder fødebolus mod oesophagus, og hvordan luftvejene samtidig beskyttes.

Prioritér anatomisk korrekt form, placering og bevægelse frem for blot at gøre den eksisterende model pænere.

Jeg kan se at der står info om proteiner i den lille infoboks selvom jeg har valgt turen med kulhydrater. Der skal kun stå info der er relevant for det pågældende molekyle.

CODEX – FORBEDR TYNDTARMENS SLIMHINDE OG VILLI

Et levende, langsomt bølgende koralrev

Du skal gennemføre en markant grafisk og anatomisk forbedring af tyndtarmens slimhinde og villi i det eksisterende 3D-spil "Fordøjelsens vilde rejse".

Undersøg først den aktuelle kode for tyndtarmens geometri, villi, animationer, materialer, belysning og kamerastyring.

Du skal forbedre den eksisterende Three.js-implementering, ikke bygge spillet forfra.

1. PROBLEMET MED DEN NUVÆRENDE VISUALISERING

På det vedhæftede skærmbillede fra duodenum fremstår tyndtarmen som en rød tunnel med store cirkulære ringe og spidse, kantede strukturer.

Det giver ikke et anatomisk overbevisende billede af tyndtarmens slimhinde.

Jeg ønsker, at spilleren i stedet oplever at bevæge sig gennem et levende, tredimensionelt landskab af slimhindefolder og tusindvis af villi.

Den visuelle inspiration skal være et langsomt bølgende koralrev under vand.

Men den faktiske anatomi skal være korrekt.

2. SKAB TRE TYDELIGE ANATOMISKE NIVEAUER

Tyndtarmens indvendige overflade skal bestå af tre tydeligt adskilte strukturelle niveauer.

A. Plicae circulares – cirkulære slimhindefolder

Disse skal fremstå som brede, uregelmæssige folder, der rager ind i tarmlumen.

De må ikke ligne perfekte, fritstående ringe eller cirkulære plastikrør.

Folderne skal være en integreret del af tarmvæggen og have naturlige variationer i form, højde og forløb.

B. Villi intestinales – tarmvilli

Hele overfladen af slimhindefolderne skal være beklædt med talrige villi.

De skal være:

Fingerformede eller let bladformede afhængigt af tarmregion.

Blødt afrundede i spidsen.

Tæt placerede.

Varierende i højde, bredde og hældning.

Organisk formede.

Forankrede i slimhinden.

De må ikke ligne pigge, krystaller, torne eller kegler.

C. Mikrovilli – børstesømmen

Mikrovilli findes på enterocytternes apikale overflade.

De skal ikke modelleres som store fritstående strukturer i tarmlumen.

Der skal ikke zoomes ind på mikrovilli.

Det er tilstrækkeligt at repræsentere børstesømmen som en fin overfladestruktur på villi, hvis det kan gøres uden at skabe en forkert skalaopfattelse.

3. SKAB EFFEKTEN AF ET LANGSOMT BØLGENDE KORALREV

Dette er den vigtigste visuelle ændring.

Jeg ønsker, at slimhinden skal føles levende.

Når spilleren kigger ned gennem tyndtarmen, skal tusindvis af villi bevæge sig langsomt og diskret.

Forestil dig et koralrev, hvor de bløde strukturer påvirkes af en svag undervandsstrøm.

Animation

Villi skal bevæge sig med små, bløde deformationer.

Bevægelsen skal være langsom og organisk.

Nogle villi skal bevæge sig en anelse forskudt i forhold til andre.

Der må ikke være perfekt synkronisering.

Bevægelsen skal være diskret og ikke ligne kraftig vind.

Slimhindefolderne må gerne ændre form ganske lidt i takt med tarmens bevægelser.

Villi skal forblive forankrede i slimhinden.

Ingen villi må bøje unaturligt eller bevæge sig gennem nabostrukturer.

Anvend gerne subtile sinusbaserede deformationer med faseforskydning, kombineret med langsomme lokale variationer.

Vigtigt: Animationen skal være en pædagogisk stilisering af villusbevægelser og slimhindens dynamik, ikke en påstand om, at villi konstant bølger som havplanter.

4. FORBEDR SLIMHINDENS MATERIALER

Slimhinden skal fremstå fugtig, blød og levende.

Anvend:

Varierede lyserøde og rødrosa nuancer.

Bløde farveovergange.

Diskret glans.

Fine overfladevariationer.

Naturlig lysrefleksion.

Let translucens eller subsurface-scattering-lignende effekt, hvis performance tillader det.

Undgå:

Hårde plastikoverflader.

Skarpe polygonkanter.

Ensartede farver.

Overdreven spejlblankhed.

Store mørke ringe.

Slimhinden skal have en organisk, let fugtig karakter.

5. SKAB TYDELIG DYBDE OG RUMFORNEMMELSE

Når spilleren kigger gennem tyndtarmen, skal villi være synlige både tæt på kameraet og længere inde i tarmen.

Anvend:

Blød, indirekte belysning.

Diskrete skygger mellem villi.

Variation i lysintensitet.

Let atmosfærisk dybde.

Naturlig mørkning længere inde i tarmen.

Det skal give oplevelsen af et stort, levende mikroskopisk landskab.

Undgå dog overdreven tåge, som skjuler anatomien.

6. GØR DUODENUM, JEJUNUM OG ILEUM FORSKELLIGE

De tre dele af tyndtarmen skal ikke være identiske tunneler.

Duodenum – tolvfingertarmen

Vis tydelige slimhindefolder og relevante villi.

Bevar synlige indløb for galde og bugspyt.

Jejunum – tomtarmen

Her skal slimhindefolder og villi være særligt fremtrædende.

Dette skal være det mest imponerende område med det tydeligste "koralrev".

Villi skal fremstå tætte og relativt lange.

Ileum – krumtarmen

Vis generelt mindre fremtrædende slimhindefolder og kortere villi sammenlignet med jejunum.

Bevar den organiske overflade, men gør forskellen mellem tarmregionerne tydelig.

Forskellene skal være anatomisk plausible og ikke overdrives.

7. VIS ABSORPTION DIREKTE I KORALREVET

Absorptionen skal visualiseres direkte på villi.

Ingen zoom ind til mikrovilli, enterocytmembraner eller transportproteiner.

Når de relevante næringsstoffer er nedbrudt, skal spilleren se dem bevæge sig mod villi.

Kulhydrater

Glukosemolekyler bevæger sig mod villusoverfladen, optages gennem tarmepitelet og fortsætter til blodkapillærerne.

Proteiner

Aminosyrer optages gennem tarmepitelet og transporteres videre til blodkapillærerne.

Fedt

Lipidprodukterne optages i enterocytterne, og de dannede chylomikroner transporteres videre til de centrale lymfekar.

Vis transportvejene ved hjælp af diskrete, farvekodede animationer.

Brug gerne en delvist transparent villus, hvor blodkapillærer og centralt lymfekar kan ses.

Dette skal dog være en kort, integreret del af tarmmiljøet og ikke en separat zoomsekvens.

8. VIS TARMINDEHOLD OG VÆSKEBEVÆGELSE

Tarmens lumen skal indeholde en passende mængde væske og små partikler.

Vis:

Langsom bevægelse af tarminhold.

Små partikler, der transporteres fremad.

Diskrete væskestrømme.

Enzym- og substratmolekyler på relevante steder.

Subtile bevægelser af tarmvæggen.

Undgå, at partikler flyver tilfældigt gennem lumen som støv i luften.

Bevægelsen skal ligne transport i et væskefyldt biologisk miljø.

9. BEVAR MULIGHEDEN FOR AT KIGGE RUNDT

Spilleren skal kunne undersøge slimhinden med mus eller touch.

Når spilleren står stille, skal kameraets position være stabil.

Det må ikke zoome automatisk.

Villi og slimhinde må gerne fortsætte deres diskrete bevægelser, mens spilleren læser spørgsmål eller forklaringer.

Spilleren skal kunne se det levende koralrev uden at blive tvunget videre.

10. OPTIMÉR TUSINDVIS AF VILLI

Den forbedrede grafik må ikke ødelægge performance.

Undersøg mulighederne for:

InstancedMesh.

Delte geometribuffere.

GPU-baseret deformation.

Shader-animation.

Level of Detail.

Reduceret geometri på afstand.

Dynamisk kvalitetsindstilling.

Brug gerne forskellige detaljeniveauer afhængigt af afstanden til kameraet.

Undgå at oprette tusindvis af individuelle animationer på CPU'en.

Prioritér en løsning, der fungerer på almindelige computere og mobiltelefoner.

11. BEVAR SPILLETS EKSISTERENDE FUNKTIONER

Du må ikke ændre unødvendigt på:

Den anatomiske rute.

Enzymopgaver.

De tre molekylerejser.

Kropskortet.

Spørgsmålslayoutet.

Faglige forklaringer.

Lydsystemet.

Progression.

Lagring.

Toiletfinalen.

Ændringerne skal primært vedrøre tyndtarmens 3D-geometri, materialer, animationer og absorption.

12. TEST OG VISUEL KVALITETSKONTROL

Efter implementeringen skal du kontrollere:

At villi er fingerformede og ikke spidse pigge.

At plicae circulares ikke ligner fritstående ringe.

At villi er integreret i slimhindens overflade.

At slimhinden bevæger sig langsomt og organisk.

At bevægelserne ikke er synkroniserede.

At jejunum og ileum har anatomisk plausible forskelle.

At absorption kan ses uden zoom.

At kameraet står stille, når spilleren venter.

At spillet fungerer på desktop og mobil.

At performance er acceptabel.

At eksisterende funktioner fortsat virker.

Tag gerne screenshots fra duodenum, jejunum og ileum, hvis browsermiljøet understøtter det.

Sammenlign modellerne med troværdige anatomiske og histologiske referenceillustrationer.

DET ENDELIGE VISUELLE MÅL

Forestil dig, at spilleren bevæger sig gennem en levende undersøisk verden.

Tarmens folder danner landskabet.

Tusindvis af bløde, fingerformede villi dækker overfladen som et tæt koralrev.

De bevæger sig langsomt og forskudt i forhold til hinanden.

Væsken bevæger sig roligt mellem strukturerne.

Næringsstofferne driver mod villi og absorberes gennem tarmepitelet.

Alt fremstår fugtigt, organisk og levende.

Det skal føles som et langsomt bølgende koralrev – men det skal stadig være genkendelig og fysiologisk plausibel tyndtarmsanatomi.

Prioritér denne visuelle transformation frem for mindre kosmetiske ændringer.

brug InstancedMesh med diskret shaderbaseret deformation, hvis den eksisterende Three.js-arkitektur tillader det.

Fjern den ekstra struktur der vises under absorbtionen af næringsstofferne (se billede). Spørgsmålene er fine, men jeg vil bare se stofferne bevæge sig mod slimhinden og forsvinde.

Fjern ringene der skal illustrere næste struktur (se billede). Dette skal gøres for hele spillet.

ANATOMISK KORREKTE PERISTALTISKE BEVÆGELSER I HELE FORDØJELSESSYSTEMET

Formål

Du skal forbedre det eksisterende 3D-spil "Fordøjelsens vilde rejse" i appen "Sygepleje Læringsstier".

Implementér tydelige, realistiske og anatomisk/fysiologisk korrekte bevægelser gennem hele fordøjelseskanalen.

Det vigtigste krav er, at bevægelserne skal foregå i selve organernes 3D-geometri – ikke blot ved at flytte kameraet eller fødepartiklerne fremad.

Spilleren skal kunne se, hvordan fordøjelseskanalens muskler arbejder, og hvordan bevægelserne transporterer og blander føden.

Spillet er udviklet med Three.js og JavaScript.

Undersøg den aktuelle kode for 3D-geometri, animationer, kamerastyring og anatomiske stationer, før du implementerer ændringer.

Genbrug eksisterende funktioner, hvor det er muligt.

1. OVERORDNET ANIMATIONSSYSTEM

Udvikl et fælles animationssystem, som kan håndtere forskellige typer gastrointestinal motilitet.

Systemet skal understøtte:

Fremadskridende peristaltiske bølger.

Lokal kontraktion og afslapning.

Segmenteringsbevægelser.

Blandingsbevægelser.

Gastrisk retropulsion.

Haustrale kontraktioner.

Langsomme massebevægelser i colon.

Særskilte bevægelser ved synkning.

Alle bevægelser skal være anatomisk relevante for det pågældende organ.

Brug ikke den samme bølgeanimation i hele fordøjelseskanalen.

Tekniske principper

Deformér organernes eksisterende mesh eller geometri.

Brug glidende, rumligt udbredte kontraktionsbølger.

Bevar en sammenhængende tarmvæg uden synlige huller.

Undgå selvskæringer og unaturlige geometriske deformationer.

Synkronisér bevægelser med fødebolus, chymus og partikler.

Gør bevægelseshastighed og kontraktionsstyrke justerbare pr. organ.

Bevar god performance på mobil og desktop.

2. MUNDHULEN – TYGNING OG TUNGEBEVÆGELSER

Mundhulen har ikke peristaltik som spiserøret.

Implementér i stedet anatomisk plausible tyggebevægelser.

Visualisering

Underkæben bevæger sig rytmisk.

Tænderne nærmer sig hinanden og findeler føden.

Tungen flytter føden mellem tænderne.

Spyttet blandes med fødepartiklerne.

Føden samles gradvist til en bolus.

Når tygningen afsluttes, skal tungen føre bolus bagud mod oropharynx.

Synkronisér tyggebevægelserne med spillets eksisterende tyggelyde.

3. PHARYNX – SYNKNING

Synkning skal visualiseres som en koordineret bevægelse.

Vis:

Tungen presser bolus bagud.

Den bløde gane løftes og bidrager til at lukke mod nasopharynx.

Pharynxmuskulaturen kontraherer sekventielt.

Larynx bevæges opad og fremad.

Epiglottis bevæges bagud og nedad som del af luftvejsbeskyttelsen.

Den øvre oesophagussfinkter afslappes og åbnes.

Bolus passerer ind i oesophagus.

Bevægelsen skal være glidende og kortvarig.

Undgå at fremstille epiglottis som den eneste mekanisme, der lukker luftvejen.

4. OESOPHAGUS – TYDELIG FREMADSKRIDENDE PERISTALTIK

Dette er et af de vigtigste områder.

Når spilleren bevæger sig gennem spiserøret, skal der være en meget tydelig peristaltisk bølge.

Anatomisk og fysiologisk korrekt animation

Vis:

En ringformet kontraktion bag fødebolus.

Afslapning af spiserørets væg foran bolus.

En fremadskridende kontraktionsbølge mod mavesækken.

Bolus, der transporteres i samme retning som bølgen.

En kort afslapning efter bølgens passage.

Spiserøret skal ikke blot pulsere samtidigt langs hele sin længde.

Kontraktionen skal bevæge sig som en sammenhængende bølge.

Kameraperspektiv

Spilleren skal opleve at blive transporteret fremad af peristaltikken.

Gør kontraktionen synlig omkring kameraets omgivelser, men undgå at klemme kameraet gennem væggen.

Når spilleren stopper for at besvare et spørgsmål, skal kameraets position forblive stabil, mens organets bevægelse gerne må fortsætte.

5. MAVESÆKKEN – BLANDING, ANTRAL PERISTALTIK OG RETROPULSION

Mavesækken skal ikke bevæge sig som et almindeligt tarmrør.

Implementér karakteristiske gastriske bevægelser.

Fundus og proximale corpus

Vis langsomme ændringer i vægspænding og volumen, der afspejler accommodation og tonisk aktivitet.

Undgå kraftige, ensartede kontraktioner.

Distale corpus og antrum

Vis peristaltiske kontraktionsbølger, der bevæger sig mod pylorus.

Bølgerne skal blive tydeligere mod antrum.

Pylorus og retropulsion

Når kontraktionsbølgen når pylorus:

Begrænses passagen af større partikler.

En del af chymus presses tilbage mod antrum.

Der opstår tydelig blanding og findeling.

Denne retropulsion skal kunne ses.

Vis også, at mindre mængder chymus kan passere gennem pylorus til duodenum.

Det skal være visuelt tydeligt, at mavesækken både blander, findeler og doserer sit indhold videre.

6. DUODENUM – SEGMENTERING OG FREMADDRIVENDE BEVÆGELSER

Duodenum skal vise både blanding og transport.

Implementér:

Lokale rytmiske kontraktioner.

Segmenteringsbevægelser.

Korte fremadskridende peristaltiske bølger.

Blanding af chymus med galde og bugspyt.

Visualisering

Når galde og bugspyt strømmer ind, skal de blandes med tarminholdet som følge af tarmens bevægelser.

Vis vekslende kontraktioner i nærliggende segmenter.

Bevægelserne skal ikke alle være synkroniserede.

Bevar de anatomisk korrekte slimhindefolder og villi.

7. JEJUNUM – SEGMENTERING OG DET LEVENDE KORALREV

Jejunum skal have tydelige segmenteringsbevægelser.

Vis, hvordan lokale kontraktioner:

Deler tarminholdet i mindre portioner.

Flytter indholdet frem og tilbage.

Øger blandingen.

Bringer næringsstoffer i kontakt med slimhinden.

Der må også være fremadskridende peristaltiske bevægelser.

Villi

Bevar den tidligere ønskede visualisering af slimhinden som et langsomt bølgende koralrev.

Villi skal:

Bevæge sig langsomt og diskret.

Forblive forankrede i slimhinden.

Følge deformationer af den underliggende tarmvæg.

Have små lokale bevægelser, som er forskudt i forhold til hinanden.

Undgå at villi bevæger sig som lange tangplanter.

Den samlede oplevelse skal være en levende, organisk slimhinde med både lokale villusbevægelser og større segmenteringsbevægelser.

8. ILEUM – BLANDING OG TRANSPORT MOD CAECUM

Ileum skal fortsat vise segmentering og peristaltik.

Bevægelserne skal kunne skelnes fra jejunums, uden at forskellene overdrives.

Vis:

Lokale kontraktioner.

Fremadrettet transport.

Bevægelser, der fører indholdet mod ileocøkalklappen.

Visualisér ileocøkalklappen som en funktionel overgang til caecum.

Undgå at fremstille den som en konstant åben passage.

9. CAECUM – MODTAGELSE OG BLANDING

Når tarminhold passerer fra ileum til caecum, skal der være en synlig overgang.

Vis:

Passage gennem ileocøkalklappen.

Modtagelse af indhold i caecum.

Lokale blandingsbevægelser.

Langsom transport mod colon ascendens.

Bevar det eksisterende anatomiske valg mellem appendix vermiformis og colon ascendens.

10. COLON ASCENDENS – HAUSTRAL AKTIVITET

Tyktarmen skal ikke anvende den samme peristaltiske animation som tyndtarmen.

Implementér tydelige haustrale kontraktioner.

Vis:

Lokale kontraktioner mellem haustra.

Langsom

Illustrer udgangen fra illeum til caecum.

Fjern de 3 knapper i infoboksen øverst til venstre (se billede)  Fjern også mulighederne/funktionen under indstillinger.

CODEX – ANATOMISK KORREKT BLINDTARM OG APPENDIX

Forbedring af caecum, appendix vermiformis og ileocøkalovergangen

Du skal forbedre den eksisterende 3D-anatomi omkring blindtarmen i spillet "Fordøjelsens vilde rejse".

Undersøg først den aktuelle kode for caecum, appendix vermiformis, terminale ileum, ileocøkalklappen og colon ascendens.

Du skal videreudvikle den eksisterende Three.js-model, ikke bygge spillet forfra.

Brug det vedhæftede skærmbillede til at identificere problemerne med den nuværende geometri.

1. PROBLEMET MED DEN NUVÆRENDE MODEL

På skærmbilledet fremstår blindtarmsområdet som en almindelig tunnel med et lille bøjet rør, der stikker ud fra siden.

Der mangler en anatomisk genkendelig caecum.

Appendix ser ud til at være en separat rørstruktur frem for et smalt vedhæng, der udspringer fra caecum.

Overgangen fra ileum til caecum og videre til colon ascendens er ikke tydelig.

Dette skal ændres markant.

2. MODELLÉR CAECUM SOM EN ÆGTE BLINDTARM

Caecum skal være en tydelig, sækformet udvidelse ved begyndelsen af tyktarmen.

Vis:

En bredere diameter end terminale ileum.

En afrundet, blindt endende bund.

En asymmetrisk og organisk form.

Naturlige slimhindefolder.

En sammenhængende overgang til colon ascendens.

Anatomisk korrekt placering i højre fossa iliaca.

Caecum skal ikke ligne et lige, cylindrisk rør.

Det skal tydeligt fremstå som en blindt endende sæk, hvorfra colon ascendens fortsætter opad.

Vigtigt

Caecums blinde ende ligger inferiort for ileums indmunding.

Spilleren skal kunne se, at tarminholdet ankommer fra ileum og derefter transporteres videre til colon ascendens.

3. MODELLÉR APPENDIX VERMIFORMIS KORREKT

Appendix skal være et smalt, ormeformet vedhæng, der udspringer fra caecum.

Anatomiske krav

Appendix skal have en væsentligt mindre diameter end caecum.

Den skal have en smal åbning ind mod caecum.

Den distale ende skal være lukket.

Formen skal være let buet og organisk.

Den skal have en glat, slimhindebeklædt inderside.

Den skal udspringe fra caecums posteromediale væg, inferiort for ileocøkalovergangen.

Appendix må ikke fremstå som et fritstående rør.

Den anatomiske længde er variabel, typisk omkring 6–10 cm, men kan variere betydeligt.

Undgå en unaturligt stor appendix.

Placering

Appendix kan have forskellige anatomiske positioner.

Brug en almindelig, anatomisk plausibel placering, eksempelvis retrocøkal eller bækkenrettet.

Vælg den position, der gør forbindelsen til caecum tydeligst i spillet.

4. VIS ILEOCØKALOVERGANGEN

Den terminale del af ileum skal munde ind i caecum fra den mediale side.

Visualisér:

Terminale ileum.

Ostium ileale.

Ileocøkalklappens læber.

Caecums hulrum.

Appendix' åbning.

Overgangen til colon ascendens.

Ileocøkalklappen skal fremstå som slimhindefolder omkring ileums indmunding.

Den må ikke ligne en stor cirkulær ring, der svæver frit i lumen.

Vis en kort animation, hvor tarminhold passerer fra ileum ind i caecum.

5. FORBEDR DEN INDVENDIGE ANATOMI

Spilleren oplever området indefra.

Derfor skal modellen være anatomisk genkendelig fra et intraluminalt perspektiv.

Vis:

Caecums rummelige, sækformede hulrum.

Naturlige slimhindefolder.

Ileums indmunding på caecums mediale væg.

Appendix' lille åbning.

Den bredere fortsættelse til colon ascendens.

Appendix' åbning skal være væsentligt mindre end passagen til colon ascendens.

Undgå, at appendix og colon ascendens ligner to lige store tunnelåbninger.

Teniae coli

Modellér gerne tyktarmens længdegående muskelbånd, teniae coli, på den ydre anatomi.

De tre teniae coli konvergerer ved appendix' basis.

Dette kan bruges som et anatomisk pejlemærke i modellen.

Teniae coli skal ikke fremstilles som store fritliggende strukturer inde i tarmlumen.

6. FORBEDR DET ANATOMISKE VALG

Bevar de to eksisterende valgmuligheder:

Blindtarmen vedhæng – Appendix vermiformis

Opadstigende tyktarm – Colon ascendens

Ret betegnelsen til:

Blindtarmsvedhænget – Appendix vermiformis

og

Opadstigende tyktarm – Colon ascendens

Colon ascendens er den korrekte vej videre gennem fordøjelseskanalen.

Interaktion

Begge destinationer skal kunne identificeres visuelt.

Appendix' åbning skal være lille og anatomisk korrekt.

Colon ascendens skal fremstå som den naturlige fortsættelse.

Bevar samme svarlayout som i "Blodcellens rejse".

Tillad gerne klik direkte på de anatomiske strukturer.

Ved forkert valg:

"Appendix er en blindgyde. Herfra kommer du ikke videre gennem fordøjelseskanalen."

Lad spilleren prøve igen.

7. VIS LOKALE BEVÆGELSER

Caecum skal have diskrete, fysiologisk plausible bevægelser.

Implementér:

Lokal blanding af tarminhold.

Langsomme kontraktioner i caecumvæggen.

Gradvis transport mod colon ascendens.

Bevægelse af væske og partikler.

Appendix skal ikke vise kraftige, kontinuerlige peristaltiske bølger.

Undgå, at hele caecum pulserer som en ballon.

Bevægelsen skal være organisk og lokaliseret.

8. FORBEDR GRAFIK OG MATERIALER

Brug:

Bløde, organiske former.

Anatomisk plausible proportioner.

Naturlige slimhindefarver.

Diskret glans.

Varierede overflader.

Blød belysning.

Naturlige overgange mellem strukturerne.

Fjern synlige geometriske samlinger, unaturlige ringe og skarpe rørender.

Sørg for, at appendix faktisk er forbundet med caecum.

9. FORBEDR KAMERAETS PLACERING

Kameraet skal placeres, så den studerende kan se:

Hvor ileum munder ind i caecum.

At caecum er en blindt endende sæk.

Hvor appendix udspringer.

Hvor colon ascendens fortsætter.

Det kan kræve en skrå kameravinkel frem for at kigge direkte ned gennem en tunnel.

Bevar muligheden for at kigge rundt med mus eller touch.

Kameraet må ikke fortsætte med at zoome, mens spilleren står stille.

10. TILFØJ EN KORT FAGLIG FORKLARING

Vis følgende tekst i spillets eksisterende lille informationsfelt:

"Caecum er tyktarmens første afsnit. Appendix er et smalt, blindt endende vedhæng."

Teksten skal blive stående, indtil spilleren fortsætter.

Undgå store forklaringsbokse.

11. BEVAR EKSISTERENDE FUNKTIONER

Du må ikke ændre unødvendigt på:

Den anatomiske rute.

De tre molekylerejser.

Enzymopgaver.

Kropskort.

Progression.

Lyd.

Indstillinger.

Spørgsmålslayout.

Toiletfinalen.

Ændringerne skal primært vedrøre caecum, appendix, ileocøkalovergangen og begyndelsen af colon ascendens.

12. KVALITETSKONTROL

Efter implementeringen skal du kontrollere:

At caecum er sækformet og blindt endende.

At appendix er væsentligt smallere end caecum.

At appendix udspringer fra caecums væg.

At appendix har en lukket distal ende.

At terminale ileum munder korrekt ind i caecum.

At ileocøkalklappen er anatomisk plausibel.

At colon ascendens fortsætter opad fra caecum.

At spilleren tydeligt kan skelne appendix fra colon ascendens.

At kameravinklen giver et anatomisk forståeligt overblik.

At alle eksisterende spilfunktioner stadig virker.

Tag screenshots både udefra og indefra, hvis browsermiljøet understøtter det.

Sammenlign med troværdige anatomiske referenceillustrationer.

DET ENDELIGE MÅL

Når spilleren ankommer fra ileum, skal vedkommende opleve at træde ind i et større, sækformet hulrum.

På den ene side ses den lille åbning til appendix vermiformis.

Den naturlige fortsættelse er den bredere passage til colon ascendens.

Den studerende skal kunne forstå forskellen mellem caecum og appendix ved blot at undersøge anatomien.

Prioritér anatomisk korrekt form, placering, proportioner og sammenhæng frem for kosmetiske forbedringer.

I colon kigger man direkte ind i væggen og kan ikke se forløbet.

Når man rammer toilettet, skal man ramme vandet oppefra, lige nu ser man det fra siden.

Når man kigger rundt/flytter kameraet skal man kunne se tilbage til der hvor man kom fra.