export const subjects=['Alle fagområder','Anatomi og fysiologi','Sygdomslære','Sygepleje','Farmakologi','Mikrobiologi'];
export const questions=[
{q:'Hvor begynder nedbrydningen af stivelse?',a:['I munden','I mavesækken','I tyktarmen'],correct:0,why:'Spyttets enzym amylase begynder nedbrydningen af stivelse i munden.'},
{q:'Hvilket organ producerer galde?',a:['Galdeblæren','Leveren','Bugspytkirtlen'],correct:1,why:'Leveren producerer galde. Galdeblæren lagrer og koncentrerer den.'},
{q:'Hvor optages de fleste næringsstoffer?',a:['I spiserøret','I mavesækken','I tyndtarmen'],correct:2,why:'Tyndtarmens folder, tarmtotter og mikrovilli giver en stor overflade til optagelse.'},
{q:'Hvilket enzym nedbryder laktose?',a:['Lipase','Laktase','Pepsin'],correct:1,why:'Laktase i tyndtarmens børstesøm spalter laktose til glukose og galaktose.'},
{q:'Hvad er en vigtig funktion i tyktarmen?',a:['At producere insulin','At optage vand og elektrolytter','At producere galde'],correct:1,why:'Tyktarmen optager vand og elektrolytter og bidrager til dannelsen af afføring.'}
];
export const demo={id:'fordoejelse',title:'Fordøjelsessystemet',semester:1,subject:'Anatomi og fysiologi',description:'Følg maden på vej gennem kroppen, og forbind din viden med mødet med patienten.',steps:[
{title:'Mød din patient',type:'case',text:'Anna er 72 år og indlagt efter en hofteoperation. Hun fortæller, at hun har kvalme, nedsat appetit og ikke har haft afføring i fire dage. Hun har fået opioidholdig smertestillende medicin og bevæger sig mindre end vanligt.\n\nHvilke observationer er relevante? Overvej afføringsmønster, smerter, væskeindtag, ernæring, medicin og mobilitet. Casen er fiktiv og bruges til undervisning.'},
{title:'Fra mund til tarm',type:'text',text:'Fordøjelsen gør madens næringsstoffer tilgængelige for kroppen. Mekanisk bearbejdning og enzymer arbejder sammen hele vejen.\n\nMund: Tænderne findeler maden. Spyt smører, og amylase starter nedbrydningen af stivelse.\n\nSpiserør: Peristaltiske bevægelser transporterer føden til mavesækken.\n\nMavesæk: Syre og pepsin bidrager til nedbrydning af proteiner. Maden blandes og føres videre.\n\nTyndtarm: Enzymer fra bugspytkirtlen og tarmens børstesøm nedbryder næringsstofferne. Galde hjælper med fordøjelsen af fedt. De fleste næringsstoffer optages her.\n\nTyktarm: Vand og elektrolytter optages, og afføring formes.'},
{title:'Lyt: Kulhydratets rejse',type:'podcast',text:'En kort, oplæst gennemgang af kulhydratfordøjelsen. Du kan også læse hele indholdet her.\n\nFordøjelsen af kulhydrater starter i munden, hvor amylase nedbryder stivelse. I mavesækken hæmmer det sure miljø spytamylasens aktivitet. I tyndtarmen fortsætter bugspytkirtlens amylase nedbrydningen. Enzymer i børstesømmen spalter de mindre kulhydrater til monosakkarider, blandt andet glukose. De optages gennem tarmvæggen og transporteres med portåren til leveren. Laktase spalter mælkesukker. Ved laktasemangel kan ufordøjet laktose give oppustethed og diarré.',media:''},
{title:'Test din forståelse',type:'quiz',text:'Fem spørgsmål om fordøjelsessystemet. Du får en forklaring efter hvert svar og kan prøve igen.'},
{title:'Fra viden til sygepleje',type:'reflection',text:'Vend tilbage til Anna. Hvordan kan operation, opioider og nedsat mobilitet påvirke hendes tarmfunktion?\n\n1. Beskriv tre relevante observationer, og begrund dem.\n2. Overvej sygeplejehandlinger vedrørende væske, ernæring, mobilisering og toiletvaner. Tag hensyn til eventuelle restriktioner.\n3. Hvornår vil du inddrage din vejleder eller læge? Overvej blandt andet tiltagende smerter, opkast og udspilet abdomen.\n\nDrøft dine overvejelser med en medstuderende. Brug altid lokale retningslinjer og faglig vejledning i praksis.'}
]};
export function safeURL(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
export function youtubeEmbed(value){const url=safeURL(value);if(!url)return '';const u=new URL(url);let id;if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname))id=u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).at(-1);if(u.hostname==='youtu.be')id=u.pathname.slice(1);return /^[\w-]{11}$/.test(id||'')?'https://www.youtube-nocookie.com/embed/'+id:''}
export function percent(path,completed){return path.steps.length?Math.round(path.steps.filter((_,i)=>completed.includes(i)).length/path.steps.length*100):0}

// Optional on all step types; legacy steps without questions remain valid.
export function validQuestions(questions) {
  if (questions === undefined) return true;
  return Array.isArray(questions) && questions.every(q =>
    q && typeof q.q === 'string' && q.q.trim().length > 0 &&
    typeof q.why === 'string' && q.why.trim().length > 0 &&
    Array.isArray(q.a) && q.a.length >= 2 &&
    q.a.every(a => typeof a === 'string' && a.trim().length > 0) &&
    Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.a.length
  );
}
