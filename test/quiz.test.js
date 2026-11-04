import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseAnswer,optionExplanation,renderQuiz} from '../public/quiz.js';
import {validQuestions} from '../public/data.js';
import {emptyState,commitPath} from '../public/model.js';
const question={q:'Hvilket tal er lige?',a:['3','4','5'],correct:1,why:'Et lige tal kan deles med 2 uden rest.'};
test('wrong choices can change until correct; correct choices only inspect alternatives',()=>{
  assert.deepEqual(chooseAnswer(question,undefined,0),{answer:0});
  assert.deepEqual(chooseAnswer(question,0,2),{answer:2});
  assert.deepEqual(chooseAnswer(question,2,1),{answer:1});
  assert.deepEqual(chooseAnswer(question,1,0),{answer:1,inspected:0});
  assert.deepEqual(chooseAnswer(question,1,2),{answer:1,inspected:2});
  assert.deepEqual(chooseAnswer(question,1,1),{answer:1,inspected:undefined});
  assert.deepEqual(chooseAnswer(question,undefined,2),{answer:2});
});
test('choice-specific explanations fall back to existing reasoning, with validation',()=>{
  const q={...question,explanations:['3 giver en rest på 1.','','5 giver en rest på 1.']};
  assert.equal(optionExplanation(q,0),q.explanations[0]);assert.equal(optionExplanation(q,1),q.why);assert.equal(optionExplanation(question,2),question.why);
  assert.ok(validQuestions([q]));assert.ok(!validQuestions([{...q,explanations:['kun én']}])) ;assert.ok(!validQuestions([{...q,explanations:[null,'','']}])) ;
});
test('inspection keeps correct marking and score and safely renders feedback',()=>{
  const q={...question,explanations:['<script>test</script>','','']};
  const html=renderQuiz([q],{0:1},{0:0});
  assert.match(html,/1 af 1 korrekte/);assert.match(html,/Hvorfor er svar A forkert/);assert.ok(html.includes('&lt;script&gt;test&lt;/script&gt;'));assert.ok(!html.includes('disabled'));assert.match(html,/data-answer="0:1" aria-pressed="true"/);
});
test('adding explanations does not discard a saved correct answer or completion',()=>{
  const state=emptyState(),p=state.paths[1],s=p.steps[0],q=s.questions[0];
  state.progress[p.id]={done:[s.id],last:s.id,notes:{},answers:{[s.id]:{[q.id]:q.optionIds[q.correct]}}};
  const edited=structuredClone(p);edited.steps[0].questions[0].explanations=q.a.map(()=> 'En uddybning.');
  assert.deepEqual(commitPath(state,edited).progress,state.progress);
});
