(() => {
  'use strict';

  // This page is intentionally self-contained. The previous version tried to
  // initialise Supabase with a placeholder URL, which could stop the entire
  // script before buttons received their event handlers.
  const $ = (id) => document.getElementById(id);
  const card = $('card-container');
  const panel = $('glass-card');
  const canvas = $('bg-canvas');
  const ctx = canvas.getContext('2d');
  const mouse = { x: -9999, y: -9999 };
  let particles = [];
  let authMode = 'login';
  let currentUser = null;

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (_) { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * ratio);
    canvas.height = Math.floor(innerHeight * ratio);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(180, Math.max(60, Math.floor(innerWidth * innerHeight / 10000)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      radius: Math.random() * 1.25 + 0.55
    }));
  }
  function animate() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of particles) {
      const dx = mouse.x - p.x, dy = mouse.y - p.y, distance = Math.hypot(dx, dy);
      if (distance < 170 && distance > 0) {
        const force = (170 - distance) / 170;
        p.x += (dx / distance) * force * 0.9;
        p.y += (dy / distance) * force * 0.9;
      }
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > innerWidth) p.vx *= -1;
      if (p.y < 0 || p.y > innerHeight) p.vy *= -1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.fill();
    }
    requestAnimationFrame(animate);
  }
  resize(); animate();
  addEventListener('resize', resize);
  addEventListener('mousemove', (event) => {
    mouse.x = event.clientX; mouse.y = event.clientY;
    // Do not tilt while the pointer is over the interactive panel.
    if (card.matches(':hover')) return;
    const x = (event.clientX / innerWidth - 0.5) * 10;
    const y = -(event.clientY / innerHeight - 0.5) * 10;
    panel.style.transform = `rotateX(${y}deg) rotateY(${x}deg)`;
  });
  card.addEventListener('mouseenter', () => { panel.style.transform = 'rotateX(0deg) rotateY(0deg)'; });

  function status(text) { $('form-status').textContent = text || ''; }
  function step(id) {
    document.querySelectorAll('.form-step').forEach((element) => element.classList.remove('active'));
    $(id).classList.add('active');
  }
  function setMode(mode) {
    authMode = mode;
    $('toggle-login').classList.toggle('active', mode === 'login');
    $('toggle-signup').classList.toggle('active', mode === 'signup');
    $('toggle-login').setAttribute('aria-selected', String(mode === 'login'));
    $('toggle-signup').setAttribute('aria-selected', String(mode === 'signup'));
    $('auth-title').textContent = mode === 'login' ? 'Welcome back' : 'Create an account';
    $('submit-btn').textContent = mode === 'login' ? 'Login' : 'Create account';
    $('birthdate').closest('.input-group').classList.toggle('hidden', mode !== 'signup');
    $('birthdate').required = mode === 'signup';
    status('');
  }
  $('toggle-login').addEventListener('click', () => setMode('login'));
  $('toggle-signup').addEventListener('click', () => setMode('signup'));

  $('auth-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const username = $('username').value.trim();
    const password = $('password').value;
    if (!username || password.length < 4 || (authMode === 'signup' && !$('birthdate').value)) {
      status(authMode === 'signup' ? 'Complete every field. Passwords need 4+ characters.' : 'Enter a username and password of 4+ characters.');
      return;
    }
    const accounts = read('moon-chat-accounts', {});
    if (authMode === 'signup') {
      if (accounts[username]) { status('That username is already taken.'); return; }
      currentUser = { username, password, role: 'user', birthdate: $('birthdate').value };
      accounts[username] = currentUser; write('moon-chat-accounts', accounts);
      $('username-preview').textContent = username;
      step('customize-section');
    } else {
      if (!accounts[username] || accounts[username].password !== password) { status('Incorrect username or password.'); return; }
      currentUser = accounts[username]; enterChat();
    }
  });

  function preview() {
    const color = $('font-color').value;
    $('username-preview').style.fontFamily = $('font-family').value;
    $('username-preview').style.color = color;
    $('username-preview').style.textShadow = $('glow-toggle').checked ? `0 0 14px ${color}` : 'none';
  }
  $('font-family').addEventListener('change', preview);
  $('font-color').addEventListener('input', preview);
  $('glow-toggle').addEventListener('change', preview);
  $('save-profile-btn').addEventListener('click', () => {
    preview();
    currentUser.font = $('font-family').value;
    currentUser.color = $('font-color').value;
    currentUser.glow = $('glow-toggle').checked;
    const accounts = read('moon-chat-accounts', {});
    accounts[currentUser.username] = currentUser; write('moon-chat-accounts', accounts);
    enterChat();
  });

  function enterChat() {
    $('user-role-badge').textContent = `Role: ${(currentUser.role || 'user').toUpperCase()}`;
    card.style.maxWidth = '780px';
    step('chat-section');
    loadMessages();
    $('chat-msg').focus();
  }
  function loadMessages() {
    $('message-container').replaceChildren();
    read('moon-chat-messages', []).forEach(renderMessage);
  }
  function renderMessage(message) {
    const block = document.createElement('div'); block.className = 'msg-block';
    const wrap = document.createElement('div'); wrap.className = 'msg-content-wrap';
    const author = document.createElement('span'); author.className = 'msg-author'; author.textContent = message.username;
    const text = document.createElement('span'); text.className = 'msg-text'; text.textContent = message.content;
    wrap.append(author, text); block.append(wrap); $('message-container').append(block);
  }
  $('chat-input-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('chat-msg'), content = input.value.trim();
    if (!content) return;
    const messages = read('moon-chat-messages', []);
    const message = { username: currentUser.username, content };
    messages.push(message); write('moon-chat-messages', messages.slice(-100)); renderMessage(message);
    input.value = ''; input.focus(); $('message-container').scrollTop = $('message-container').scrollHeight;
  });
})();
