(function () {
  const STORAGE_COMMAND = 'titleObsCommand';
  const STORAGE_STATE = 'titleObsState';
  const ASSET_DB = 'titleObsAssets';
  const isPreview = new URLSearchParams(location.search).has('preview');
  const stage = document.getElementById('title-stage');
  const elements = {
    backgroundImage: document.getElementById('background-image'),
    backgroundVideo: document.getElementById('background-video'),
    backgroundVideoBuffer: document.getElementById('background-video-buffer'),
    logoFrame: document.getElementById('logo-frame'),
    logo: document.getElementById('logo-image'),
    eyebrow: document.getElementById('eyebrow'),
    title: document.getElementById('title'),
    subtitle: document.getElementById('subtitle')
  };
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('title-obs-live') : null;
  const defaults = {
    title: 'Bienvenidos', subtitle: 'Gracias por acompañarnos', eyebrow: 'EN VIVO',
    theme: 'broadcast', visible: false, backgroundType: 'color', backgroundColor: '#101722',
    backgroundFit: 'cover', backgroundPosition: 'center center', imageFileName: '', videoFileName: '',
    imageAssetVersion: 0, videoAssetVersion: 0, backgroundLegacyUrl: '', imageAnimation: false,
    videoEffect: 'loop', videoStart: 0, videoEnd: 100, logoUrl: '',
    logoFilter: 'none', logoColor: '#ffffff',
    horizontalAlign: 'left', verticalAlign: 'bottom', textAlign: 'left',
    fontFamily: "'Inter', sans-serif", fontSize: 68, textColor: '#ffffff',
    maxWidth: 1120, padding: 48, overlayOpacity: 45,
    logoWidth: 360, logoHeight: 220, animation: 'slide', duration: 700
  };
  let state = { ...defaults };
  let assetVersion = null;
  let assetUrl = '';
  let activeVideo = elements.backgroundVideo;
  let standbyVideo = elements.backgroundVideoBuffer;
  let videoFrameCallback = 0;
  let playbackVisible = false;
  let alternateMirror = false;

  const clamp = (value, minimum, maximum, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
  };
  function safeState(next) {
    const safe = {
      ...defaults, ...next,
      title: String(next.title ?? defaults.title).slice(0, 100),
      subtitle: String(next.subtitle ?? '').slice(0, 180),
      eyebrow: String(next.eyebrow ?? '').slice(0, 40),
      fontSize: clamp(next.fontSize, 28, 110, 68),
      maxWidth: clamp(next.maxWidth, 420, 1600, 1120),
      padding: clamp(next.padding, 16, 100, 48),
      overlayOpacity: clamp(next.overlayOpacity, 0, 90, 45),
      logoWidth: clamp(next.logoWidth, 80, 700, 360),
      logoHeight: clamp(next.logoHeight, 60, 450, 220),
      videoStart: clamp(next.videoStart, 0, 99, 0),
      videoEnd: clamp(next.videoEnd, 1, 100, 100),
      duration: clamp(next.duration, 250, 1800, 700)
    };
    if (!['none', 'loop', 'alternate', 'mirror'].includes(safe.videoEffect)) safe.videoEffect = defaults.videoEffect;
    if (safe.videoStart >= safe.videoEnd) {
      safe.videoStart = 0;
      safe.videoEnd = 100;
    }
    return safe;
  }
  function videoBounds() {
    const duration = Number.isFinite(activeVideo.duration) ? activeVideo.duration : 0;
    const start = duration * state.videoStart / 100;
    const end = duration * state.videoEnd / 100;
    return { start, end: Math.max(start + 0.01, end) };
  }
  function cancelVideoFrame() {
    if (videoFrameCallback && activeVideo.cancelVideoFrameCallback) {
      activeVideo.cancelVideoFrameCallback(videoFrameCallback);
    }
    videoFrameCallback = 0;
  }
  function applyVideoOrientation() {
    const mirrored = state.videoEffect === 'mirror' || (state.videoEffect === 'alternate' && alternateMirror);
    activeVideo.classList.toggle('is-mirrored', mirrored);
  }
  function prepareStandby(start) {
    standbyVideo.pause();
    if (standbyVideo.readyState >= 1) standbyVideo.currentTime = start;
    standbyVideo.classList.remove('is-active', 'is-mirrored');
  }
  function swapVideoBuffer() {
    const { start } = videoBounds();
    cancelVideoFrame();
    activeVideo.pause();
    activeVideo.classList.remove('is-active', 'is-mirrored');
    const previousVideo = activeVideo;
    activeVideo = standbyVideo;
    standbyVideo = previousVideo;
    if (state.videoEffect === 'alternate') alternateMirror = !alternateMirror;
    activeVideo.classList.add('is-active');
    applyVideoOrientation();
    activeVideo.play().catch(() => {});
    prepareStandby(start);
    monitorVideoFrames();
  }
  function handleVideoFrame(mediaTime) {
    if (!playbackVisible || state.backgroundType !== 'video') return;
    const { end } = videoBounds();
    if (mediaTime < end - 0.02) {
      monitorVideoFrames();
      return;
    }
    if (state.videoEffect === 'none') {
      activeVideo.currentTime = end;
      activeVideo.pause();
      return;
    }
    swapVideoBuffer();
  }
  function usesNativeLoop() {
    return state.videoEffect === 'loop' && state.videoStart === 0 && state.videoEnd === 100;
  }
  function monitorVideoFrames() {
    cancelVideoFrame();
    if (usesNativeLoop() || !activeVideo.requestVideoFrameCallback || activeVideo.paused) return;
    videoFrameCallback = activeVideo.requestVideoFrameCallback((_, metadata) => {
      videoFrameCallback = 0;
      handleVideoFrame(metadata.mediaTime);
    });
  }
  function configureVideo(reset = false) {
    cancelVideoFrame();
    activeVideo.loop = false;
    standbyVideo.loop = false;
    if (!playbackVisible || state.backgroundType !== 'video' || !activeVideo.src || !activeVideo.duration) {
      activeVideo.pause();
      standbyVideo.pause();
      return;
    }
    const { start, end } = videoBounds();
    const fullNativeLoop = usesNativeLoop();
    activeVideo.loop = fullNativeLoop;
    if (reset || activeVideo.currentTime < start || activeVideo.currentTime > end) activeVideo.currentTime = start;
    alternateMirror = false;
    activeVideo.classList.add('is-active');
    applyVideoOrientation();
    prepareStandby(start);
    activeVideo.play().catch(() => {});
    if (!fullNativeLoop) monitorVideoFrames();
  }
  function readBackgroundAsset(type) {
    return new Promise(resolve => {
      const request = indexedDB.open(ASSET_DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('assets');
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const db = request.result;
        const get = db.transaction('assets').objectStore('assets').get(`background-${type}`);
        get.onsuccess = () => { resolve(get.result || null); db.close(); };
        get.onerror = () => { resolve(null); db.close(); };
      };
    });
  }
  function clearAssetUrl() {
    cancelVideoFrame();
    if (assetUrl) URL.revokeObjectURL(assetUrl);
    assetUrl = '';
    elements.backgroundImage.removeAttribute('src');
    [elements.backgroundVideo, elements.backgroundVideoBuffer].forEach(video => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
  }
  async function applyAsset() {
    const requestedVersion = `${state[`${state.backgroundType}AssetVersion`]}:${state.backgroundType}`;
    if (assetVersion === requestedVersion) return;
    assetVersion = requestedVersion;
    clearAssetUrl();
    const blob = await readBackgroundAsset(state.backgroundType);
    if (assetVersion !== requestedVersion) return;
    if (blob) assetUrl = URL.createObjectURL(blob);
    else if (state.backgroundLegacyUrl) assetUrl = state.backgroundLegacyUrl;
    if (!assetUrl) return;
    if (state.backgroundType === 'video') {
      elements.backgroundVideo.src = assetUrl;
      elements.backgroundVideoBuffer.src = assetUrl;
    } else {
      elements.backgroundImage.src = assetUrl;
    }
  }
  function apply(next, replay = false) {
    const wasVisible = state.visible;
    const previousVideoSettings = `${state.videoEffect}:${state.videoStart}:${state.videoEnd}`;
    state = safeState({ ...state, ...next });
    const visible = isPreview || Boolean(state.visible);
    playbackVisible = visible;
    elements.title.textContent = state.title;
    elements.subtitle.textContent = state.subtitle;
    elements.subtitle.hidden = !state.subtitle;
    elements.eyebrow.textContent = state.eyebrow;
    elements.eyebrow.hidden = !state.eyebrow;
    stage.dataset.theme = state.theme;
    stage.dataset.animation = state.animation;
    stage.dataset.horizontal = state.horizontalAlign;
    stage.dataset.vertical = state.verticalAlign;
    stage.dataset.backgroundType = state.backgroundType;
    stage.dataset.backgroundFit = state.backgroundFit;
    stage.style.setProperty('--align', state.textAlign);
    stage.style.setProperty('--title-font', state.fontFamily);
    stage.style.setProperty('--title-size', `${state.fontSize}px`);
    stage.style.setProperty('--text-color', state.textColor);
    stage.style.setProperty('--card-width', `${state.maxWidth}px`);
    stage.style.setProperty('--card-padding', `${state.padding}px`);
    stage.style.setProperty('--logo-width', `${state.logoWidth}px`);
    stage.style.setProperty('--logo-height', `${state.logoHeight}px`);
    stage.style.setProperty('--shade', state.overlayOpacity / 100);
    stage.style.setProperty('--duration', `${state.duration}ms`);
    stage.style.setProperty('--background-color', state.backgroundColor);
    stage.style.setProperty('--background-position', state.backgroundPosition);
    stage.classList.toggle('animate-background', state.backgroundType === 'image' && Boolean(state.imageAnimation));
    elements.logo.src = state.logoUrl || '';
    elements.logo.style.objectFit = 'contain';
    elements.logo.dataset.filter = state.logoFilter;
    const color = /^#[\da-f]{6}$/iu.test(state.logoColor) ? state.logoColor : '#ffffff';
    const red = parseInt(color.slice(1, 3), 16) / 255;
    const green = parseInt(color.slice(3, 5), 16) / 255;
    const blue = parseInt(color.slice(5, 7), 16) / 255;
    document.getElementById('logo-color-matrix').setAttribute('values', `0 0 0 0 ${red} 0 0 0 0 ${green} 0 0 0 0 ${blue} 0 0 0 1 0`);
    elements.logoFrame.classList.toggle('has-logo', Boolean(state.logoUrl));
    applyAsset();
    if (state.backgroundType === 'video') {
      const videoSettings = `${state.videoEffect}:${state.videoStart}:${state.videoEnd}`;
      configureVideo(videoSettings !== previousVideoSettings || (!wasVisible && visible));
    } else {
      activeVideo.pause();
      standbyVideo.pause();
      cancelVideoFrame();
    }
    if (replay && wasVisible && state.visible && !isPreview) {
      stage.classList.remove('is-visible');
      requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('is-visible')));
    } else {
      stage.classList.toggle('is-visible', visible);
    }
  }
  [elements.backgroundVideo, elements.backgroundVideoBuffer].forEach(video => {
    video.addEventListener('loadedmetadata', () => {
      if (video === activeVideo) configureVideo(true);
      else prepareStandby(videoBounds().start);
    });
    video.addEventListener('play', monitorVideoFrames);
    video.addEventListener('timeupdate', () => {
      if (!activeVideo.requestVideoFrameCallback && video === activeVideo) handleVideoFrame(video.currentTime);
    });
  });
  function receive(message) {
    if (!message) return;
    if (message.action === 'hide') apply({ ...(message.state || {}), visible: false });
    else if (message.action === 'show') apply({ ...(message.state || {}), visible: true }, true);
    else if (message.action === 'update') apply(message.state || {}, true);
  }
  try { apply(JSON.parse(localStorage.getItem(STORAGE_STATE) || '{}')); } catch { apply({}); }
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_COMMAND || !event.newValue) return;
    try { receive(JSON.parse(event.newValue)); } catch {}
  });
  channel?.addEventListener('message', event => receive(event.data));
  window.addEventListener('beforeunload', clearAssetUrl);
}());
