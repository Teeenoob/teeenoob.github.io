//noise stuff
const CONFIG = {
  NOISE_W: 1920 / 2,
  NOISE_H: 1080 / 2,
  ov: { speed: 0.022, whiteness: 0.0 },
  fpsCap: 10,
  noiseUpdateMs: 80
};

(function () {
  const ovCanvas = document.getElementById('noise-ov');
  if (!ovCanvas) return;
  const ovCtx = ovCanvas.getContext('2d', { alpha: true });
  if (!ovCtx) return;

  const img = document.getElementById('sceneImage');
  const nowText = document.getElementById('NowEveryoneCanBeHappy');
  const ambient = document.getElementById('ambient');
  const ovOff = document.createElement('canvas');
  const ovOffCtx = ovOff.getContext('2d');
  if (!ovOffCtx) return;
  ovOff.width = CONFIG.NOISE_W;
  ovOff.height = CONFIG.NOISE_H;
  ovOffCtx.imageSmoothingEnabled = false;
  ovCtx.imageSmoothingEnabled = false;

  let seed = Math.random() * 10000;
  let lastTime = performance.now();
  let rafId = null;
  let lastDraw = 0;
  const msPerFrame = 1000 / CONFIG.fpsCap;
  let lastNoiseUpdate = 0;

  function pseudoRandom(x, y, s) {
    const v = Math.sin(x * 127.1 + y * 311.7 + s * 13.37) * 43758.5453123;
    return v - Math.floor(v);
  }
  function fillNoiseTo(offCtx, w, h, s, freq = 1.0, whiteness = 0.0) {
    const imgData = offCtx.createImageData(w, h);
    const data = imgData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const n1 = pseudoRandom(x * 0.85 * freq, y * 0.85 * freq, s);
        const n2 = pseudoRandom(x * 2.4 * freq, y * 2.4 * freq, s + 57.3);
        const r = (n1 * 0.6 + n2 * 0.4); // r in [0,1]
        let gray = Math.round(r * 255);
        if (whiteness > 0) {
          gray = Math.round(gray * (1 - whiteness) + 255 * whiteness);
        }
        gray = Math.max(0, Math.min(255, gray));
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
        data[i + 3] = 255;
      }
    }
    offCtx.putImageData(imgData, 0, 0);
  }

  function resizeVisibleCanvas() {
    const cssW = Math.max(1, window.innerWidth);
    const cssH = Math.max(1, window.innerHeight);
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const internalW = Math.min(Math.floor(cssW * dpr), 8192);
    const internalH = Math.min(Math.floor(cssH * dpr), 8192);

    ovCanvas.width = internalW;
    ovCanvas.height = internalH;
    ovCanvas.style.width = cssW + 'px';
    ovCanvas.style.height = cssH + 'px';

    ovCtx.imageSmoothingEnabled = false;
    ovOffCtx.imageSmoothingEnabled = false;
  }

  function drawOverlay() {
    const w = ovCanvas.width;
    const h = ovCanvas.height;
    ovCtx.clearRect(0, 0, w, h);
    ovCtx.drawImage(ovOff, 0, 0, ovOff.width, ovOff.height, 0, 0, w, h);
  }

  function loop(now) {
    rafId = requestAnimationFrame(loop);
    const dt = now - lastTime;
    lastTime = now;

    if ((now - lastDraw) < msPerFrame) return;
    lastDraw = now;

    seed += CONFIG.ov.speed * (dt / 16.67);

    if (now - lastNoiseUpdate >= CONFIG.noiseUpdateMs || lastNoiseUpdate === 0) {
      lastNoiseUpdate = now;
      fillNoiseTo(ovOffCtx, ovOff.width, ovOff.height, seed * 2.0, 1.3, CONFIG.ov.whiteness);
    }

    drawOverlay();
  }
  function playSequence() {
    setTimeout(() => nowText && nowText.classList.add('show'), 10000);
  }
  function enableAudioOnInteraction() {
    if (!ambient || !ambient.src) return;
    const startAudio = () => {
      try { ambient.volume = 0.6; ambient.play().catch(() => {}); } catch (e) {}
      window.removeEventListener('pointerdown', startAudio);
      window.removeEventListener('keydown', startAudio);
    };
    window.addEventListener('pointerdown', startAudio, { once: true });
    window.addEventListener('keydown', startAudio, { once: true });
  }
  function start() {
    resizeVisibleCanvas();
    lastNoiseUpdate = 0;
    fillNoiseTo(ovOffCtx, ovOff.width, ovOff.height, seed * 2.0, 1.3, CONFIG.ov.whiteness);
    drawOverlay();
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);

    playSequence();
    enableAudioOnInteraction();
  }
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeVisibleCanvas();
      lastNoiseUpdate = 0;
      resizeTimer = null;
    }, 160);
  }, { passive: true });
  window.addEventListener('beforeunload', () => {
    if (rafId) cancelAnimationFrame(rafId);
  });
  start();
})();