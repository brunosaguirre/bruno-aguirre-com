const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

(async () => {
  const targetHtml = 'inside_an_llm_interactive_visual_journey.html';
  const outputMp4 = 'llm_journey.mp4';
  const absPath = path.resolve(targetHtml);
  
  console.log(`Rendering animated diagram from ${absPath} to ${outputMp4}...`);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(`file://${absPath}`, { waitUntil: 'networkidle0' });

  // Scroll to #pipeline section
  await page.evaluate(() => {
    const el = document.getElementById('pipeline');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  });

  // Wait for animation to settle into view
  await new Promise(r => setTimeout(r, 1000));

  const framesDir = path.join(__dirname, 'llm_frames');
  if (!fs.existsSync(framesDir)){
    fs.mkdirSync(framesDir);
  } else {
    fs.readdirSync(framesDir).forEach(f => fs.unlinkSync(path.join(framesDir, f)));
  }

  const totalFrames = 300; // 10 seconds at 30 fps
  console.log(`Recording ${totalFrames} frames of animated diagram...`);

  for (let i = 0; i < totalFrames; i++) {
    const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
    await page.screenshot({ path: framePath });
    // ~33ms per frame for 30fps timing + CSS animation tick
    await new Promise(r => setTimeout(r, 33));
  }

  await browser.close();
  console.log('Frames captured. Encoding MP4 with ffmpeg...');

  const cmd = `ffmpeg -y -framerate 30 -i ${path.join(framesDir, 'frame_%04d.png')} -c:v libx264 -pix_fmt yuv420p ${outputMp4}`;
  execSync(cmd, { stdio: 'inherit' });

  console.log(`Successfully generated ${outputMp4}!`);
})();
