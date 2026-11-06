# Mobilstart og skærmvisning · 0.10.1

Start rejsen brugte `window.confirm`, når et forsøg var i gang. Afviste eller undertrykte browserdialoger fik knappen til at vende tilbage uden synlig forklaring. Spillet viser nu sin egen bekræftelse med »Start nyt forsøg« og »Behold mit forsøg«. Afbrydelse ændrer ikke det gemte forsøg; et nyt forsøg bevarer tidligere gennemførelser og resultater. Fortsæt er uændret.

Spillet fylder automatisk browserens synlige område. `blood-viewport.js` låser dokumentets scroll, gør sidens øvrige navigation inaktiv og følger `visualViewport` ved ændret skærmstørrelse. Afmontering gendanner scroll og navigation. Browserens adresselinje kan fortsat være synlig: løsningen bruger ikke den gestuskrævende Fullscreen API.

Den faste topbjælke indeholder »Tilbage til læringsstier«, lyd til/fra, indstillinger og niveauvalg. Lydstyrke, lydlag, grafik, faglig viden og modelbeskrivelse findes under indstillinger. Spillet pauses, mens panelet er åbent. Start/fortsæt er fast placeret i startmenuen; niveauer og indstillinger kan scrolles inde i deres panel på små skærme. Selve spillesiden kan ikke scrolles.

Regressionstesten `tests-browser/game-viewport.cjs` kontrollerer mobil og computer med deaktiveret browserdialog, annullering, genstart, fortsættelse, bevaring af resultater, skærmrotation, betjeningsknapper, lyd, scrolllås og oprydning. Lyd- og anatomitests åbner nu indstillingspanelet, før de bruger dets kontroller.

Visuel kontrol foretages i Chromium med skærmstørrelser 320×568, 390×844, 844×390 og 1440×900. Mobilvisning er emuleret; fysisk iPhone/Android og Safari er ikke testet i dette miljø.
