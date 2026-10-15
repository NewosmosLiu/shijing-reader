const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../app/src/main/assets');
(async()=>{
 const executablePath=process.env.CHROME_PATH||(process.platform==='win32'&&fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined);
 const browser=await chromium.launch({executablePath,headless:true});
 try{
  const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://app.shijing.local/**',route=>{
   const u=new URL(route.request().url());
   if(u.pathname.startsWith('/pdf-page/'))return route.fulfill({body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'),contentType:'image/png'});
   const file=path.join(root,decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
   if(!file.startsWith(root))return route.abort();
   return route.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8'});
  });
  await page.goto('https://app.shijing.local/index.html');
  assert.equal(await page.locator('[data-nav="home"]').textContent(),'诗三百');
  for(const width of [320,393,760]){
   await page.setViewportSize({width,height:852});
   const [title,authors]=await Promise.all([page.locator('.brand-copy>strong').boundingBox(),page.locator('.brand-authors').boundingBox()]);
   assert(Math.abs(title.x-authors.x)<.5);assert(Math.abs(title.width-authors.width)<.5);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.setViewportSize({width:393,height:852});
  const cdp=await page.context().newCDPSession(page);
  // Real touch input outside the PDF must leave the visual viewport at scale 1.
  async function touches(type,points){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y,radiusX:4,radiusY:4,force:1}))});}
  await touches('touchStart',[[0,150,300],[1,230,300]]);
  await touches('touchMove',[[0,90,300],[1,290,300]]);
  await touches('touchEnd',[]);
  assert(Math.abs(await page.evaluate(()=>visualViewport.scale)-1)<.01);
  const version=await page.evaluate(()=>APP_VERSION);
  const native=fs.readFileSync(path.join(root,'../java/cn/shijing/reader/MainActivity.java'),'utf8');
  assert(native.includes('setSupportZoom(false)')&&native.includes('setBuiltInZoomControls(false)'));
  assert((await page.locator('meta[name="viewport"]').getAttribute('content')).includes('maximum-scale=1'));
  // Inject long notes so the invariant is tested even against the public sample corpus.
  await page.evaluate(()=>{BOOK.poems[0].stanzas[0].notes=('注释对照测试：原句应保持可见，只有注析正文滚动。\n').repeat(100);openPoem('p001');note(0,0);});
  const quote=await page.locator('.note-reference .quote').boundingBox();
  const header=await page.locator('.sheet-header').boundingBox();
  for(const night of [false,true]){
   await page.evaluate(value=>{state.night=value;theme();document.querySelector('.note-scroll').scrollTop=10000;},night);
   const after=await page.locator('.note-reference .quote').boundingBox();
   assert(Math.abs(quote.y-after.y)<.5);assert(after.y>=header.y+header.height);
   assert(await page.locator('.note-scroll').evaluate(e=>e.scrollTop>100));
   assert(await page.locator('.note-scroll').evaluate(e=>e.getBoundingClientRect().top>=document.querySelector('.note-reference').getBoundingClientRect().bottom-1));
   assert(await page.locator('[data-action="close"]').isVisible());
  }
  fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});
  await page.screenshot({path:path.join(__dirname,'artifacts/pinned-annotation.png')});
  await page.locator('[data-action="close"]').click();
  await page.locator('.reader-head [data-action="source"]').click();
  await page.waitForFunction(()=>document.querySelector('#pdf-image')?.naturalWidth>0);
  const frame=await page.locator('.source-scan').boundingBox();
  const y=frame.y+Math.min(frame.height/2,100),center=frame.x+frame.width/2;
  const before=await page.locator('#pdf-image').boundingBox();
  await touches('touchStart',[[0,center-35,y],[1,center+35,y]]);
  await touches('touchMove',[[0,center-80,y],[1,center+80,y]]);
  await touches('touchEnd',[]);
  const after=await page.locator('#pdf-image').boundingBox();
  assert(after.width>before.width*1.7,'pinch must enlarge only the PDF image');
  assert(Math.abs(await page.evaluate(()=>visualViewport.scale)-1)<.01);
  const zoom=Number(await page.locator('.source-scan').getAttribute('data-zoom'));
  assert(zoom>1.7&&zoom<=4);
  await touches('touchStart',[[0,center,y]]);
  await touches('touchMove',[[0,center-60,y-50]]);
  await touches('touchEnd',[]);
  assert(await page.locator('.source-scan').evaluate(e=>e.scrollLeft>0||e.scrollTop>0));
  await page.locator('[data-action="zoom-scan"]').click();
  assert.equal(await page.locator('.source-scan').getAttribute('data-zoom'),'1.000');
  await page.locator('[data-action="close"]').click();
  assert.equal(await page.locator('.scrim').count(),0);
  assert(Math.abs(await page.evaluate(()=>visualViewport.scale)-1)<.01);
  assert.deepEqual(errors,[]);
  console.log('PASS '+version+': aligned branding, fixed app scale, pinned quote with long notes, PDF-only touch pinch/pan/reset.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
