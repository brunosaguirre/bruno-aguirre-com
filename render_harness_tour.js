const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

(async () => {
  const targetHtml = 'hermes_agent_harness_architecture.html';
  const outputMp4 = 'harness_node_tour.mp4';
  const absPath = path.resolve(targetHtml);
  
  console.log(`Rendering node tour video from ${absPath} to ${outputMp4}...`);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  await page.goto(`file://${absPath}`, { waitUntil: 'networkidle0' });

  // Wait for page load and switch to diagram tab
  await new Promise(r => setTimeout(r, 1500));
  
  await page.evaluate(() => {
    if (typeof switchTab === 'function') switchTab('diagram');
  });
  await new Promise(r => setTimeout(r, 1000));

  const framesDir = path.join(__dirname, 'tour_frames');
  if (!fs.existsSync(framesDir)){
    fs.mkdirSync(framesDir);
  } else {
    fs.readdirSync(framesDir).forEach(f => fs.unlinkSync(path.join(framesDir, f)));
  }

  const nodeIds = ['node-parser', 'node-reasoner', 'node-tools', 'node-synthesizer', 'node-evaluator', 'edge-judge-conditional'];
  let globalFrameCount = 0;
  const fps = 30;

  for (let idx = 0; idx < nodeIds.length; idx++) {
    const nodeId = nodeIds[idx];
    console.log(`Navigating to node: ${nodeId}`);

    // Scroll node into view and click
    await page.evaluate((id) => {
      const el = document.querySelector(`[data-node-id="${id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        el.click();
      }
    }, nodeId);

    // Wait 2 seconds (60 frames) per node for inspection and animation
    const waitFrames = fps * 2;
    for (let f = 0; f < waitFrames; f++) {
      const framePath = path.join(framesDir, `frame_${String(globalFrameCount).padStart(4, '0')}.png`);
      await page.screenshot({ path: framePath });
      globalFrameCount++;
      await new Promise(r => setTimeout(r, 1000 / fps));
    }
  }

  await browser.close();
  console.log(`Captured ${globalFrameCount} frames. Encoding MP4 with ffmpeg...`);

  const cmd = `ffmpeg -y -framerate ${fps} -i ${path.join(framesDir, 'frame_%04d.png')} -c:v libx264 -pix_fmt yuv420p ${outputMp4}`;
  execSync(cmd, { stdio: 'inherit' });

  console.log(`Successfully generated ${outputMp4}!`);
})();
