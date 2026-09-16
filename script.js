(() => {
  'use strict';

  // Wait for the document explicitly so this also works if GitHub Pages or a
  // browser ignores the defer attribute.
  function start() {
    const $ = (id) => document.getElementById(id);
    const required = ['card-container', 'glass-card', 'bg-canvas', 'auth-form', 'toggle-login', 'toggle-signup', 'submit-btn', 'birthdate', 'customize-section', 'chat-section'];
    if (required.some((id) => !$(id))) return;

    const card = $('card-container');
    const panel = $('glass-card');
    const canvas = $('bg-canvas');
    const ctx = canvas.getContext('2d');
    const mouse = { x: -1000, y: -1000 };
    let particles = [];
    let authMode = 'login';
    let currentUser = null;

    const read = (key, fallback) => {
      try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; }
    };
    const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} };

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = Array.from({ length: Math.min(180, Math.max(70, Math.floor(innerWidth * innerHeight / 9000))) }, () => ({
        x: Math.random() * innerWidth, y: Math.random() * innerHeight,
        vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22,
        radius: Math.random() * 1.4 + .7
      }));
    }
    function draw() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      particles.forEach((p) => {
        const dx = mouse.x - p.x, dy = mouse.y - p.y, distance = Math.hypot(dx, dy);
        if (distance < 180 && distance > 1) { const force = (180 - distance) / 180; p.x += dx / distance * force * .8; p.y += dy / distance * force * .8; }
        p.x += p.vx; p.y += p.vy;
        if (p.x <= 0 || p.x >= innerWidth) p.vx *= -1;
        if (p.y <= 0 || p.y >= innerHeight) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      });
      requestAnimationFrame(draw);
    }
    resize(); draw(); window.addEventListener('resize', resize);

    window.addEventListener('mousemove', (event) => {
      mouse.x = event.clientX; mouse.y = event.clientY;
      if (card.matches(':hover')) return;
      const rotateY = (event.clientX / innerWidth - .5) * 12;
      const rotateX = -((event.clientY / innerHeight) - .5) * 12;
      panel.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    card.addEventListener('mouseenter', () => { panel.style.transform = 'rotateX(0deg) rotateY(0deg)'; });

    function status(message) { $('form-status').textContent = message || ''; }
    function show(id) { document.querySelectorAll('.form-step').forEach((el) => el.classList.remove('active')); $(id).classList.add('active'); }
    function setMode(mode) {
      authMode = mode;
      $('toggle-login').classList.toggle('active', mode === 'login');
      $('toggle-signup').classList.toggle('active', mode === 'signup');
      $('auth-title').textContent = mode === 'login' ? 'Welcome back' : 'Create an account';
      $('submit-btn').textContent = mode === 'login' ? 'Login' : 'Create account';
      const birthdateGroup = $('birthdate').parentElement;
      birthdateGroup.classList.toggle('hidden', mode !== 'signup');
      $('birthdate').required = mode === 'signup';
      status('');
    }

    // Delegation makes the tab buttons work even if the markup is refreshed.
    $('toggle-container')?.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (button?.id === 'toggle-login') setMode('login');
      if (button?.id === 'toggle-signup') setMode('signup');
    });
    $('toggle-login').addEventListener('click', () => setMode('login'));
    $('toggle-signup').addEventListener('click', () => setMode('signup'));

    $('auth-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const username = $('username').value.trim();
      const password = $('password').value;
      if (!username || password.length < 4 || (authMode === 'signup' && !$('birthdate').value)) { status('Complete the required fields. Passwords need 4+ characters.'); return; }
      const accounts = read('moon-chat-accounts', {});
      if (authMode === 'signup') {
        if (accounts[username]) { status('That username is already taken.'); return; }
        currentUser = { username, password, role: 'user', birthdate: $('birthdate').value };
        accounts[username] = currentUser; write('moon-chat-accounts', accounts);
        $('username-preview').textContent = username; show('customize-section');
      } else {
        if (!accounts[username] || accounts[username].password !== password) { status('Incorrect username or password.'); return; }
        currentUser = accounts[username]; enterChat();
      }
    });

    function preview() {
      const color = $('font-color').value; $('username-preview').style.fontFamily = $('font-family').value; $('username-preview').style.color = color; $('username-preview').style.textShadow = $('glow-toggle').checked ? `0 0 14px ${color}` : 'none';
    }
    ['font-family', 'font-color', 'glow-toggle'].forEach((id) => $(id).addEventListener('input', preview));
    $('save-profile-btn').addEventListener('click', () => { preview(); enterChat(); });
    function enterChat() { $('user-role-badge').textContent = `Role: ${(currentUser?.role || 'user').toUpperCase()}`; card.style.maxWidth = '780px'; show('chat-section'); loadMessages(); $('chat-msg').focus(); }
    function loadMessages() { $('message-container').replaceChildren(); read('moon-chat-messages', []).forEach(renderMessage); }
    function renderMessage(message) { const block = document.createElement('div'); block.className = 'msg-block'; const wrap = document.createElement('div'); wrap.className = 'msg-content-wrap'; const author = document.createElement('span'); author.className = 'msg-author'; author.textContent = message.username; const text = document.createElement('span'); text.className = 'msg-text'; text.textContent = message.content; wrap.append(author, text); block.append(wrap); $('message-container').append(block); }
    $('chat-input-form').addEventListener('submit', (event) => { event.preventDefault(); const input = $('chat-msg'), content = input.value.trim(); if (!content) return; const messages = read('moon-chat-messages', []); const message = { username: currentUser?.username || 'Guest', content }; messages.push(message); write('moon-chat-messages', messages.slice(-100)); renderMessage(message); input.value = ''; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
