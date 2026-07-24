(function () {
  const STORAGE_COMMAND = 'titleObsCommand';
  const STORAGE_STATE = 'titleObsState';
  const stage = document.getElementById('title-stage');
  const elements = {
    card: document.getElementById('title-card'),
    background: document.getElementById('scene-background'),
    logoFrame: document.getElementById('logo-frame'),
    logo: document.getElementById('logo-image'),
    eyebrow: document.getElementById('eyebrow'),
    title: document.getElementById('title'),
    subtitle: document.getElementById('subtitle')
  };
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('title-obs-live') : null;
  const defaults = {
    title: 'Bienvenidos', subtitle: 'Gracias por acompañarnos', eyebrow: 'EN VIVO',
    theme: 'broadcast', visible: false, backgroundUrl: '', logoUrl: '',
    horizontalAlign: 'left', verticalAlign: 'bottom', textAlign: 'left',
    fontFamily: "'Inter', sans-serif", fontSize: 68, textColor: '#ffffff',
    maxWidth: 1120, padding: 48, backgroundVisible: true, overlayOpacity: 45,
    logoWidth: 360, logoHeight: 220, animation: 'slide', duration: 700
  };
  let state = { ...defaults };

  const clamp = (value, minimum, maximum, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
  };
  function safeState(next) {
    return {
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
      duration: clamp(next.duration, 250, 1800, 700)
    };
  }
  function apply(next, replay = false) {
    const wasVisible = state.visible;
    state = safeState({ ...state, ...next });
    elements.title.textContent = state.title;
    elements.subtitle.textContent = state.subtitle;
    elements.subtitle.hidden = !state.subtitle;
    elements.eyebrow.textContent = state.eyebrow;
    elements.eyebrow.hidden = !state.eyebrow;
    stage.dataset.theme = state.theme;
    stage.dataset.animation = state.animation;
    stage.dataset.horizontal = state.horizontalAlign;
    stage.dataset.vertical = state.verticalAlign;
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
    elements.background.style.backgroundImage = state.backgroundUrl ? `url("${state.backgroundUrl}")` : '';
    elements.background.classList.toggle('has-image', Boolean(state.backgroundUrl && state.backgroundVisible));
    stage.classList.toggle('has-background', Boolean(state.backgroundUrl && state.backgroundVisible));
    elements.logo.src = state.logoUrl || '';
    elements.logo.style.objectFit = 'contain';
    elements.logoFrame.classList.toggle('has-logo', Boolean(state.logoUrl));
    if (replay && wasVisible && state.visible) {
      stage.classList.remove('is-visible');
      requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('is-visible')));
    } else {
      stage.classList.toggle('is-visible', Boolean(state.visible));
    }
  }
  function receive(message) {
    if (!message) return;
    if (message.action === 'hide') apply({ visible: false });
    else if (message.action === 'show') apply({ ...(message.state || {}), visible: true }, true);
    else if (message.action === 'update') apply(message.state || {}, true);
  }
  try { apply(JSON.parse(localStorage.getItem(STORAGE_STATE) || '{}')); } catch { apply({}); }
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_COMMAND || !event.newValue) return;
    try { receive(JSON.parse(event.newValue)); } catch {}
  });
  channel?.addEventListener('message', event => receive(event.data));
}());
