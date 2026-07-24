(function () {
  const $ = id => document.getElementById(id);
  const STORAGE_STATE = 'titleObsState';
  const STORAGE_COMMAND = 'titleObsCommand';
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('title-obs-live') : null;
  const defaults = {
    title: 'Bienvenidos', subtitle: 'Gracias por acompañarnos', eyebrow: 'EN VIVO',
    theme: 'broadcast', visible: false, backgroundUrl: '', logoUrl: '',
    horizontalAlign: 'left', verticalAlign: 'bottom', textAlign: 'left',
    fontFamily: "'Inter', sans-serif", fontSize: 68, textColor: '#ffffff',
    maxWidth: 1120, padding: 48, backgroundVisible: true, overlayOpacity: 45,
    logoWidth: 360, logoHeight: 220, animation: 'slide', duration: 700
  };
  let state;
  try { state = { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_STATE) || '{}'), visible: false }; }
  catch { state = { ...defaults }; }
  const controls = {
    title: $('title-input'), subtitle: $('subtitle-input'), eyebrow: $('eyebrow-input'),
    horizontalAlign: $('horizontal-align'), verticalAlign: $('vertical-align'), textAlign: $('text-align'),
    fontFamily: $('font-family'), fontSize: $('font-size'), textColor: $('text-color'),
    maxWidth: $('max-width'), padding: $('padding'), backgroundVisible: $('background-toggle'),
    overlayOpacity: $('overlay-opacity'), logoWidth: $('logo-width'), logoHeight: $('logo-height'),
    animation: $('animation'), duration: $('duration')
  };
  const outputMap = {
    fontSize: ['font-size-value', ' px'], maxWidth: ['max-width-value', ' px'],
    padding: ['padding-value', ' px'], overlayOpacity: ['overlay-opacity-value', '%'],
    logoWidth: ['logo-width-value', ' px'], logoHeight: ['logo-height-value', ' px'],
    duration: ['duration-value', ' ms']
  };
  function persist() {
    try { localStorage.setItem(STORAGE_STATE, JSON.stringify(state)); }
    catch { /* Las imágenes muy grandes pueden superar la cuota; la sesión actual sigue funcionando. */ }
  }
  function send(action = 'update') {
    const command = { action, state, sentAt: Date.now() };
    localStorage.setItem(STORAGE_COMMAND, JSON.stringify(command));
    channel?.postMessage(command);
  }
  function updateOutputs() {
    Object.entries(outputMap).forEach(([key, [id, unit]]) => $(id).textContent = `${state[key]}${unit}`);
  }
  function sync() {
    Object.entries(controls).forEach(([key, control]) => {
      if (control.type === 'checkbox') control.checked = Boolean(state[key]);
      else control.value = state[key];
    });
    $('visibility-toggle').checked = state.visible;
    document.querySelectorAll('.theme-card').forEach(card => card.classList.toggle('selected', card.dataset.theme === state.theme));
    updateOutputs();
  }
  function pullControls() {
    Object.entries(controls).forEach(([key, control]) => {
      state[key] = control.type === 'checkbox' ? control.checked : (control.type === 'range' ? Number(control.value) : control.value);
    });
    persist();
    updateOutputs();
    send('update');
  }
  function readImage(file, key) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      state[key] = reader.result;
      persist();
      send('update');
    });
    reader.readAsDataURL(file);
  }
  function scalePreview() {
    const frame = document.querySelector('.preview-frame');
    const iframe = $('preview');
    const scale = frame.clientWidth / 1920;
    iframe.style.transform = `scale(${scale})`;
  }
  function toggleSettings(open) {
    $('settings-drawer').classList.toggle('open', open);
    $('settings-drawer').setAttribute('aria-hidden', String(!open));
    $('settings-scrim').hidden = !open;
  }
  Object.values(controls).forEach(control => {
    control.addEventListener(control.type === 'range' || ['INPUT', 'TEXTAREA'].includes(control.tagName) ? 'input' : 'change', pullControls);
  });
  document.querySelectorAll('.theme-card').forEach(card => card.addEventListener('click', () => {
    state.theme = card.dataset.theme;
    document.querySelectorAll('.theme-card').forEach(item => item.classList.toggle('selected', item === card));
    persist(); send('update');
  }));
  $('background-input').addEventListener('change', event => readImage(event.target.files[0], 'backgroundUrl'));
  $('logo-input').addEventListener('change', event => readImage(event.target.files[0], 'logoUrl'));
  $('clear-background').addEventListener('click', () => { state.backgroundUrl = ''; persist(); send('update'); });
  $('clear-logo').addEventListener('click', () => { state.logoUrl = ''; persist(); send('update'); });
  $('update-button').addEventListener('click', () => { pullControls(); send('update'); });
  $('show-button').addEventListener('click', () => {
    state.visible = true; $('visibility-toggle').checked = true; persist(); send('show');
  });
  $('visibility-toggle').addEventListener('change', event => {
    state.visible = event.target.checked; persist(); send(state.visible ? 'show' : 'hide');
  });
  $('reset-settings').addEventListener('click', () => {
    const assets = { backgroundUrl: state.backgroundUrl, logoUrl: state.logoUrl, title: state.title, subtitle: state.subtitle, eyebrow: state.eyebrow };
    state = { ...defaults, ...assets, visible: state.visible }; sync(); persist(); send('update');
  });
  $('settings-button').addEventListener('click', () => toggleSettings(true));
  $('settings-close').addEventListener('click', () => toggleSettings(false));
  $('settings-scrim').addEventListener('click', () => toggleSettings(false));
  $('copy-url').addEventListener('click', async () => {
    await navigator.clipboard.writeText(`${location.origin}/visualizador/`);
    $('copy-url').textContent = 'Copiado';
    setTimeout(() => $('copy-url').textContent = 'Copiar', 1200);
  });
  window.addEventListener('resize', scalePreview);
  $('preview').addEventListener('load', () => { scalePreview(); send('update'); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') toggleSettings(false); });
  $('obs-url').textContent = `${location.origin}/visualizador/`;
  sync(); persist(); scalePreview();
}());
