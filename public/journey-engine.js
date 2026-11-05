// Pure state transitions: no DOM, Canvas, timers or storage. Reusable for other routes.
export function newJourney(route,random=Math.random) {
 const count=route.steps.length-1;
 const sides=Array.from({length:count},()=>random()<0.5?0:1);
 // No fixed-side strategy can complete a circuit, including with one spare life.
 if(count>=4){const minority=sides.filter(s=>s===0).length;if(minority<2){sides[0]=0;sides[count-1]=0;}if(minority>count-2){sides[0]=1;sides[count-1]=1;}}
 return {level:route.id,index:0,lives:2,errors:0,correct:0,sides,phase:'choice',lastSide:null};
}
export function passages(route,run) {
 if(run.index>=route.choices.length)return [];
 const choice=route.choices[run.index],next=route.steps[run.index+1];
 const good={name:next.name,correct:true,structure:next};
 const bad={...choice.wrong,correct:false};
 return run.sides[run.index]===0?[good,bad]:[bad,good];
}
export function choosePassage(route,run,side) {
 if(run.phase!=='choice'||![0,1].includes(side))return run;
 const options=passages(route,run);if(!options.length)return run;
 if(options[side].correct)return {...run,index:run.index+1,correct:run.correct+1,phase:run.index+1===route.steps.length-1?'won':'arrival',lastSide:side};
 return {...run,lives:run.lives-1,errors:run.errors+1,phase:run.lives===1?'lost':'feedback',lastSide:side};
}
export function continueJourney(run) {return ['arrival','feedback'].includes(run.phase)?{...run,phase:'choice',lastSide:null}:run;}
export const emptyStats=()=>({completed:false,attempts:0,best:0,lastCompleted:null});
export function startAttempt(stats) {return {...emptyStats(),...stats,attempts:(stats?.attempts||0)+1};}
export function scoreJourney(route,run) {return Math.round(100*run.correct/route.choices.length);}
export function recordResult(stats,route,run,date=new Date().toISOString()) {
 return {...emptyStats(),...stats,best:Math.max(stats?.best||0,scoreJourney(route,run)),completed:Boolean(stats?.completed||run.phase==='won'),lastCompleted:run.phase==='won'?date:stats?.lastCompleted||null};
}
export function validJourney(route,run) {
 return Boolean(run&&run.level===route.id&&Number.isInteger(run.index)&&run.index>=0&&run.index<route.steps.length&&run.correct===run.index&&Number.isInteger(run.lives)&&run.lives>=0&&run.lives<=2&&run.errors===2-run.lives&&Array.isArray(run.sides)&&run.sides.length===route.choices.length&&run.sides.every(s=>s===0||s===1)&&['choice','arrival','feedback','won','lost'].includes(run.phase)&&
 (run.phase==='won'?run.index===route.steps.length-1&&run.lives>0:run.index<route.steps.length-1)&&
 (run.phase==='lost'?run.lives===0:run.lives>0));
}
