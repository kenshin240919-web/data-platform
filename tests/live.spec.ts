import {test,expect} from '@playwright/test';
test('all visible internal links stay in travel site',async({page,request})=>{
  test.setTimeout(60000);
  const checked=new Set<string>();
  for(const route of ['/','/place','/festival','/region','/weekend','/about','/data-policy','/privacy']){
    await page.goto(route);
    await expect(page.locator('header .brand')).toHaveText('🚗여행정보');
    await page.locator('header .brand').click();await expect(page).toHaveURL('http://localhost:3101/');
    await page.goto(route);
    const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLAnchorElement).href));
    for(const href of links){const url=new URL(href);expect(url.port).not.toBe('3100');expect(url.hostname).not.toBe('home.guidejung.com');if(url.origin==='http://localhost:3101'&&!checked.has(href)){checked.add(href);const response=await request.get(href);expect(response.status(),href).toBe(200);}}
  }
});
test('live API, search, details and mobile layout',async({page,request})=>{
  const status=await request.get('http://127.0.0.1:8100/v1/status');
  const data=await status.json();test.skip(data.mode!=='live','실제 데이터 모드 전용 검사');expect(data.place_count).toBeGreaterThan(0);expect(data.festival_count).toBeGreaterThan(0);
  const result=await request.get('http://127.0.0.1:8100/v1/search?kind=place&limit=1');
  const place=(await result.json()).items[0];
  await page.goto('/');await expect(page.locator('.place-card').first()).toBeVisible();
  await page.getByRole('textbox',{name:'지역·장소 검색'}).fill(place.name);await page.getByRole('button',{name:'검색',exact:true}).click();
  await expect(page.getByRole('heading',{name:place.name,exact:true}).first()).toBeVisible();
  await page.locator('.place-card').first().click();await expect(page.getByRole('heading',{name:'방문 전 확인할 정보'})).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
  await page.goto('/festival');await expect(page.locator('.place-card').first()).toBeVisible();
  await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('.place-card').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'runtime/trip-live-mobile.png',fullPage:true});
});

test('photos and facility fields',async({page,request})=>{
  const response=await request.get('http://127.0.0.1:8100/v1/search?limit=50');
  const result=await response.json();test.skip(result.mode!=='live','실제 데이터 검사');
  expect(result.total).toBe(200);
  const item=result.items.find((p:{images?:unknown[]})=>p.images?.length);
  expect(item).toBeTruthy();await page.goto(`/${item.kind}/${item.id}`);
  await expect(page.getByRole('heading',{name:'방문 전 확인할 정보'})).toBeVisible();
  await expect(page.locator('.photo-gallery img').first()).toBeVisible();
  await expect.poll(()=>page.locator('.photo-gallery img').first().evaluate(n=>(n as HTMLImageElement).naturalWidth),{timeout:15000}).toBeGreaterThan(0);
  await page.locator('.photo-gallery img').evaluateAll(async nodes=>{await Promise.all(nodes.map(async node=>{const img=node as HTMLImageElement;img.loading='eager';await img.decode();}));});
  await expect(page.getByText('휴무일',{exact:true})).toBeVisible();await expect(page.getByText('주차',{exact:true})).toBeVisible();
  await page.screenshot({path:'runtime/trip-enriched-detail.png',fullPage:true});
});
