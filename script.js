(() => {
  'use strict';

  function init() {
    const $ = (id) => document.getElementById(id);
    const canvas = $('bg-canvas');
    const ctx = canvas && canvas.getContext('2d');
    const card = $('card-container');
    const panel = $('glass-card');
    if (!canvas || !ctx || !card || !panel) return;

    // Lightweight particle renderer: capped particle count and no expensive
    // all-pairs line calculation, so the page becomes interactive immediately.
    const mouse = { x: -1000, y: -1000 };
    let particles = [];
    let frame = 0;

    function resize() {
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * scale);
      canvas.height = Math.floor(window.innerHeight * scale);
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const count = Math.min(140, Math.max(55, Math.floor(window.innerWidth * window.innerHeight / 16000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.4 + 0.6
      }));
    }

    function animate() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);
      for (const particle of particles) {
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < 170) {
          const force = (170 - distance) / 170;
          particle.x += (dx / distance) * force * 0.65;
          particle.y += (dy / distance) * force * 0.65;
        }
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < 0 || particle.x > width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > height) particle.vy *= -1;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.fill();
      }
      frame = requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      if (!card.matches(':hover')) {
        const rotateX = -((event.clientY / window.innerHeight) - 0.5) * 12;
        const rotateY = ((event.clientX / window.innerWidth) - 0.5) * 12;
        panel.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      }
    }, { passive: true });
    card.addEventListener('mouseenter', () => { panel.style.transform = 'rotateX(0deg) rotateY(0deg)'; });

    resize();
    animate();

    const read = (key, fallback) => {
      try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; }
    };
    const write = (key, value) => {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
    };
    const show = (id) => {
      document.querySelectorAll('.form-step').forEach((step) => step.classList.remove('active'));
      $(id)?.classList.add('active');
    };
    const status = (message) => { if ($('form-status')) $('form-status').textContent = message || ''; };

    let mode = 'login';
    let currentUser = null;
    let activeChannel = 'general';
    const channelData = {
      general: 'Welcome to Moon Chat',
      'off-topic': 'Talk about anything',
      gaming: 'Games, clips, and squads',
      help: 'Ask the community'
    };

    function setMode(nextMode) {
      mode = nextMode;
      $('toggle-login').classList.toggle('active', mode === 'login');
      $('toggle-signup').classList.toggle('active', mode === 'signup');
      $('auth-title').textContent = mode === 'login' ? 'Welcome back' : 'Create an account';
      $('submit-btn').textContent = mode === 'login' ? 'Login' : 'Create account';
      $('birthdate-group').classList.toggle('hidden', mode !== 'signup');
      $('birthdate').required = mode === 'signup';
      status('');
    }

    $('toggle-login').addEventListener('click', () => setMode('login'));
    $('toggle-signup').addEventListener('click', () => setMode('signup'));

    $('auth-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const username = $('username').value.trim();
      const password = $('password').value;
      const key = username.toLowerCase();
      if (!username || password.length < 4 || (mode === 'signup' && !$('birthdate').value)) {
        status('Complete the required fields.');
        return;
      }
      const accounts = read('moon-chat-accounts', {});
      if (mode === 'signup') {
        if (accounts[key]) { status('That username is already taken.'); return; }
        currentUser = { username, password, role: key === 'steezy' ? 'owner' : 'member', mutedUntil: 0, banned: false };
        accounts[key] = currentUser;
        write('moon-chat-accounts', accounts);
        $('username-preview').textContent = username;
        show('customize-section');
        return;
      }
      currentUser = accounts[key];
      if (!currentUser || currentUser.password !== password) { status('Incorrect username or password.'); return; }
      if (currentUser.banned) { status('This account is banned.'); return; }
      if (key === 'steezy') currentUser.role = 'owner';
      enterChat();
    });

    function renderProfilePreview() {
      const color = $('font-color').value;
      $('username-preview').style.fontFamily = $('font-family').value;
      $('username-preview').style.color = color;
      $('username-preview').style.textShadow = $('glow-toggle').checked ? `0 0 14px ${color}` : 'none';
    }
    ['font-family', 'font-color', 'glow-toggle'].forEach((id) => $(id).addEventListener('input', renderProfilePreview));

    $('save-profile-btn').addEventListener('click', () => {
      if (!currentUser) return;
      renderProfilePreview();
      const accounts = read('moon-chat-accounts', {});
      accounts[currentUser.username.toLowerCase()] = currentUser;
      write('moon-chat-accounts', accounts);
      enterChat();
    });

    function messageKey() { return `moon-chat-messages-${activeChannel}`; }
    function renderMessage(message) {
      const block = document.createElement('article');
      block.className = 'msg-block';
      const head = document.createElement('div');
      head.className = 'msg-head';
      const author = document.createElement('b');
      author.textContent = message.username;
      const time = document.createElement('time');
      time.className = 'msg-time';
      time.textContent = message.time || '';
      head.append(author, time);
      const text = document.createElement('p');
      text.textContent = message.content;
      block.append(head, text);
      if (currentUser?.role === 'owner' && message.username.toLowerCase() !== 'steezy') {
        const tools = document.createElement('div');
        tools.className = 'mod-tools';
        [['timeout', 'Timeout'], ['mute', 'Mute'], ['ban', 'Ban']].forEach(([action, label]) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = label;
          button.addEventListener('click', () => moderate(action, message.username));
          tools.appendChild(button);
        });
        block.appendChild(tools);
      }
      $('message-container').appendChild(block);
    }
    function loadMessages() {
      $('message-container').replaceChildren();
      read(messageKey(), []).forEach(renderMessage);
    }
    function renderChannels() {
      const list = $('channel-list');
      list.replaceChildren();
      Object.keys(channelData).forEach((id) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `channel-btn${id === activeChannel ? ' active' : ''}`;
        button.textContent = `#  ${id}`;
        button.addEventListener('click', () => selectChannel(id));
        list.appendChild(button);
      });
    }
    function selectChannel(id) {
      activeChannel = id;
      $('room-title').textContent = `# ${id}`;
      $('channel-topic').textContent = channelData[id];
      $('chat-msg').placeholder = `Message # ${id}`;
      renderChannels();
      loadMessages();
    }
    function enterChat() {
      $('sidebar-username').textContent = currentUser.username;
      $('sidebar-role').textContent = currentUser.role === 'owner' ? 'Owner' : 'Member';
      $('user-avatar').textContent = currentUser.username.charAt(0).toUpperCase();
      $('user-role-badge').textContent = currentUser.role.toUpperCase();
      card.style.maxWidth = '1080px';
      show('chat-section');
      selectChannel(activeChannel);
      $('chat-msg').focus();
    }
    function moderate(action, target) {
      if (currentUser?.role !== 'owner') return;
      const accounts = read('moon-chat-accounts', {});
      const targetKey = target.toLowerCase();
      if (!accounts[targetKey]) return;
      if (action === 'ban') accounts[targetKey].banned = true;
      if (action === 'mute') accounts[targetKey].mutedUntil = Date.now() + 365 * 86400000;
      if (action === 'timeout') accounts[targetKey].mutedUntil = Date.now() + 600000;
      write('moon-chat-accounts', accounts);
    }
    $('chat-input-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('chat-msg');
      const content = input.value.trim();
      if (!content || !currentUser) return;
      const account = read('moon-chat-accounts', {})[currentUser.username.toLowerCase()];
      if (account?.mutedUntil > Date.now()) return;
      const message = { username: currentUser.username, content, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      const messages = read(messageKey(), []);
      messages.push(message);
      write(messageKey(), messages.slice(-100));
      renderMessage(message);
      input.value = '';
      input.focus();
    });

    renderProfilePreview();
    setMode('login');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
