const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

(async () => {
  const targetHtml = 'hermes_agentic_architecture_loop_specification.html';
  const outputMp4 = 'spec_workflow.mp4';
  const absPath = path.resolve(targetHtml);
  
  console.log(`Rendering workflow animation from ${absPath} to ${outputMp4}...`);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  await page.goto(`file://${absPath}`, { waitUntil: 'networkidle0' });

  // Wait for React app to mount
  await new Promise(r => setTimeout(r, 2000));

  // Click on the Sequence / Process Flow tab or start the Auto Step Trace button if available
  await page.evaluate(() => {
    // Find sequence tab or play button
    const buttons = Array.from(document.querySelectorAll('button'));
    const seqBtn = buttons.find(b => b.textContent.includes('Sequence') || b.textContent.includes('Process Flow') || b.textContent.includes('2. Process Flow'));
    if (seqBtn) seqBtn.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  // Trigger auto step trace / play animation
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const playBtn = buttons.find(b => b.textContent.includes('Auto Step Trace') || b.textContent.includes('Step Trace'));
    if (playBtn) playBtn.click();
  });

  const framesDir = path.join(__dirname, 'spec_frames');
  if (!fs.existsSync(framesDir)){
    fs.mkdirSync(framesDir);
  } else {
    fs.readdirSync(framesDir).forEach(f => fs.unlinkSync(path.join(framesDir, f)));
  }

  const totalFrames = 300; // 10 seconds at 30 fps
  console.log(`Recording ${totalFrames} frames while navigating workflow...`);

  for (let i = 0; i < totalFrames; i++) {
    // Every 45 frames (~1.5s), click Next Step if auto-play wasn't active or to advance step
    if (i % 45 === 0 && i > 0) {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const nextBtn = buttons.find(b => b.textContent.includes('Next Step'));
        if (nextBtn && !nextBtn.disabled) {
          nextBtn.click();
        }
      });
    }

    const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
    await page.screenshot({ path: framePath });
    await new Promise(r => setTimeout(r, 33));
  }

  await browser.close();
  console.log('Frames captured. Encoding MP4 with ffmpeg...');

  const cmd = `ffmpeg -y -framerate 30 -i ${path.join(framesDir, 'frame_%04d.png')} -c:v libx264 -pix_fmt yuv420p ${outputMp4}`;
  execSync(cmd, { stdio: 'inherit' });

  console.log(`Successfully generated ${outputMp4}!`);
})();
