// Correct answer is index 0; the UI shuffles display order while saving identity.
const q = (id, prompt, options, why) => ({ id, prompt, options, why });
export const ADDITIONAL_QUESTIONS = {
  stanley: [
    q(
      'pancreatic-amylase',
      'En patient har nedsat pankreasfunktion. Hvad kan det betyde for stivelse i duodenum?',
      [
        'Mindre pankreasamylase kan give mindre hydrolyse af stivelse',
        'Galde overtager spaltningen af glykosidbindinger',
        'Stivelse optages normalt intakt gennem tarmvæggen',
      ],
      'Pankreasamylase hydrolyserer stivelse. Galde er ikke et kulhydratspaltende enzym.',
    ),
    q(
      'salivary-ph',
      'Hvad sker der med spytamylasens virkning, når bolus gradvist bliver stærkt sur?',
      [
        'Aktiviteten aftager; fordøjelsen fortsætter senere med pankreasamylase',
        'Amylasen bliver til pepsin',
        'Amylasen arbejder bedst ved mavesækkens lave pH',
      ],
      'Spytamylase virker bedst omkring neutral pH og hæmmes, når maveindholdet forsures.',
    ),
    q(
      'sglt1-gradient',
      'Den apikale Na⁺-gradient i enterocytten svækkes. Hvilket trin påvirkes direkte?',
      [
        'SGLT1-medieret optagelse af glukose fra lumen',
        'GLUT2-medieret udgang bliver Na⁺-koblet',
        'Pakning af glukose i chylomikroner',
      ],
      'SGLT1 kobler glukosetransport til Na⁺-gradienten, som vedligeholdes af den basolaterale Na⁺/K⁺-ATPase.',
    ),
    q(
      'glut2-exit',
      'Glukose er nået ind i enterocytten via SGLT1. Hvilket trin følger normalt?',
      [
        'Basolateral udgang gennem GLUT2 mod interstitset og kapillærerne',
        'Udgang gennem GLUT2 til galdeblæren',
        'Reesterificering til et triglycerid',
      ],
      'GLUT2 formidler faciliteret diffusion over den basolaterale membran. Glukosen når derefter portalblodet.',
    ),
    q(
      'lactase-specificity',
      'En patient mangler laktase, men har bevaret maltase. Hvilken konklusion er mest præcis?',
      [
        'Laktose kan malabsorberes, selv om maltose fortsat kan spaltes',
        'Alle kulhydrater bliver ufordøjelige',
        'Laktase er nødvendig for pankreasamylasens dannelse',
      ],
      'Børstesømsenzymer har forskellige substrater. En bestemt enzymmangel betyder ikke, at al kulhydratfordøjelse ophører.',
    ),
    q(
      'osmotic-malabsorption',
      'Uabsorberede kulhydrater bliver i tarmlumen. Hvilken følge er fysiologisk plausibel?',
      [
        'Osmotisk væskeretention og bakteriel gasdannelse',
        'Umiddelbar transport som chylomikroner',
        'Fuldstændig erstatning af væskeoptagelsen i colon',
      ],
      'Uabsorberede opløste stoffer kan holde vand i lumen. Bakterier kan fermentere kulhydrater og danne gas.',
    ),
    q(
      'surface-and-transport',
      'Hvorfor er en stor absorptionsoverflade ikke nok, hvis glukosetransporterne svigter?',
      [
        'Optagelsen kræver både overflade og fungerende transport over epitelet',
        'Villi omdanner selv al glukose til galde',
        'Overfladen kan kun optage fedt',
      ],
      'Villi og mikrovilli øger overfladen, men molekylerne skal stadig passere enterocytternes membraner via relevante transportmekanismer.',
    ),
  ],
  trine: [
    q(
      'bile-obstruction',
      'Galdegangen er aflukket, mens pankreas stadig udskiller lipase. Hvad kan forventes?',
      [
        'Mindre effektiv emulgering og micelledannelse kan mindske fedtoptagelsen',
        'Lipase omdannes til galdesalte',
        'Alt fedt optages uændret som store dråber',
      ],
      'Galdesalte øger tilgængeligheden af langkædede lipidprodukter ved epitelet. Lipase erstatter ikke denne funktion.',
    ),
    q(
      'pancreatic-lipase',
      'En patient har eksokrin pankreasinsufficiens og fedtrig afføring. Hvilken sammenhæng er mest relevant?',
      [
        'Mindre lipase kan give mangelfuld triglyceridhydrolyse',
        'Mere pepsin erstatter normalt al lipase',
        'Galde kan alene hydrolysere triglycerider fuldstændigt',
      ],
      'Mangel på pankreaslipase kan give fedtmalabsorption og steatorré, selv om galde fortsat tilføres.',
    ),
    q(
      'fat-soluble-vitamins',
      'Hvilken mangeltilstand kan længerevarende fedtmalabsorption øge risikoen for?',
      [
        'Mangel på de fedtopløselige vitaminer A, D, E og K',
        'Isoleret mangel på natrium, fordi det kun optages i chylomikroner',
        'Mangel på pepsinogen som eneste følge',
      ],
      'Optagelsen af fedtopløselige vitaminer er knyttet til fedtfordøjelse og fedtoptagelse.',
    ),
    q(
      'micelle-versus-chylomicron',
      'En micelle når børstesømmen. Hvad er den vigtige skelnen?',
      [
        'Lipidprodukter afleveres; hele micellen optages ikke som en chylomikron',
        'Micellen og chylomikronen er samme partikel',
        'Micellen dannes først i lymfekarret',
      ],
      'Miceller findes i lumen. Chylomikroner dannes i enterocytten efter optagelse og reesterificering af langkædede lipidprodukter.',
    ),
    q(
      'lymph-entry',
      'Hvor kommer langkædet fedt i chylomikroner typisk først ind i kredsløbet?',
      [
        'Via lymfen til venstre venevinkel og det systemiske blod',
        'Direkte fra enterocytten til vena portae som hele chylomikroner',
        'Fra appendix direkte til aorta',
      ],
      'Lymfen munder via ductus thoracicus ved venstre venevinkel. Den viste vej går derfor uden om den første portalpassage gennem leveren.',
    ),
    q(
      'chain-length',
      'Kan transportvejen for langkædede fedtsyrer uden videre bruges for alle fedtsyrer?',
      [
        'Nej; kortere fedtsyrer kan i højere grad følge portalblodet',
        'Ja; alle fedtsyrer skal først pakkes i store chylomikroner',
        'Nej; korte fedtsyrer kan ikke optages',
      ],
      'Kædelængden har betydning. Modellen viser især den klassiske chylomikron-/lymfevej for langkædede lipidprodukter.',
    ),
    q(
      'bicarbonate-ph',
      'Meget surt maveindhold kommer til duodenum. Hvorfor er pankreasbikarbonat vigtigt for fedtfordøjelsen?',
      [
        'Det hjælper med at skabe et pH-miljø, hvor pankreasenzymer kan virke',
        'Det hydrolyserer selv alle esterbindinger',
        'Det omdanner lipase til et vitamin',
      ],
      'Bikarbonat neutraliserer syre. Det er ikke et enzym, men understøtter det passende miljø for blandt andet pankreaslipase.',
    ),
  ],
  poul: [
    q(
      'pepsin-ph',
      'Syrehæmmende medicin hæver pH i mavesækken. Hvilken virkning er mest præcis?',
      [
        'Pepsinaktivering og pepsinaktivitet kan mindskes; tyndtarmens proteolyse kan fortsætte',
        'Al proteinfordøjelse ophører nødvendigvis',
        'Pepsin arbejder altid bedre ved neutral pH',
      ],
      'Det sure miljø understøtter pepsin. Pankreasproteaser og peptidaser i tyndtarmen bidrager også til proteinfordøjelsen.',
    ),
    q(
      'pepsinogen-protection',
      'Hvorfor udskiller hovedceller pepsinogen frem for kun aktivt pepsin?',
      [
        'Et inaktivt forstadie begrænser proteolytisk skade før aktivering i lumen',
        'Pepsinogen er et fedtspaltende galdesalt',
        'Pepsinogen optages intakt som aminosyrer',
      ],
      'Pepsinogen er et zymogen. Saltsyre fremmer aktivering, hvorefter pepsin også kan aktivere mere pepsinogen.',
    ),
    q(
      'enteropeptidase',
      'Enteropeptidasens funktion svigter. Hvilket trin påvirkes først direkte?',
      [
        'Aktiveringen af trypsinogen til trypsin ved børstesømmen',
        'Dannelsen af galde i leveren',
        'Ombygning af aminosyrer til miceller',
      ],
      'Enteropeptidase starter aktiveringen af trypsinogen. Trypsin aktiverer derefter flere pankreatiske zymogener.',
    ),
    q(
      'pancreatic-proteases',
      'En patient udskiller for lidt pankreasprotease. Hvad kan dette medføre?',
      [
        'Mindre hydrolyse af peptider og nedsat tilgængelighed af absorberbare produkter',
        'Pepsin bliver automatisk til trypsin i duodenum',
        'Proteiner optages normalt uændrede i stedet',
      ],
      'Pankreasproteaser bidrager til at danne mindre peptider. Absorptionen kræver videre nedbrydning og relevante transportmekanismer.',
    ),
    q(
      'pept1-gradient',
      'Hvilken drivkraft kobles til optagelse af di-/tripeptider gennem PEPT1?',
      [
        'En H⁺-gradient over den apikale membran',
        'Direkte pakning i chylomikroner',
        'Galdetrykket i leveren',
      ],
      'PEPT1 er en H⁺-koblet peptidtransporter. Aminosyrer benytter andre transportere, blandt andet Na⁺-koblede systemer.',
    ),
    q(
      'portal-liver',
      'Et absorberet næringsstof følger vena portae fra tarmen. Hvilket organ møder denne vej først?',
      ['Leveren', 'Lymfeknuden som eneste obligatoriske første organ', 'Galdeblæren før leveren'],
      'Portalblod fra tarmen føres til leveren. Det adskiller sig fra den tidlige lymfevej for chylomikroner.',
    ),
    q(
      'protein-malabsorption',
      'Hvorfor kan udtalt proteinmalabsorption give ernæringsproblemer, selv om patienten spiser protein?',
      [
        'Indtaget protein skal nedbrydes og absorberes, før aminosyrerne er tilgængelige for kroppen',
        'Tygning alene garanterer fuldstændig absorption',
        'Proteiner kan normalt erstattes af galdesalte som byggesten',
      ],
      'Indtagelse og optagelse er forskellige trin. Nedsat fordøjelse eller epiteltransport kan mindske tilførslen af aminosyrer.',
    ),
  ],
};
