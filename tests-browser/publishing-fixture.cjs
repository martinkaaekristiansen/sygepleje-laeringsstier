const TEST_CODE='browser-test-publisher-1937';
async function publishingFixture(context,{autoDeploy=true,initialCatalog}={}) {
 const {makeDocument,bootstrapDocuments}=await import('../public/publication.js');
 let catalog=initialCatalog||{format:'laeringsstier-catalog-v1',entries:await bootstrapDocuments()},head=structuredClone(catalog);
 const requests=[];let nextFailure=null;
 const origin='https://publisher.example.test';
 await context.route('**/publisher-config.json',route=>route.fulfill({json:{endpoint:origin}}));
 await context.route('**/catalog.json',route=>route.fulfill({json:catalog}));
 await context.route(origin+'/**',async route=>{
  const req=route.request(),headers={'Access-Control-Allow-Origin':req.headers().origin||'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Publish-Code'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
  if(req.headers()['x-publish-code']!==TEST_CODE)return route.fulfill({status:401,headers,json:{error:'Udgivelseskoden er forkert.'}});
  if(nextFailure){const status=nextFailure;nextFailure=null;return route.fulfill({status,headers,json:{error:'Midlertidig testfejl. Kladden er bevaret.'}});}
  const body=req.postDataJSON();requests.push(body);
  const before=head.entries.find(d=>d.path.id===body.path.id),status=body.action==='withdraw'?'withdrawn':'published';
  const doc=await makeDocument(status==='withdrawn'&&before?before.path:body.path,status,before);
  if(before?.revision!==doc.revision&&(before?.revision||null)!==body.baseRevision)return route.fulfill({status:409,headers,json:{error:'Der findes en nyere udgave. Kladden er bevaret.'}});
  head.entries=head.entries.filter(d=>d.path.id!==doc.path.id);head.entries.push(doc);if(autoDeploy)catalog=structuredClone(head);
  await route.fulfill({status:202,headers,json:{state:'accepted',revision:doc.revision,commit:'a'.repeat(40),actionsUrl:'https://github.com/martinkaaekristiansen/sygepleje-laeringsstier/actions/workflows/pages.yml'}});
 });
 return {requests,deploy(){catalog=structuredClone(head);},failNext(status){nextFailure=status;},catalog:()=>structuredClone(catalog),async update(path){const before=head.entries.find(d=>d.path.id===path.id);const doc=await makeDocument(path,'published',before);head.entries=head.entries.filter(d=>d.path.id!==path.id);head.entries.push(doc);catalog=structuredClone(head);return doc;}};
}
async function approvePublication(page) {
 await page.locator('#publish-code').fill(TEST_CODE);await page.locator('#publish-consent').check();await page.locator('#publish-form button[type=submit]').click();await page.locator('#publish-dialog').waitFor({state:'detached'});await page.locator('.teacher-list').waitFor();
}
async function refresh(page) {await page.locator('[data-action=refresh-publications]').click();await page.waitForFunction(()=>!document.querySelector('main')?.textContent.includes('Afventer udgivelse'));}
async function publishCurrent(page) {await page.locator('[data-action=publish]').click();await approvePublication(page);await refresh(page);}
async function withdraw(page,id) {await page.locator(`[data-withdraw="${id}"]`).click();await approvePublication(page);await refresh(page);}
module.exports={publishingFixture,publishCurrent,withdraw,approvePublication,refresh,TEST_CODE};
