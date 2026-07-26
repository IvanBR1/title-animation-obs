(function () {
  const $ = id => document.getElementById(id);
  const STORAGE_STATE = 'titleObsState';
  const STORAGE_COMMAND = 'titleObsCommand';
  const ASSET_DB = 'titleObsAssets';
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('title-obs-live') : null;
  const themeDefaults = {
    broadcast: { fontFamily: "'Inter', sans-serif", textColor: '#ffffff' },
    classic: { fontFamily: "'Merriweather', serif", textColor: '#ecf0f1' },
    modern: { fontFamily: "'Cormorant Garamond', serif", textColor: '#f8efe0' },
    glass: { fontFamily: "'Space Grotesk', sans-serif", textColor: '#ffffff' },
    editorial: { fontFamily: "'Playfair Display', serif", textColor: '#251c19' },
    neon: { fontFamily: "'Bebas Neue', sans-serif", textColor: '#ffffff' },
    cinematic: { fontFamily: "'Cinzel', serif", textColor: '#ffffff' },
    minimal: { fontFamily: "'Inter', sans-serif", textColor: '#111827' },
    ribbon: { fontFamily: "'Montserrat', sans-serif", textColor: '#ffffff' },
    spotlight: { fontFamily: "'Cormorant Garamond', serif", textColor: '#ffffff' }
  };
  const defaults = {
    title: 'Bienvenidos', subtitle: 'Gracias por acompañarnos', eyebrow: 'EN VIVO',
    theme: 'broadcast', visible: false, backgroundType: 'color', backgroundColor: '#101722',
    backgroundFit: 'cover', backgroundPosition: 'center center', imageFileName: '', videoFileName: '',
    imageAssetVersion: 0, videoAssetVersion: 0, imageAnimation: false,
    videoEffect: 'loop', videoStart: 0, videoEnd: 100,
    logoUrl: '', logoFileName: '', logoFilter: 'none', logoColor: '#ffffff',
    horizontalAlign: 'left', verticalAlign: 'bottom', textAlign: 'left',
    fontFamily: "'Inter', sans-serif", fontSize: 68, textColor: '#ffffff',
    maxWidth: 1120, padding: 48, overlayOpacity: 45,
    logoWidth: 360, logoHeight: 220, animation: 'slide', duration: 700,
    themeStyles: themeDefaults
  };
  let state;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_STATE) || '{}');
    state = { ...defaults, ...saved };
    if (state.videoEffect === 'pingpong') state.videoEffect = 'alternate';
    if (state.videoEffect === 'reverse') state.videoEffect = 'mirror';
    state.themeStyles = Object.fromEntries(Object.entries(themeDefaults).map(([theme, values]) => [
      theme, { ...values, ...(saved.themeStyles?.[theme] || {}) }
    ]));
    if (!saved.themeStyles && (saved.fontFamily || saved.textColor)) {
      state.themeStyles[state.theme] = {
        fontFamily: saved.fontFamily || themeDefaults[state.theme].fontFamily,
        textColor: saved.textColor || themeDefaults[state.theme].textColor
      };
    }
    Object.assign(state, state.themeStyles[state.theme]);
    if (saved.backgroundUrl && !saved.backgroundType) {
      state.backgroundType = 'image';
      state.backgroundLegacyUrl = saved.backgroundUrl;
    }
  } catch { state = { ...defaults }; }

  const controls = {
    title: $('title-input'), subtitle: $('subtitle-input'), eyebrow: $('eyebrow-input'),
    horizontalAlign: $('horizontal-align'), verticalAlign: $('vertical-align'), textAlign: $('text-align'),
    fontFamily: $('font-family'), fontSize: $('font-size'), textColor: $('text-color'),
    maxWidth: $('max-width'), padding: $('padding'), backgroundType: $('background-type'),
    backgroundColor: $('background-color'), backgroundFit: $('background-fit'),
    imageAnimation: $('image-animation'), videoEffect: $('video-effect'),
    videoStart: $('video-start'), videoEnd: $('video-end'),
    overlayOpacity: $('overlay-opacity'), logoFilter: $('logo-filter'), logoColor: $('logo-color'),
    logoWidth: $('logo-width'), logoHeight: $('logo-height'),
    animation: $('animation'), duration: $('duration')
  };
  const outputMap = {
    fontSize: ['font-size-value', ' px'], maxWidth: ['max-width-value', ' px'],
    padding: ['padding-value', ' px'], overlayOpacity: ['overlay-opacity-value', '%'],
    logoWidth: ['logo-width-value', ' px'], logoHeight: ['logo-height-value', ' px'],
    duration: ['duration-value', ' ms']
  };
  const anchors = [
    ['left top', '↖'], ['center top', '↑'], ['right top', '↗'],
    ['left center', '←'], ['center center', '•'], ['right center', '→'],
    ['left bottom', '↙'], ['center bottom', '↓'], ['right bottom', '↘']
  ];

  function persist() {
    try { localStorage.setItem(STORAGE_STATE, JSON.stringify(state)); } catch {}
  }
  function send(action = 'update') {
    const command = { action, state, sentAt: Date.now() };
    try { localStorage.setItem(STORAGE_COMMAND, JSON.stringify(command)); } catch {}
    channel?.postMessage(command);
  }
  function commit(action = 'update') {
    persist();
    send(action);
  }
  function updateOutputs() {
    Object.entries(outputMap).forEach(([key, [id, unit]]) => $(id).textContent = `${state[key]}${unit}`);
  }
  function updateLogoUI() {
    $('logo-file-button').classList.toggle('has-file', Boolean(state.logoUrl));
    $('logo-status').textContent = state.logoFileName || 'Logotipo cargado';
    $('logo-color-field').hidden = state.logoFilter !== 'colorize';
  }
  function updateVideoRangeUI() {
    $('video-range').style.setProperty('--range-start', `${state.videoStart}%`);
    $('video-range').style.setProperty('--range-end', `${state.videoEnd}%`);
    $('video-range-value').textContent = `${state.videoStart}% — ${state.videoEnd}%`;
  }
  function updateBackgroundUI() {
    const media = state.backgroundType !== 'color';
    $('background-color-fields').hidden = media;
    $('background-media-fields').hidden = !media;
    $('background-input').accept = state.backgroundType === 'video' ? 'video/mp4,video/webm,video/ogg' : 'image/png,image/jpeg,image/webp,image/gif';
    const fileName = state[`${state.backgroundType}FileName`] || '';
    $('background-file-button').classList.toggle('has-file', Boolean(fileName));
    $('background-file-button').querySelector('.upload-empty').textContent = state.backgroundType === 'video' ? 'Elegir o arrastrar video' : 'Elegir o arrastrar imagen';
    $('background-file-name').textContent = fileName || 'Archivo cargado';
    const imageVisible = state.backgroundType === 'image';
    const videoVisible = state.backgroundType === 'video';
    $('image-options').hidden = !imageVisible;
    $('image-options').setAttribute('aria-hidden', String(!imageVisible));
    $('video-options').hidden = !videoVisible;
    $('video-options').setAttribute('aria-hidden', String(!videoVisible));
    $('video-options').inert = !videoVisible;
    $('video-options').querySelectorAll('select,input').forEach(control => { control.disabled = !videoVisible; });
    $('anchor-button').hidden = state.backgroundFit !== 'cover';
    if (state.backgroundFit !== 'cover') toggleAnchor(false);
    document.querySelectorAll('.anchor-grid button').forEach(button => {
      button.classList.toggle('selected', button.dataset.position === state.backgroundPosition);
    });
    updateVideoRangeUI();
  }
  function sync() {
    Object.entries(controls).forEach(([key, control]) => {
      if (control.type === 'checkbox') control.checked = Boolean(state[key]);
      else control.value = state[key];
    });
    $('visibility-toggle').checked = state.visible;
    document.querySelectorAll('.theme-card').forEach(card => card.classList.toggle('selected', card.dataset.theme === state.theme));
    updateOutputs();
    updateBackgroundUI();
    updateLogoUI();
  }
  function pullControl(key, control) {
    state[key] = control.type === 'checkbox' ? control.checked : (control.type === 'range' ? Number(control.value) : control.value);
    if (key === 'videoStart' && state.videoStart >= state.videoEnd) {
      state.videoStart = Math.max(0, state.videoEnd - 1);
      control.value = state.videoStart;
    }
    if (key === 'videoEnd' && state.videoEnd <= state.videoStart) {
      state.videoEnd = Math.min(100, state.videoStart + 1);
      control.value = state.videoEnd;
    }
    if (key === 'fontFamily' || key === 'textColor') {
      state.themeStyles[state.theme] = { ...state.themeStyles[state.theme], [key]: state[key] };
    }
    updateOutputs();
    updateBackgroundUI();
    updateLogoUI();
    commit();
  }
  function openAssetDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(ASSET_DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('assets');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function saveBackground(file) {
    const assetType = state.backgroundType;
    const db = await openAssetDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('assets', 'readwrite');
      transaction.objectStore('assets').put(file, `background-${assetType}`);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
    state[`${assetType}FileName`] = file.name;
    state[`${assetType}AssetVersion`] = Date.now();
    state.backgroundLegacyUrl = '';
    commit();
    updateBackgroundUI();
  }
  function readImage(file, key) {
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      state[key] = reader.result;
      if (key === 'logoUrl') {
        state.logoFileName = file.name;
        updateLogoUI();
      }
      commit();
    });
    reader.readAsDataURL(file);
  }
  function scalePreview() {
    const frame = document.querySelector('.preview-frame');
    $('preview').style.transform = `scale(${frame.clientWidth / 1920})`;
  }
  function toggleSettings(open) {
    $('settings-drawer').classList.toggle('open', open);
    $('settings-drawer').setAttribute('aria-hidden', String(!open));
    $('settings-scrim').hidden = !open;
  }
  function toggleAnchor(open) {
    $('anchor-popover').hidden = !open;
    $('anchor-button').setAttribute('aria-expanded', String(open));
  }
  async function clearBackground() {
    const assetType = state.backgroundType;
    state[`${assetType}FileName`] = '';
    state[`${assetType}AssetVersion`] = Date.now();
    state.backgroundLegacyUrl = '';
    try {
      const db = await openAssetDatabase();
      await new Promise((resolve, reject) => {
        const transaction = db.transaction('assets', 'readwrite');
        transaction.objectStore('assets').delete(`background-${assetType}`);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
    } catch {}
    commit();
    updateBackgroundUI();
  }
  function clearLogo() {
    state.logoUrl = '';
    state.logoFileName = '';
    updateLogoUI();
    commit();
  }
  function setupUpload(button, input, hasFile, clearFile, receiveFile) {
    button.addEventListener('click', () => {
      if (hasFile()) clearFile();
      else input.click();
    });
    button.addEventListener('dragover', event => {
      event.preventDefault();
      button.classList.add('is-dragging');
    });
    button.addEventListener('dragleave', () => button.classList.remove('is-dragging'));
    button.addEventListener('drop', event => {
      event.preventDefault();
      button.classList.remove('is-dragging');
      const file = event.dataTransfer.files[0];
      if (file) receiveFile(file);
    });
  }

  anchors.forEach(([position, symbol]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.position = position;
    button.title = position;
    button.setAttribute('aria-label', `Anclar ${position}`);
    button.textContent = symbol;
    button.addEventListener('click', () => {
      state.backgroundPosition = position;
      updateBackgroundUI();
      toggleAnchor(false);
      commit();
    });
    document.querySelector('.anchor-grid').append(button);
  });
  Object.entries(controls).forEach(([key, control]) => {
    const eventName = control.type === 'range' || ['INPUT', 'TEXTAREA'].includes(control.tagName) ? 'input' : 'change';
    control.addEventListener(eventName, () => pullControl(key, control));
  });
  document.querySelectorAll('.theme-card').forEach(card => card.addEventListener('click', () => {
    state.theme = card.dataset.theme;
    Object.assign(state, state.themeStyles[state.theme]);
    controls.fontFamily.value = state.fontFamily;
    controls.textColor.value = state.textColor;
    document.querySelectorAll('.theme-card').forEach(item => item.classList.toggle('selected', item === card));
    commit();
  }));
  function receiveBackground(file) {
    const valid = state.backgroundType === 'video' ? file.type.startsWith('video/') : file.type.startsWith('image/');
    if (valid) saveBackground(file).catch(() => {});
  }
  $('background-input').addEventListener('change', event => {
    if (event.target.files[0]) receiveBackground(event.target.files[0]);
    event.target.value = '';
  });
  $('logo-input').addEventListener('change', event => {
    readImage(event.target.files[0], 'logoUrl');
    event.target.value = '';
  });
  setupUpload(
    $('background-file-button'), $('background-input'),
    () => Boolean(state[`${state.backgroundType}FileName`]), clearBackground, receiveBackground
  );
  setupUpload($('logo-file-button'), $('logo-input'), () => Boolean(state.logoUrl), clearLogo, file => readImage(file, 'logoUrl'));
  $('visibility-toggle').addEventListener('change', event => {
    state.visible = event.target.checked;
    commit(state.visible ? 'show' : 'hide');
  });
  $('anchor-button').addEventListener('click', () => toggleAnchor($('anchor-popover').hidden));
  document.addEventListener('click', event => {
    if (!event.target.closest('.anchor-wrap')) toggleAnchor(false);
  });
  $('reset-settings').addEventListener('click', () => {
    const content = {
      imageFileName: state.imageFileName, videoFileName: state.videoFileName,
      imageAssetVersion: state.imageAssetVersion, videoAssetVersion: state.videoAssetVersion,
      backgroundLegacyUrl: state.backgroundLegacyUrl, logoUrl: state.logoUrl, logoFileName: state.logoFileName,
      title: state.title, subtitle: state.subtitle, eyebrow: state.eyebrow, visible: state.visible
    };
    state = { ...defaults, themeStyles: structuredClone(themeDefaults), ...content };
    sync();
    commit();
  });
  $('settings-button').addEventListener('click', () => toggleSettings(true));
  $('settings-close').addEventListener('click', () => toggleSettings(false));
  $('settings-scrim').addEventListener('click', () => toggleSettings(false));
  $('copy-url').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`${location.origin}/visualizador/`);
    $('copy-url').textContent = 'Copiado';
    setTimeout(() => { $('copy-url').textContent = 'Copiar'; }, 1200);
  });
  window.addEventListener('resize', scalePreview);
  $('preview').addEventListener('load', () => { scalePreview(); send('update'); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { toggleSettings(false); toggleAnchor(false); } });
  $('obs-url').textContent = `${location.origin}/visualizador/`;
  sync();
  persist();
  scalePreview();
}());
