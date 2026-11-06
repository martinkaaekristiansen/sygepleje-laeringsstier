import {BLOOD_LEVELS} from './blood-routes.js';
export {BLOOD_LEVELS};
export const CIRCULATION_ID='find-vej-kredsloeb';
export const ACTIVITIES=[['order','Byg kredsløbet','Flyt anatomiske kort til den rigtige rækkefølge.'],['context','Hvor er blodcellen?','Forbind placering, blodets retning og gasudveksling.']];
export const circulationPath={id:CIRCULATION_ID,title:'Kan du finde vej gennem kredsløbet?',semester:1,subject:'Anatomi og fysiologi',subjects:['Anatomi og fysiologi'],durationMinutes:15,description:'Fra oplevelse til forståelse. Byg kredsløbet, og undersøg blodets retning og iltning efter Blodcellens rejse.',steps:ACTIVITIES.map(([id,title,text])=>({id:`circulation-${id}`,title,type:'game',text,questions:[]}))};
export const routeFor=level=>BLOOD_LEVELS[level].steps;
export const uniqueRoute=level=>routeFor(level).slice(0,-1);
// Metadata supplements the game's authoritative routes; it never defines a second sequence.
export const SYNONYMS={
 aorta:['hovedpulsåren','hovedpulsåre'],ascending:['den opadstigende aorta','opadstigende aorta'],arch:['aortabuen','aortabue'],
 arteries:['arterie','arterierne','arteriae','pulsårer'],arterioles:['arteriole','arteriolerne','arteriolae'],capillaries:['kapillær','kapillærerne','kapillærnet','vasa capillaria'],venules:['venole','venolerne','venulae'],veins:['vene','venerne','venae'],
 cava:['hulvene','hulvenerne','vena cava superior','øvre hulvene'],svc:['den øvre hulvene','øvre hulvene','øvre hulvenen'],
 right:['højre hjertehalvdel','højre hjerte'],left:['venstre hjertehalvdel','venstre hjerte'],lungs:['lungekredsløb','det lille kredsløb','lungekredsløbet'],
 ra:['højre atrium','højre forkammer'],rv:['højre ventrikel','højre hjertekammer'],la:['venstre atrium','venstre forkammer'],lv:['venstre ventrikel','venstre hjertekammer'],
 pa:['arteriae pulmonales','lungearterie','lungearterierne'],parterioles:['lungearterioler','pulmonale arterioler','arteriolae pulmonales'],pcapillaries:['lungekapillærer','pulmonale kapillærer','kapillærer omkring alveolerne'],pvenules:['lungevenoler','pulmonale venoler','venulae pulmonales'],pv:['lungevener','lungevenerne','venae pulmonales'],
 tricuspid:['trikuspidalklap','trikuspidalklappen','tricuspidalklappen','valva tricuspidalis'],mitral:['mitralklap','mitralklappen','bikuspidalklappen','valva mitralis','valva bicuspidalis'],pulmonaryValve:['pulmonalklap','pulmonalklappen','valva pulmonalis','valva trunci pulmonalis'],aorticValve:['aortaklap','aortaklappen','valva aortae'],trunk:['lungearteriestammen'],rpa:['højre lungearterie','a. pulmonalis dextra']
};
export const OXYGEN={high:'Overvejende iltet',low:'Overvejende afiltet','exchange-out':'Afgiver O₂ og optager CO₂ – iltindholdet falder','exchange-in':'Optager O₂ og afgiver CO₂ – iltindholdet stiger'};
export const CIRCUITS={systemic:'Det systemiske kredsløb',pulmonary:'Lungekredsløbet',transition:'Overgang mellem kredsløbene i hjertet'};
export function circuitFor(node){if(['right','left','tricuspid','mitral'].includes(node.id))return 'transition';return ['rv','pulmonaryValve','trunk','rpa','pa','parterioles','pcapillaries','pvenules','pv','la','lungs'].includes(node.id)?'pulmonary':'systemic';}
export const ROUTE_NOTE='Vi følger blod fra højre overarms muskel via øvre hulvene og højre lunge. Andre anatomiske ruter findes også.';
export const CIRCUIT_NOTE='Her afgrænses det systemiske kredsløb fra venstre ventrikel til højre atrium og lungekredsløbet fra højre ventrikel til venstre atrium. AV-klapperne og de samlede hjertehalvdele på let niveau betegnes som overgange.';
