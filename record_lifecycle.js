
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
      headless: false, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  await page.goto('file:///home/bruno/Downloads/llm_prompt_lifecycle_visualizer%20(5).html');
  await new Promise(r => setTimeout(r, 2000));

  // Architecture view
  await page.evaluate(() => document.getElementById('btnTabArch').click());
  await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => window.scrollBy({ top: document.body.scrollHeight, behavior: 'smooth' }));
  await new Promise(r => setTimeout(r, 2000));

  // Simulator view
  await page.evaluate(() => document.getElementById('btnTabSim').click());
  await new Promise(r => setTimeout(r, 1000));
  
  for (let i = 1; i <= 4; i++) {
     await page.evaluate(() => document.getElementById('btnNext').click());
     await new Promise(r => setTimeout(r, 1000));
     await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
     await new Promise(r => setTimeout(r, 1000));
  }

  await browser.close();
})();
