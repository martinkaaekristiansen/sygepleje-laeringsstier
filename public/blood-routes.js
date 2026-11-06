// One pedagogical circuit: exchange capillaries in the right upper-arm muscle,
// return via the superior vena cava, then through the right lung. Not to scale.
export const BLOOD_PATH_ID='blodcellens-rejse';
const node=(id,name,kind,oxygen,note)=>({id,name,kind,oxygen,note});
const N={
 aorta:node('aorta','Aorta (hovedpulsåren)','artery','high','Venstre hjertekammer sender iltrigt blod ud i kroppens arterier.'),
 arteries:node('arteries','Arterier','artery','high','Vi følger arterierne mod udvekslingskapillærerne i højre overarms muskel.'),
 arterioles:node('arterioles','Arterioler','arteriole','high','De små arterier regulerer blodtilførslen til kapillærerne.'),
 capillaries:node('capillaries','Kapillærer','systemic-capillary','exchange-out','I musklens kapillærer afgiver hæmoglobin ilt. CO₂ optages fra vævet. Erytrocytten bliver i karret.'),
 venules:node('venules','Venoler','vein','low','Blodet har afgivet en del af sin ilt til musklen. Venoler samler blod fra kapillærerne.'),
 veins:node('veins','Vener','vein','low','Fra højre arm løber blodet gennem større vener mod den øvre hulvene.'),
 cava:node('cava','Vena cava (hulvenen)','vein','low','På denne rute kommer blodet fra overkroppen og løber i den øvre hulvene.'),
 svc:node('svc','Vena cava superior (øvre hulvene)','vein','low','Vena cava superior samler venøst blod fra hoved, hals, arme og øvre del af kroppen.'),
 right:node('right','Højre side af hjertet','right-ventricle','low','Blodet passerer højre forkammer, trikuspidalklappen, højre hjertekammer og pulmonalklappen. Her vises de samlet.'),
 lungs:node('lungs','Lungekredsløbet (det lille kredsløb)','lung-capillary','exchange-in','Blodet passerer lungearterier, lungekapillærer og lungevener. I kapillærerne optager hæmoglobin O₂, mens CO₂ afgives til alveolerne.'),
 left:node('left','Venstre side af hjertet','left-ventricle','high','Fra lungerne kommer blodet til venstre forkammer og gennem mitralklappen til venstre hjertekammer. Det forlader hjertet gennem aortaklappen.'),
 ra:node('ra','Atrium dextrum (højre forkammer)','atrium','low','Højre forkammer modtager blod fra hulvenerne og sender det mod højre hjertekammer.'),
 rv:node('rv','Ventriculus dexter (højre hjertekammer)','right-ventricle','low','Højre hjertekammer pumper blod mod lungerne gennem pulmonalklappen.'),
 pa:node('pa','Lungearterier','artery','low','Lungearterier fører iltfattigt blod væk fra hjertet. Arterie betyder væk fra hjertet, ikke nødvendigvis iltrigt.'),
 parterioles:node('parterioles','Lungearterioler','arteriole','low','Små lungearterier leder blod mod kapillærnettet omkring alveolerne.'),
 pcapillaries:node('pcapillaries','Lungekapillærer','lung-capillary','exchange-in','O₂ diffunderer fra alveolens luft til blodet og bindes til hæmoglobin. CO₂ diffunderer den modsatte vej.'),
 pvenules:node('pvenules','Lungevenoler','vein','high','Efter gasudvekslingen samler lungevenolerne det iltrige blod.'),
 pv:node('pv','Lungevener','vein','high','Lungevener fører iltrigt blod tilbage til venstre forkammer. Vener leder blod mod hjertet.'),
 la:node('la','Atrium sinistrum (venstre forkammer)','atrium','high','Venstre forkammer modtager iltrigt blod fra lungevenerne.'),
 lv:node('lv','Ventriculus sinister (venstre hjertekammer)','left-ventricle','high','Den tykke muskelvæg skaber det tryk, der driver blodet gennem det systemiske kredsløb.'),
 ascending:node('ascending','Aorta ascendens','artery','high','Den opadstigende aorta modtager blod fra venstre hjertekammer gennem aortaklappen.'),
 arch:node('arch','Arcus aortae (aortabuen)','arch','high','Vi følger grenen mod højre arm via truncus brachiocephalicus og højre a. subclavia. Andre aortagrene er også normale.'),
 tricuspid:node('tricuspid','Valva tricuspidalis (trikuspidalklappen)','av-three','low','Tre klapsejl mellem højre forkammer og hjertekammer. Chordae tendineae forankrer sejlene til papillærmuskler.'),
 pulmonaryValve:node('pulmonaryValve','Valva trunci pulmonalis (pulmonalklappen)','semilunar','low','Tre lommeformede flige ved udløbet fra højre hjertekammer. Klappen har ingen chordae tendineae.'),
 trunk:node('trunk','Truncus pulmonalis (lungearteriestammen)','artery','low','Lungearteriestammen deler sig i en højre og en venstre lungearterie. Begge grene er normale.'),
 rpa:node('rpa','Arteria pulmonalis dextra (højre lungearterie)','artery','low','Målet er højre lunge i dette forsøg. Venstre lungearterie er en normal rute til venstre lunge.'),
 mitral:node('mitral','Valva mitralis / bicuspidalis (mitralklappen)','av-two','high','To klapsejl mellem venstre forkammer og hjertekammer, forankret med chordae tendineae.'),
 aorticValve:node('aorticValve','Valva aortae (aortaklappen)','semilunar','high','Tre lommeformede flige mellem venstre hjertekammer og aorta. Ingen chordae tendineae.'),
};
const wrong=(name,explanation,category='not-next')=>({name,explanation,category});
// Distractors describe a wrong next structure, never a claim that a real vessel is absent.
const W={
 arteries:wrong('Vener','Fra aorta fortsætter vi i arterier. På denne rute skal blodet først gennem arterioler og musklens kapillærer, før det når venesiden.'),
 arterioles:wrong('Venoler','Venoler ligger efter kapillærerne på den venøse side. Fra arterier følger vi først arteriolerne.'),
 capillaries:wrong('Vena cava (hulvenen)','Målet er musklens udvekslingskapillærer. Blodet går ikke direkte fra arteriolerne til hulvenen på denne rute.'),
 venules:wrong('Arterioler','Arterioler tilfører normalt blod til kapillærerne. Fremad fra musklens kapillærer fortsætter vi til venolerne.'),
 veins:wrong('Aorta','Fra venoler samles blodet i vener. Aorta nås først igen efter passagen gennem højre hjertehalvdel, lungerne og venstre hjertehalvdel.'),
 cava:wrong('Lungevener','Lungevener dræner lungerne til venstre forkammer. Vi kommer fra armen og følger kroppens vener til hulvenen.'),
 svc:wrong('Vena cava inferior (nedre hulvene)','Den nedre hulvene er en normal returvej fra underkroppen. Vores mål er retur fra højre arm, derfor følger vi vena cava superior. Den anden vej er ikke forkert anatomi, men en anden rute.','other-route'),
 right:wrong('Venstre side af hjertet','Hulvenerne munder i højre forkammer. Der er ingen normal direkte passage fra hulvenen til venstre hjertehalvdel.'),
 lungs:wrong('Aorta','Højre hjertekammer sender blod til lungerne via lungearterierne. Aorta udgår fra venstre hjertekammer.'),
 left:wrong('Højre side af hjertet','Efter lungekapillærerne fører lungevenerne blodet til venstre forkammer. Vi følger den normale fremadrettede strømning.'),
 aorta:wrong('Vena cava (hulvenen)','Venstre hjertekammer sender blod gennem aortaklappen til aorta. Hulvenerne fører blod til højre forkammer.'),
 ra:wrong('Atrium sinistrum (venstre forkammer)','Hulvenerne munder i højre forkammer. Venstre forkammer modtager derimod blod fra lungevenerne.'),
 rv:wrong('Ventriculus sinister (venstre hjertekammer)','Fra højre forkammer passerer blodet trikuspidalklappen til højre hjertekammer. Skillevæggen adskiller de to hjertehalvdele.'),
 pa:wrong('Aorta','Højre hjertekammer tømmer sig gennem pulmonalklappen og lungearteriestammen til lungearterierne, ikke til aorta.'),
 parterioles:wrong('Lungevenoler','Lungearterier forgrenes først til lungearterioler. Venolerne kommer efter lungekapillærerne.'),
 pcapillaries:wrong('Lungevener','Arteriolerne fører til kapillærnettet omkring alveolerne. På denne rute skal gasudvekslingen ske før blodet når lungevenerne.'),
 pvenules:wrong('Lungearterioler','Blodet forlader normalt lungekapillærerne gennem venoler, ikke tilbage gennem de tilførende arterioler.'),
 pv:wrong('Vena cava superior','Lungevenoler samles i lungevener. Den øvre hulvene samler blod fra overkroppen, ikke det iltede blod fra lungerne.'),
 la:wrong('Atrium dextrum (højre forkammer)','Lungevenerne munder i venstre forkammer. Højre forkammer modtager hovedsageligt blod fra hulvenerne.'),
 lv:wrong('Ventriculus dexter (højre hjertekammer)','Fra venstre forkammer går blodet gennem mitralklappen til venstre hjertekammer. Der er ingen normal åbning tværs gennem skillevæggen.'),
 arch:wrong('Truncus pulmonalis','Aorta ascendens fortsætter i aortabuen. Truncus pulmonalis er et andet kar, som udgår fra højre hjertekammer.'),
 tricuspid:wrong('Valva mitralis (mitralklappen)','Trikuspidalklappen sidder mellem højre forkammer og højre hjertekammer. Mitralklappen hører til venstre hjertehalvdel.'),
 pulmonaryValve:wrong('Valva aortae (aortaklappen)','Udløbet fra højre hjertekammer går gennem pulmonalklappen. Aortaklappen sidder ved venstre hjertekammers udløb.'),
 trunk:wrong('Aorta ascendens','Efter pulmonalklappen kommer truncus pulmonalis. Aorta ascendens ligger efter aortaklappen i venstre side.'),
 rpa:wrong('Aorta ascendens','Truncus pulmonalis fører blod fra højre ventrikel til lungearterierne. Der er normalt ingen direkte forbindelse herfra til aorta ascendens, som modtager blod fra venstre ventrikel gennem aortaklappen.'),
 mitral:wrong('Valva tricuspidalis (trikuspidalklappen)','Fra venstre forkammer passerer vi mitralklappen. Trikuspidalklappen forbinder højre forkammer med højre hjertekammer.'),
 aorticValve:wrong('Valva trunci pulmonalis (pulmonalklappen)','Venstre hjertekammer pumper gennem aortaklappen til aorta. Pulmonalklappen hører til højre hjertekammers udløb.'),
 ascending:wrong('Truncus pulmonalis','Efter aortaklappen er vi tilbage i aorta ascendens. Truncus pulmonalis modtager blod fra højre hjertekammer.'),
};
const makeRoute=(id,name,description,ids,rename={})=>({id,name,description,steps:ids.map(key=>({...N[key],name:rename[key]||N[key].name})),choices:ids.slice(1).map(key=>({correct:N[key].id,wrong:W[key]}))});
export const BLOOD_LEVELS={
 easy:makeRoute('easy','Let','Det store overblik · danske betegnelser',['aorta','arteries','arterioles','capillaries','venules','veins','cava','right','lungs','left','aorta']),
 medium:makeRoute('medium','Mellem','Hjertekamre og lungekar · dansk og latin',['aorta','arteries','arterioles','capillaries','venules','veins','svc','ra','rv','pa','parterioles','pcapillaries','pvenules','pv','la','lv','aorta']),
 hard:makeRoute('hard','Svær','Klapper og specifikke kar · den detaljerede rute',['ascending','arch','arteries','arterioles','capillaries','venules','veins','svc','ra','tricuspid','rv','pulmonaryValve','trunk','rpa','parterioles','pcapillaries','pvenules','pv','la','mitral','lv','aorticValve','ascending'],{parterioles:'Pulmonale arterioler',pcapillaries:'Pulmonale kapillærer (omkring alveolerne)',pvenules:'Pulmonale venoler',pv:'Venae pulmonales (lungevenerne)'}),
};
export const bloodPath={id:BLOOD_PATH_ID,title:'Blodcellens rejse',semester:1,subject:'Anatomi og fysiologi',subjects:['Anatomi og fysiologi'],durationMinutes:20,description:'Bliv en rød blodcelle. Find vej gennem kroppens blodkar, hjertet og lungerne i et visuelt kredsløbsspil.',steps:Object.values(BLOOD_LEVELS).map(l=>({id:`blood-${l.id}`,title:`${l.name} · Blodcellens rejse`,type:'game',text:l.description,questions:[]}))};
export const levelStepId=level=>`blood-${level}`;
