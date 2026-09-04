const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

(async () => {
  const targetHtml = process.argv[2] || 'index.html';
  const outputMp4 = process.argv[3] || 'presentation.mp4';
  const absPath = path.resolve(targetHtml);
  
  console.log(`Rendering ${absPath} to ${outputMp4}...`);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(`file://${absPath}`, { waitUntil: 'networkidle0' });

  const framesDir = path.join(__dirname, 'frames');
  if (!fs.existsSync(framesDir)){
    fs.mkdirSync(framesDir);
  } else {
    // clean old frames
    fs.readdirSync(framesDir).forEach(f => fs.unlinkSync(path.join(framesDir, f)));
  }

  // Get scroll height
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = 800;
  const maxScroll = Math.max(0, totalHeight - viewportHeight);
  const totalFrames = 300; // ~10 seconds at 30fps

  console.log(`Total scroll height: ${totalHeight}px, recording ${totalFrames} frames...`);

  for (let i = 0; i < totalFrames; i++) {
    const scrollPos = (i / (totalFrames - 1)) * maxScroll;
    await page.evaluate((pos) => window.scrollTo(0, pos), scrollPos);
    // wait brief moment for any lazy load / transitions
    await new Promise(r => setTimeout(r, 30));

    const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
    await page.screenshot({ path: framePath });
  }

  await browser.close();
  console.log('Frames captured. Encoding MP4 with ffmpeg...');

  const cmd = `ffmpeg -y -framerate 30 -i ${path.join(framesDir, 'frame_%04d.png')} -c:v libx264 -pix_fmt yuv420p ${outputMp4}`;
  execSync(cmd, { stdio: 'inherit' });

  console.log(`Successfully generated ${outputMp4}!`);
})();
