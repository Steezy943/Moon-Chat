(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  function start() {
    const required = ['bg-canvas', 'card-container', 'glass-card', 'auth-form', 'toggle-login', 'toggle-signup', 'submit-btn', 'chat-input-form'];
    if (required.some((id) => !$(id))) return;

    const canvas = $('bg-canvas');
    const ctx = canvas.getContext('2d');
    const card = $('card-container');
    const panel = $('glass-card');
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let particles = [];
    let authMode = 'login';
    let currentUser = null;

    function readJSON(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    }

    function writeJSON(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Ignore storage failures gracefully.
      }
    }

    function resizeCanvas() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const count = Math.max(80, Math.min(180, Math.round((window.innerWidth * window.innerHeight) / 14)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.6 + 0.8,
      }));
    }

    function animateBackground() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const p of particles) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 180 && distance > 0) {
          const force = (180 - distance) / 180;
          p.x += (dx / distance) * force * 0.9;
          p.y += (dy / distance) * force * 0.9;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x <= 0 || p.x >= window.innerWidth) p.vx *= -1;
        if (p.y <= 0 || p.y >= window.innerHeight) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
      }

      requestAnimationFrame(animateBackground);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;

      if (card.matches(':hover')) return;

      const rotateY = ((event.clientX / window.innerWidth) - 0.5) * 16;
      const rotateX = -((event.clientY / window.innerHeight) - 0.5) * 16;
      panel.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseenter', () => {
      panel.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });

    card.addEventListener('mouseleave', () => {
      panel.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });

    resizeCanvas();
    animateBackground();

    function setStatus(message = '') {
      const statusNode = $('form-status');
      if (statusNode) statusNode.textContent = message;
    }

    function showStep(id) {
      document.querySelectorAll('.form-step').forEach((section) => {
        section.classList.remove('active');
      });
      const target = $(id);
      if (target) target.classList.add('active');
    }

    function setMode(mode) {
      authMode = mode;
      const loginBtn = $('toggle-login');
      const signupBtn = $('toggle-signup');
      const title = $('auth-title');
      const submitBtn = $('submit-btn');
      const birthdateGroup = $('birthdate-group');
      const birthdateInput = $('birthdate');

      loginBtn.classList.toggle('active', mode === 'login');
      signupBtn.classList.toggle('active', mode === 'signup');
      loginBtn.setAttribute('aria-selected', String(mode === 'login'));
      signupBtn.setAttribute('aria-selected', String(mode === 'signup'));
      title.textContent = mode === 'login' ? 'Welcome back' : 'Create an account';
      submitBtn.textContent = mode === 'login' ? 'Login' : 'Create account';
      birthdateGroup.classList.toggle('hidden', mode !== 'signup');
      birthdateInput.required = mode === 'signup';
      setStatus('');
    }

    $('toggle-login').addEventListener('click', () => setMode('login'));
    $('toggle-signup').addEventListener('click', () => setMode('signup'));

    function getAccounts() {
      return readJSON('moon-chat-accounts', {});
    }

    function saveAccounts(accounts) {
      writeJSON('moon-chat-accounts', accounts);
    }

    $('auth-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const username = $('username').value.trim();
      const password = $('password').value;
      const birthdate = $('birthdate').value;

      if (!username || password.length < 4 || (authMode === 'signup' && !birthdate)) {
        setStatus(authMode === 'signup' ? 'Please complete all fields.' : 'Enter a username and password with at least 4 characters.');
        return;
      }

      const accounts = getAccounts();

      if (authMode === 'signup') {
        if (accounts[username]) {
          setStatus('That username is already taken.');
          return;
        }

        currentUser = { username, password, role: 'user', birthdate };
        accounts[username] = currentUser;
        saveAccounts(accounts);
        $('username-preview').textContent = username;
        showStep('customize-section');
        return;
      }

      const account = accounts[username];
      if (!account || account.password !== password) {
        setStatus('Incorrect username or password.');
        return;
      }

      currentUser = account;
      enterChat();
    });

    function previewProfile() {
      const color = $('font-color').value;
      const preview = $('username-preview');
      preview.style.fontFamily = $('font-family').value;
      preview.style.color = color;
      preview.style.textShadow = $('glow-toggle').checked ? `0 0 14px ${color}` : 'none';
    }

    $('font-family').addEventListener('change', previewProfile);
    $('font-color').addEventListener('input', previewProfile);
    $('glow-toggle').addEventListener('change', previewProfile);

    $('save-profile-btn').addEventListener('click', () => {
      if (!currentUser) return;
      currentUser.font = $('font-family').value;
      currentUser.color = $('font-color').value;
      currentUser.glow = $('glow-toggle').checked;

      const accounts = getAccounts();
      accounts[currentUser.username] = currentUser;
      saveAccounts(accounts);

      enterChat();
    });

    function renderMessage(message) {
      const container = $('message-container');
      if (!container) return;

      const block = document.createElement('div');
      block.className = 'msg-block';

      const author = document.createElement('span');
      author.className = 'msg-author';
      author.textContent = message.username;

      const text = document.createElement('span');
      text.className = 'msg-text';
      text.textContent = message.content;

      block.append(author, text);
      container.appendChild(block);
      container.scrollTop = container.scrollHeight;
    }

    function loadMessages() {
      const container = $('message-container');
      if (!container) return;
      container.innerHTML = '';
      const messages = readJSON('moon-chat-messages', []);
      messages.forEach(renderMessage);
    }

    function enterChat() {
      const roleBadge = $('user-role-badge');
      roleBadge.textContent = `Role: ${(currentUser?.role || 'user').toUpperCase()}`;
      card.style.maxWidth = '780px';
      showStep('chat-section');
      loadMessages();
      $('chat-msg').focus();
    }

    $('chat-input-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('chat-msg');
      const content = input.value.trim();
      if (!content) return;

      const messages = readJSON('moon-chat-messages', []);
      messages.push({ username: currentUser?.username || 'Guest', content });
      writeJSON('moon-chat-messages', messages.slice(-80));
      renderMessage({ username: currentUser?.username || 'Guest', content });
      input.value = '';
    });

    previewProfile();
    setMode('login');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
