import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../public/model.js';
import {buildCatalog} from '../scripts/catalog.js';
import {bootstrapDocuments,publicPath,makeDocument,validateCatalog,validateDocument,syncCatalog,sameContent} from '../public/publication.js';
const catalog=entries=>({format:'laeringsstier-catalog-v1',entries});
test('current catalogue is valid and bootstrap preserves existing stable content',async()=>{
 await validateCatalog(await buildCatalog());
 const actual=catalog(await bootstrapDocuments()),original=emptyState();await validateCatalog(actual);
 assert.equal(actual.entries.length,original.paths.length);
 for(const p of original.paths)assert.ok(sameContent(p,actual.entries.find(d=>d.path.id===p.id).path));
});
test('publication allowlist never includes student data or browser secrets',()=>{
 const p=emptyState().paths[0];p.notes='private';p.progress={done:[0]};p.publishPassword='not for publishing';p.steps[0].notes='private';p.steps[3].questions[0].studentAnswer='private';
 const clean=JSON.stringify(publicPath(p));assert.ok(!clean.includes('private'));assert.ok(!clean.includes('publishPassword'));assert.ok(!clean.includes('studentAnswer'));
});
test('legacy local changes migrate to drafts, public content becomes authoritative, progress survives unchanged content',async()=>{
 const state=emptyState(),entries=await bootstrapDocuments(),p=state.paths[0];
 state.progress[p.id]={done:[p.steps[0].id],last:p.steps[0].id,answers:{},notes:{[p.steps[4].id]:'Bevar noten'}};
 p.title='Min lokale titel';const local={...structuredClone(p),id:'lokal-sti'};state.paths.push(local);
 const next=syncCatalog(state,catalog(entries));assert.equal(next.drafts[p.id].path.title,'Min lokale titel');assert.ok(next.drafts['lokal-sti']);assert.equal(next.paths.length,3);
 assert.deepEqual(next.progress[p.id],state.progress[p.id]);assert.equal(next.drafts[p.id].baseRevision,entries[0].revision);assert.equal(next.paths.find(x=>x.id===p.id).title,entries[0].path.title);
 assert.deepEqual(syncCatalog(next,catalog(entries)),next);
});
test('changed public content archives old answers and notes; untouched steps and drafts survive',async()=>{
 const entries=await bootstrapDocuments(),state=syncCatalog(emptyState(),catalog(entries)),p=state.paths[0],s=p.steps[3],q=s.questions[0];
 state.progress[p.id]={done:[p.steps[0].id,s.id],last:s.id,answers:{[s.id]:{[q.id]:q.optionIds[q.correct]}},notes:{[s.id]:'Note'}};
 state.drafts[p.id]={path:structuredClone(p),baseRevision:entries[0].revision};
 const edited=structuredClone(p);edited.steps[3].text+=' Nyt fagligt indhold';const update=await makeDocument(edited,'published',entries[0]);entries[0]=update;
 const next=syncCatalog(state,catalog(entries));assert.deepEqual(next.progress[p.id].done,[p.steps[0].id]);assert.equal(next.publication.history[p.id][0].progress.answers[s.id][q.id],q.optionIds[q.correct]);assert.equal(next.progress[p.id].notes[s.id],'Note');assert.equal(next.drafts[p.id].baseRevision,state.drafts[p.id].baseRevision);
});
test('pending content is confirmed only by matching live revision; subsequent draft edits are retained',async()=>{
 const entries=await bootstrapDocuments(),state=syncCatalog(emptyState(),catalog(entries)),p=state.paths[0];
 const updated=await makeDocument({...p,title:'Udgivet titel'},'published',entries[0]);state.drafts[p.id]={path:{...p,title:'Udgivet titel'},baseRevision:entries[0].revision};state.publication.pending[p.id]={revision:updated.revision};
 assert.ok(syncCatalog(state,catalog(entries)).publication.pending[p.id]);
 entries[0]=updated;const published=syncCatalog(state,catalog(entries));assert.equal(published.publication.pending[p.id],undefined);assert.equal(published.drafts[p.id],undefined);
 state.drafts[p.id].path.title='Næste kladde';assert.equal(syncCatalog(state,catalog(entries)).drafts[p.id].path.title,'Næste kladde');
});
test('withdrawals hide the path without deleting progress; malformed or modified documents fail',async()=>{
 const entries=await bootstrapDocuments(),state=syncCatalog(emptyState(),catalog(entries)),p=state.paths[0];state.progress[p.id]={done:[p.steps[0].id],notes:{},answers:{}};
 entries[0]=await makeDocument(p,'withdrawn',entries[0]);const next=syncCatalog(state,catalog(entries));assert.ok(!next.paths.some(x=>x.id===p.id));assert.ok(next.progress[p.id]);assert.ok(next.publication.history[p.id].length);
 const corrupted=structuredClone(entries[0]);corrupted.path.title='Tampered';await assert.rejects(validateDocument(corrupted));await assert.rejects(validateCatalog(catalog([entries[0],entries[0]])));
});
