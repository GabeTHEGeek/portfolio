// Run with `node scripts/test-cms-ordering.mjs` where Playwright is available.
// PLAYWRIGHT_MODULE can point to an existing Playwright installation.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture = `<!doctype html><html><head><link rel="stylesheet" href="/admin/ordering.css"></head><body>
<div id="nc-root"><h1>Projects</h1><ul id="cards"></ul></div>
<script src="/yaml.js"></script><script>
const records = [
 {file:{path:'src/content/projects/alpha.md'},data:'---\\ntitle: Alpha\\nslug: alpha\\norder: 1\\npublishDate: 2026-09-01\\n---\\nBody'},
 {file:{path:'src/content/projects/beta.md'},data:'---\\ntitle: Beta\\nslug: beta\\norder: 2\\npublishDate: 2026-09-01\\n---\\nBody'},
 {file:{path:'src/content/projects/new.md'},data:'---\\ntitle: Newly published\\nslug: new\\npublishDate: 2026-09-01\\n---\\nBody'}];
window.writes=[]; window.fail=false;
const backend={repo:'test/portfolio',branch:'main',entriesByFolder:async()=>records,allEntriesByFolder:async()=>records,
 api:{request:async(path,options={})=>{if(options.method==='PUT'){if(window.fail)throw Error('Conflict');window.writes.push(JSON.parse(options.body));return {content:{sha:'saved-sha'}};}
 return {sha:'initial-sha',content:btoa(JSON.stringify({entries:[{entry:'alpha'},{entry:'beta'}]}))};}}};
window.CMS={getBackend:()=>({init:()=>backend}),registerBackend:(name,Adapter)=>{window.adapter=new Adapter({},{});}};
window.nativeCards=(name,ids=['alpha','beta','new'])=>{document.querySelector('#cards').innerHTML=ids.map(id=>'<li><a href="#/collections/'+name+'/entries/'+id+'">'+id+'</a></li>').join('');};
</script><script src="/admin/ordering.js"></script>
<script>location.hash='/collections/projects';nativeCards('projects');window.ready=adapter.entriesByFolder('src/content/projects','md',1);</script>
</body></html>`;
const realFixture = fixture
  .replace('<div id="nc-root"><h1>Projects</h1><ul id="cards"></ul></div>', '<script>window.CMS_MANUAL_INIT=true;</script><script src="https://unpkg.com/decap-cms@3.16.0/dist/decap-cms.js"></script>')
  .replace("window.CMS={getBackend:()=>({init:()=>backend}),registerBackend:(name,Adapter)=>{window.adapter=new Adapter({},{});}};", `Object.assign(backend, {
    authComponent:()=>props=>h('button',{onClick:()=>props.onLogin({name:'Test editor',login:'test'})},'Test login'),
    authenticate:async user=>user, restoreUser:async user=>user, logout:()=>{},
    isGitBackend:()=>true, getMedia:async()=>[], getToken:async()=>'',
    status:async()=>({auth:{status:true},api:{status:true}}),
    getEntry:async path=>records.find(r=>r.file.path===path)
  }); CMS.getBackend('github').init=()=>backend;`)
  .replace("location.hash='/collections/projects';nativeCards('projects');window.ready=adapter.entriesByFolder('src/content/projects','md',1);", `location.hash='/collections/projects';CMS.init({config:{load_config_file:false,backend:{name:'portfolio-github',repo:'test/portfolio',branch:'main'},media_folder:'media',collections:[{name:'projects',label:'Projects',folder:'src/content/projects',create:true,sortable_fields:[],fields:[{name:'title',widget:'string'},{name:'slug',widget:'string'},{name:'body',widget:'markdown'}]}]}});`);
const server = createServer(async (req,res) => {
  const files = {'/admin/ordering.js':'public/admin/ordering.js','/admin/ordering.css':'public/admin/ordering.css','/yaml.js':'node_modules/js-yaml/dist/js-yaml.min.js'};
  res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':req.url.endsWith('.css')?'text/css':'text/html');
  res.end(files[req.url] ? await readFile(files[req.url]) : process.env.REAL_CMS ? realFixture : fixture);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await chromium.launch({headless:true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome'});
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  if (process.env.REAL_CMS) {
    await page.getByRole('button',{name:'Test login'}).click();
    await page.waitForSelector('.portfolio-order-row');
    assert.deepEqual(await page.locator('.portfolio-order-row a').allTextContents(),['Alpha','Beta','Newly published']);
    await page.getByRole('button',{name:'Move Beta up',exact:true}).click();
    await page.getByRole('button',{name:'Publish order',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Order published.'}).waitFor();
    await page.locator('.portfolio-order-row a').first().click();
    await page.waitForFunction(()=>!document.querySelector('.portfolio-order'));
    assert.match(page.url(),/entries\/beta/);
    assert.deepEqual(errors,[]);
    console.log('PASS: real pinned Decap login, collection markup, inline ordering, publish and editor navigation (mock repository only).');
    process.exitCode=0;
  } else {
  await page.waitForSelector('.portfolio-order-row');
  const titles=()=>page.locator('.portfolio-order-row a').allTextContents();
  assert.deepEqual(await titles(),['Alpha','Beta','Newly published']);
  assert.equal(await page.getByRole('button',{name:'Move Alpha up',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Move Beta up',exact:true}).click();
  assert.deepEqual(await titles(),['Beta','Alpha','Newly published']);
  assert.match(await page.locator(':focus').getAttribute('aria-label'),/Move Beta down/);
  await page.getByRole('button',{name:'Publish order',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Order published.'}).waitFor();
  const writes=await page.evaluate(()=>window.writes);
  assert.equal(writes.length,1);
  assert.equal(writes[0].sha,'initial-sha');
  assert.deepEqual(JSON.parse(Buffer.from(writes[0].content,'base64').toString()).entries,[{entry:'beta'},{entry:'alpha'},{entry:'new'}]);
  await page.getByRole('button',{name:'Move Alpha up',exact:true}).click();
  await page.evaluate(()=>window.fail=true);
  await page.getByRole('button',{name:'Publish order',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Order was not saved.'}).waitFor();
  assert.deepEqual(await titles(),['Alpha','Beta','Newly published']);
  await page.getByRole('button',{name:'Discard changes',exact:true}).click();
  assert.deepEqual(await titles(),['Beta','Alpha','Newly published']);
  await page.evaluate(()=>nativeCards('projects',['beta']));
  await page.waitForFunction(()=>document.querySelectorAll('.portfolio-order-row').length===1);
  assert.equal(await page.getByRole('button',{name:'Move Beta down',exact:true}).isDisabled(),true);
  await page.evaluate(()=>nativeCards('projects'));
  await page.waitForFunction(()=>document.querySelectorAll('.portfolio-order-row').length===3);
  await page.locator('.portfolio-order-row a').first().click();
  await page.waitForFunction(()=>!document.querySelector('.portfolio-order'));
  assert.match(page.url(),/entries\/beta/);
  assert.equal(await page.locator('#cards').isVisible(),true);
  await page.evaluate(async()=>{location.hash='/collections/writing';nativeCards('writing');await adapter.entriesByFolder('src/content/writing','md',1);});
  await page.waitForSelector('.portfolio-order-row');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.getByRole('button',{name:'Move Beta up',exact:true}).focus();
  await page.keyboard.press('Enter');
  assert.deepEqual(await titles(),['Beta','Alpha','Newly published']);
  assert.deepEqual(errors,[]);
  console.log('PASS: native list integration, new entries, up/down, focus, publish, conflict, discard, filters, editor navigation, writing and mobile.');
  }
} finally {
  await browser?.close();
  server.close();
}
