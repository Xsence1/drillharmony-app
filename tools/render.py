import sys, asyncio
from playwright.async_api import async_playwright
# render.py file.html?query out.png w h
async def main():
    src,out,w,h=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4])
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':w,'height':h})
        pg.on('pageerror', lambda e: print('ERR',e))
        await pg.goto('file://'+src); await pg.wait_for_function("document.title==='done'",timeout=120000)
        await pg.locator('canvas').screenshot(path=out); await b.close()
asyncio.run(main())
