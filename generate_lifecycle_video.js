const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

(async () => {
  const targetHtml = '/home/bruno/Downloads/llm_prompt_lifecycle_visualizer (5).html';
  const outputMp4 = '/home/bruno/Projects/business/bruno-aguirre.com/llm_prompt_lifecycle.mp4';
  const absPath = path.resolve(targetHtml);
  const fps = 30;

  console.log(`Rendering video from ${absPath} -> ${outputMp4}`);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  await page.goto(`file://${absPath}`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  const framesDir = path.join(__dirname, 'tmp_lifecycle_frames');
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });
  else fs.readdirSync(framesDir).forEach(f => fs.unlinkSync(path.join(framesDir, f)));

  let frameCount = 0;

  const captureFrames = async (seconds) => {
    const totalFrames = fps * seconds;
    for (let i = 0; i < totalFrames; i++) {
      await page.screenshot({ path: path.join(framesDir, `frame_${String(frameCount).padStart(5, '0')}.png`) });
      frameCount++;
      await new Promise(r => setTimeout(r, 1000 / fps));
    }
  };

  const smoothScrollTo = async (targetY, durationSec) => {
    const steps = fps * durationSec;
    const startY = await page.evaluate(() => window.pageYOffset);
    const distance = targetY - startY;
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      // Ease in-out cubic
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const currentY = startY + distance * ease;
      await page.evaluate((y) => window.scrollTo(0, y), currentY);
      await page.screenshot({ path: path.join(framesDir, `frame_${String(frameCount).padStart(5, '0')}.png`) });
      frameCount++;
      await new Promise(r => setTimeout(r, 1000 / fps));
    }
  };

  // 1. Initial fully loaded page view
  console.log('Capturing initial loaded page...');
  await captureFrames(2);

  // 2. Section 1: Architecture Tab -> smooth downscroll to end
  console.log('Navigating to Architecture tab & scrolling down...');
  await page.evaluate(() => switchMainTab('arch'));
  await captureFrames(1);

  const archHeight = await page.evaluate(() => document.body.scrollHeight);
  await smoothScrollTo(archHeight - 720, 5);
  await captureFrames(1.5);

  // Scroll back to top smoothly
  await smoothScrollTo(0, 1.5);

  // 3. Live Payload Simulator Tab
  console.log('Navigating to Simulator tab...');
  await page.evaluate(() => switchMainTab('sim'));
  await captureFrames(1.5);

  // Turns 1 to 4
  for (let turnIdx = 0; turnIdx < 4; turnIdx++) {
    console.log(`Simulating Turn ${turnIdx + 1}...`);
    await page.evaluate((idx) => goToExchange(idx), turnIdx);
    await captureFrames(1.5); // pause to read top summary

    // Scroll down simulator payload container
    await smoothScrollTo(400, 2);
    await captureFrames(1.5);

    // Scroll back up for next turn
    await smoothScrollTo(0, 1);
  }

  // Final hold
  await captureFrames(2);

  await browser.close();
  console.log(`Captured ${frameCount} total frames. Encoding MP4 with ffmpeg...`);

  const cmd = `ffmpeg -y -framerate ${fps} -i ${path.join(framesDir, 'frame_%05d.png')} -c:v libx264 -pix_fmt yuv420p ${outputMp4}`;
  execSync(cmd, { stdio: 'inherit' });

  console.log(`Successfully generated video at ${outputMp4}`);
})();
