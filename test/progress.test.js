import test from 'node:test';
import assert from 'node:assert/strict';
import {getPathProgress,getInProgressPaths} from '../public/progress.js';
const path=(id,total=5)=>({id,steps:Array.from({length:total},(_,i)=>({title:`Trin ${i+1}`}))});
test('overview includes newly opened and legacy unfinished paths but not untouched, completed, deleted or empty paths',()=>{
 const paths=[path('untouched'),path('opened'),path('legacy'),path('complete'),path('empty',0)];
 const progress={opened:{started:true,last:0,done:[],updatedAt:20},legacy:{last:2,done:[0,1]},complete:{done:[0,1,2,3,4]},deleted:{done:[0]},empty:{started:true}};
 const result=getInProgressPaths(paths,progress);
 assert.deepEqual(result.map(p=>p.path.id),['opened','legacy']);
 assert.equal(result[0].percent,0);assert.equal(result[1].percent,40);assert.equal(result[1].lastIndex,2);
});
test('completed-step counts tolerate duplicates and obsolete step indices',()=>{
 const result=getPathProgress(path('test'),{done:[0,0,1,-1,8,'2'],last:99});
 assert.equal(result.completed,2);assert.equal(result.percent,40);assert.equal(result.lastIndex,4);
 assert.equal(getPathProgress(path('test'),{last:-1}).lastIndex,0);
 assert.equal(getPathProgress(path('test'),{done:'invalid'}).completed,0);
});
test('sorts by most recent activity across paths and preserves legacy ordering without timestamps',()=>{
 const paths=[path('a'),path('b'),path('c')];
 assert.deepEqual(getInProgressPaths(paths,{a:{last:0},b:{last:1,updatedAt:4},c:{last:2,updatedAt:9}}).map(p=>p.path.id),['c','b','a']);
 assert.deepEqual(getInProgressPaths(paths,{a:{last:0},b:{last:1},c:{last:2}}).map(p=>p.path.id),['a','b','c']);
});
test('notes from previous versions count as started; incomplete paths never display 100%',()=>{
 assert.equal(getPathProgress(path('a'),{notes:{0:'En refleksion'}}).started,true);
 assert.equal(getPathProgress(path('a'),{notes:{0:'   '}}).started,false);
 const result=getPathProgress(path('long',300),{done:Array.from({length:299},(_,i)=>i)});
 assert.equal(result.complete,false);assert.equal(result.percent,99);
});
