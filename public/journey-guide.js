import {esc} from './ui.js';

// Front-view schematic: the patient's right is on the viewer's left.
// Coordinates locate regions of this particular right-arm / right-lung route;
// they are not a scale drawing or a second set of anatomical connections.
const place=(x,y,region,fact)=>({x,y,region,fact});
export const JOURNEY_GUIDE={
 aorta:place(69,60,'Aorta','Aortas elastiske væg udvides under hjerteslaget og hjælper med at holde blodet i bevægelse mellem slagene.'),
 ascending:place(69,60,'Opadstigende aorta','Kranspulsårerne, som forsyner selve hjertemusklen, udspringer nær begyndelsen af aorta.'),
 arch:place(62,48,'Aortabuen','Aortabuen afgiver grene til hoved, hals og arme. Her følger vi blodet mod højre arm.'),
 arteries:place(33,54,'Højre overarm','En arterie fører blod væk fra hjertet. Navnet fortæller derfor retningen – ikke hvor meget ilt blodet indeholder.'),
 arterioles:place(27,65,'Højre overarm','Arteriolernes glatte muskulatur kan ændre diameteren og dermed regulere, hvor meget blod vævet får.'),
 capillaries:place(24,78,'Højre overarms muskel','Mange kapillærer er så smalle, at erytrocytter må deformeres og passere én ad gangen.'),
 venules:place(27,84,'Højre overarm','Ved inflammation kan hvide blodlegemer forlade blodbanen gennem væggen i små venoler og nå ud til vævet.'),
 veins:place(33,69,'Højre overarm','Når skeletmuskler trækker sig sammen, hjælper de blodet gennem venerne. Veneklapper modvirker tilbageløb.'),
 cava:place(53,53,'Øvre hulvene','Der er to store hulvener: den øvre samler blod fra overkroppen, og den nedre samler blod fra underkroppen.'),
 svc:place(53,53,'Øvre hulvene','Vena cava superior har ingen veneklap ved indmundingen i højre forkammer.'),
 right:place(60,74,'Højre hjertehalvdel','Højre hjertehalvdel arbejder ved lavere tryk end venstre, fordi den pumper gennem lungekredsløbet.'),
 ra:place(59,66,'Højre forkammer','Sinusknuden ligger i højre forkammer nær den øvre hulvene. Den fungerer normalt som hjertets pacemaker.'),
 tricuspid:place(60,71,'Trikuspidalklappen','Chordae tendineae holder klapsejlene fra at slå tilbage i forkammeret. Klappen åbnes og lukkes af trykforskelle.'),
 rv:place(61,79,'Højre hjertekammer','Højre hjertekammer ligger fortil i brystkassen og har en tyndere muskelvæg end venstre hjertekammer.'),
 pulmonaryValve:place(57,70,'Pulmonalklappen','Pulmonalklappens tre lommer fanger kortvarigt tilbagestrømmende blod, så klappen lukker efter uddrivningen.'),
 trunk:place(55,62,'Lungearteriestammen','Lungearteriestammen deler sig i en højre og en venstre lungearterie. Begge er normale veje til lungerne.'),
 pa:place(47,53,'Mod højre lunge','Lungearterierne fører iltfattigt blod, selvom de er arterier – de fører nemlig blod væk fra hjertet.'),
 rpa:place(47,53,'Højre lungearterie','Højre lungearterie løber bag den opadstigende aorta på sin vej mod højre lunge.'),
 parterioles:place(44,57,'Højre lunge','Lavt iltindhold i et alveoleområde kan få de lokale lungearterioler til at trække sig sammen og lede blod mod bedre ventilerede områder.'),
 lungs:place(46,66,'Højre lunge','Alveolernes store samlede overflade og tynde barriere gør det muligt at udveksle store mængder O₂ og CO₂.'),
 pcapillaries:place(46,66,'Højre lunges alveoler','Alveoleluft og blod blandes ikke. O₂ og CO₂ diffunderer gennem den tynde barriere mellem dem.'),
 pvenules:place(48,73,'Højre lunge','Efter gasudvekslingen samler små lungevenoler det iltrige blod, før det fortsætter i større lungevener.'),
 pv:place(53,75,'Fra højre lunge','Normalt munder fire lungevener i venstre forkammer – to fra hver lunge.'),
 left:place(70,75,'Venstre hjertehalvdel','Venstre hjertekammers kraftige muskelvæg skaber det tryk, der driver blodet gennem hele det store kredsløb.'),
 la:place(68,65,'Venstre forkammer','Venstre forkammer ligger bagtil i hjertet, tæt foran spiserøret.'),
 mitral:place(68,71,'Mitralklappen','Mitralklappen har to sejl. Dens navn henviser til formen på en bispehue – en mitra.'),
 lv:place(70,79,'Venstre hjertekammer','Venstre hjertekammer danner det meste af hjertets spids, som peger nedad og mod venstre.'),
 aorticValve:place(69,67,'Aortaklappen','Den anden hjertelyd, S2, hænger sammen med lukningen af aorta- og pulmonalklappen.'),
};
export function renderBodyMap(s){
 const p=JOURNEY_GUIDE[s.id];if(!p)return '';
 const colour=s.oxygen==='high'?'#ed7964':'#a8354e';
 return `<figure class="blood-minimap" aria-label="Kropskort set forfra: ${esc(s.name)} – ${esc(p.region)}"><figcaption>KROPSKORT · FORFRA</figcaption><svg viewBox="0 0 120 174" role="img" aria-label="Du er ved ${esc(p.region)}" data-map-location="${esc(s.id)}">
 <g fill="#244650" stroke="#a7c9c9" stroke-width="1.4"><circle cx="60" cy="18" r="12"/><path d="M53 30V36Q42 36 35 43L18 87Q16 94 22 95Q27 96 29 89L41 60L42 101L38 155Q37 164 44 164Q50 164 51 157L60 116L69 157Q70 164 77 164Q83 164 82 155L78 101L79 60L91 89Q93 96 99 95Q104 94 102 87L85 43Q78 36 67 36V30"/></g>
 <g fill="#7b9ea4" fill-opacity=".5" stroke="#bed6db" stroke-width=".7"><path d="M56 46Q42 46 41 63V80Q53 81 56 69Z"/><path d="M65 46Q79 46 79 64V80Q68 78 65 66Z"/></g>
 <path d="M61 67Q55 61 56 71Q57 81 70 87Q79 75 74 68Q69 61 65 67Z" fill="#9c3c4d" stroke="#f2aa99" stroke-width=".8"/>
 <g fill="none" stroke-width="1.8" stroke-linecap="round"><path d="M70 79L69 60Q68 46 62 48L33 54L27 65L24 78" stroke="#ed7964"/><path d="M24 78L27 84L33 69Q39 51 53 53L59 66L60 71L61 79" stroke="#a44e66"/><path d="M61 79L57 70L55 62L47 53L44 57L46 66" stroke="#a44e66"/><path d="M46 66L48 73L53 75L68 65L68 71L70 79" stroke="#ed7964"/></g>
 <text x="18" y="39" fill="#e1eceb" font-size="8" font-family="system-ui">H</text><text x="97" y="39" fill="#e1eceb" font-size="8" font-family="system-ui">V</text>
 <g class="blood-map-marker" data-map-x="${p.x}" data-map-y="${p.y}" transform="translate(${p.x} ${p.y})"><circle r="7" fill="#fff1d8" fill-opacity=".25"/><circle r="3.8" fill="${colour}" stroke="#fff1d8" stroke-width="1.6"/></g>
 </svg><span>${esc(p.region)}</span></figure>`;
}
export function renderFunFact(s){
 const p=JOURNEY_GUIDE[s.id];return p?`<aside class="blood-funfact" aria-label="Funfact om ${esc(s.name)}"><strong>Vidste du?</strong><p>${esc(p.fact)}</p></aside>`:'';
}
