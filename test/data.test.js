import test from 'node:test';
import assert from 'node:assert/strict';
import {safeURL,youtubeEmbed,percent,demo,questions} from '../public/data.js';
test('medielinks afviser scripts og ukendte YouTube-domæner',()=>{assert.equal(safeURL('javascript:alert(1)'),'');assert.equal(youtubeEmbed('https://evil.example/watch?v=dQw4w9WgXcQ'),'');assert.equal(youtubeEmbed('https://youtu.be/dQw4w9WgXcQ'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')});
test('progression tæller kun eksisterende gennemførte trin',()=>{assert.equal(percent(demo,[0,1]),40);assert.equal(percent(demo,[0,1,2,3,4,9]),100);assert.equal(percent({steps:[]},[]),0)});
test('demo har fem trin og fem gyldige quizspørgsmål',()=>{assert.equal(demo.steps.length,5);assert.equal(questions.length,5);for(const q of questions){assert.ok(q.a[q.correct]);assert.ok(q.why)}});
