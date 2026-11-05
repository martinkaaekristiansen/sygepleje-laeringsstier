export const subjects=['Alle fagområder','Anatomi og fysiologi','Sygdomslære','Sygepleje','Farmakologi','Mikrobiologi'];
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
    (q.explanations === undefined || (Array.isArray(q.explanations) && q.explanations.length === q.a.length && q.explanations.every(e => typeof e === 'string'))) &&
    Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.a.length
  );
}
