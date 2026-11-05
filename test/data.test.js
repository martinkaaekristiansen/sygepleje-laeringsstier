import test from 'node:test';
import assert from 'node:assert/strict';
import {safeURL,youtubeEmbed,percent} from '../public/data.js';
test('medielinks afviser scripts og ukendte YouTube-domæner',()=>{assert.equal(safeURL('javascript:alert(1)'),'');assert.equal(youtubeEmbed('https://evil.example/watch?v=dQw4w9WgXcQ'),'');assert.equal(youtubeEmbed('https://youtu.be/dQw4w9WgXcQ'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')});
const demo={steps:Array.from({length:5},()=>({}))};
const questions=[{q:'Et testspørgsmål',a:['A','B'],correct:0,why:'En forklaring'}];
test('progression tæller kun eksisterende gennemførte trin',()=>{assert.equal(percent(demo,[0,1]),40);assert.equal(percent(demo,[0,1,2,3,4,9]),100);assert.equal(percent({steps:[]},[]),0)});

test('spørgsmål er valgfrie og valideres på tværs af trintyper', async()=>{
 const {validQuestions}=await import('../public/data.js');
 assert.equal(validQuestions(undefined),true);
 assert.equal(validQuestions([]),true);
 assert.equal(validQuestions(questions),true);
 assert.equal(validQuestions(null),false);
 assert.equal(validQuestions([{...questions[0],correct:99}]),false);
 assert.equal(validQuestions([{...questions[0],a:['','B']}]),false);
 assert.equal(validQuestions([{...questions[0],why:'   '}]),false);
});
