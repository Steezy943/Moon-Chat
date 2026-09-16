(() => {
  'use strict';
  
  const \$ = id => document.getElementById(id);
  
  const read = (k, f) => {
    try {
      return JSON.parse(localStorage.getItem(k) || JSON.stringify(f));
    } catch {
      return f;
    }
  };
  
  const write = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  };

  let mode = 'login';
  let currentUser = null;
  let activeChannel = 'general';

  const channels = {
    general: 'Welcome to Moon Chat',
    'off-topic': 'Talk about anything',
    gaming: 'Games, clips, and squads',
    help: 'Ask the community'
  };

  const show = id => {
    document.querySelectorAll('.form-step').forEach(x => x.classList.remove('active'));
    \$(id)?.classList.add('active');
  };

  const img = (el, url) => {
    if (url) {
      el.src = url;
      el.classList.remove('hidden');
      el.onerror = () => el.classList.add('hidden');
    } else {
      el.classList.add('hidden');
    }
  };

  const canvas = \$('bg-canvas');
  const ctx = canvas.getContext('2d');
  const mouse = { x: -999, y: -999 };
  let dots = [];

  function resize() {
    const d = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * d;
    canvas.height = innerHeight * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    dots = Array.from({ length: Math.min(130, Math.max(55, innerWidth * innerHeight / 16000)) }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      vx: (Math.random() - .5) * .25,
      vy: (Math.random() - .5) * .25,
      r: Math.random() * 1.4 + .6
    }));
  }

  function animate() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    dots.forEach(p => {
      const x = mouse.x - p.x, y = mouse.y - p.y, d = Math.hypot(x, y);
      if (d > 0 && d < 170) {
        const f = (170 - d) / 170;
        p.x += x / d * f * .6;
        p.y += y / d * f * .6;
      }
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > innerWidth) p.vx *= -1;
      if (p.y < 0 || p.y > innerHeight) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });
    requestAnimationFrame(animate);
  }

  addEventListener('resize', resize);
  addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (!\(('card-container').matches(':hover')) {\)('glass-card').style.transform = `rotateX(${-(e.clientY / innerHeight - .5) * 12}deg) rotateY(${(e.clientX / innerWidth - .5) * 12}deg)`;
    }
  }, { passive: true });
  ('card-container').onmouseenter = () => ('glass-card').style.transform = 'rotateX(0) rotateY(0)';
  
  resize();
  animate();

  function setMode(m) {
    mode = m;
    \$('toggle-login').classList.toggle('active', m === 'login');
    \(('toggle-signup').classList.toggle('active', m === 'signup');\)('auth-title').textContent = m === 'login' ? 'Welcome back' : 'Create an account';
    \(('submit-btn').textContent = m === 'login' ? 'Login' : 'Create account';\)('birthdate-group').classList.toggle('hidden', m !== 'signup');
    \(('birthdate').required = m === 'signup';\)('form-status').textContent = '';
  }

  \(('toggle-login').onclick = () => setMode('login');\)('toggle-signup').onclick = () => setMode('signup');

  \$('auth-form').onsubmit = e => {
    e.preventDefault();
    const name = \$('username').value.trim(), pass = ('password').value, keyName = name.toLowerCase(), birthdate = ('birthdate').value;
    if (!name || pass.length < 4 || (mode === 'signup' && !birthdate)) {
      \$('form-status').textContent = 'Complete the required fields.';
      return;
    }
    const a = read('moon-chat-accounts', {});
    if (mode === 'signup') {
      if (a[keyName]) {
        \$('form-status').textContent = 'That username is already taken.';
        return;
      }
      currentUser = { username: name, password: pass, birthdate, picture: '', showAge: true, role: keyName === 'steezy' ? 'owner' : 'member', banned: false, mutedUntil: 0 };
      a[keyName] = currentUser;
      write('moon-chat-accounts', a);
      \$('username-preview').textContent = name;
      show('customize-section');
    } else {
      currentUser = a[keyName];
      if (!currentUser || currentUser.password !== pass) {
        \$('form-status').textContent = 'Incorrect username or password.';
        return;
      }
      if (currentUser.banned) {
        \$('form-status').textContent = 'This account is banned.';
        return;
      }
      if (keyName === 'steezy') currentUser.role = 'owner';
      enterChat();
    }
  };

  function preview() {
    const p = ('username-preview'), c = ('font-color').value;
    p.style.fontFamily = \$('font-family').value;
    p.style.color = c;
    p.style.textShadow = \$('glow-toggle').checked ? `0 0 14px ${c}` : 'none';
    img(('profile-preview-image'), ('profile-picture').value.trim());
  }

  ['font-family', 'font-color', 'glow-toggle', 'profile-picture'].forEach(id => \$(id).addEventListener('input', preview));

  \$('save-profile-btn').onclick = () => {
    currentUser.picture = \$('profile-picture').value.trim();
    currentUser.font = \$('font-family').value;
    currentUser.color = \$('font-color').value;
    currentUser.glow = \$('glow-toggle').checked;
    const a = read('moon-chat-accounts', {});
    a[currentUser.username.toLowerCase()] = currentUser;
    write('moon-chat-accounts', a);
    enterChat();
  };

  function key() {
    return `moon-chat-messages-${activeChannel}`;
  }

  function scrollToBottom() {
    const container = \$('message-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
  function render(m) {
    const b = document.createElement('article');
    b.className = 'msg-block';
    const h = document.createElement('div');
    h.className = 'msg-head';
    const n = document.createElement('button');
    n.className = 'msg-author';
    n.textContent = m.username;
    n.onclick = () => openProfile(m.username);
    const t = document.createElement('time');
    t.className = 'msg-time';
    t.textContent = m.time || '';
    h.append(n, t);
    const p = document.createElement('p');
    p.textContent = m.content;
    b.append(h, p);

    if (currentUser?.role === 'owner' && m.username.toLowerCase() !== 'steezy') {
      const tools = document.createElement('div');
      tools.className = 'mod-tools';
      ['timeout', 'mute', 'ban'].forEach(act => {
        const x = document.createElement('button');
        x.textContent = act;
        x.onclick = () => moderate(act, m.username);
        tools.append(x);
      });
      b.append(tools);
    }
    \$('message-container').append(b);
  }

  function load() {
    \$('message-container').replaceChildren();
    read(key(), []).forEach(render);
    scrollToBottom();
  }

  function chans() {
    const l = \$('channel-list');
    l.replaceChildren();
    Object.keys(channels).forEach(id => {
      const b = document.createElement('button');
      b.className = `channel-btn${id === activeChannel ? ' active' : ''}`;
      b.textContent = `#  ${id}`;
      b.onclick = () => select(id);
      l.append(b);
    });
  }

  function select(id) {
    activeChannel = id;
    \$('room-title').textContent = `# ${id}`;
    \(('channel-topic').textContent = channels[id];\)('chat-msg').placeholder = `Message # ${id}`;
    chans();
    load();
  }

  function enterChat() {
    \$('sidebar-username').textContent = currentUser.username;
    \(('sidebar-role').textContent = currentUser.role === 'owner' ? 'Owner' : 'Member';\)('user-avatar').textContent = currentUser.username.toUpperCase();
    img(\$('user-avatar-image'), currentUser.picture);
    \(('user-role-badge').textContent = currentUser.role.toUpperCase();\)('card-container').style.maxWidth = '1080px';
    show('chat-section');
    select(activeChannel);
  }

  function moderate(act, target) {
    if (currentUser?.role !== 'owner') return;
    const a = read('moon-chat-accounts', {}), k = target.toLowerCase();
    if (!a[k]) return;
    if (act === 'ban') a[k].banned = true;
    if (act === 'mute') a[k].mutedUntil = Date.now() + 365 * 86400000;
    if (act === 'timeout') a[k].mutedUntil = Date.now() + 600000;
    write('moon-chat-accounts', a);
  }

  \$('chat-input-form').onsubmit = e => {
    e.preventDefault();
    const i = \$('chat-msg'), c = i.value.trim(), a = read('moon-chat-accounts', {})[currentUser.username.toLowerCase()];
    if (!c || a?.mutedUntil > Date.now()) return;
    const m = {
      username: currentUser.username,
      content: c,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const ms = read(key(), []);
    ms.push(m);
    write(key(), ms.slice(-100));
    render(m);
    scrollToBottom();
    i.value = '';
  };

  window.addEventListener('storage', e => {
    if (e.key === key()) {
      load();
    }
  });

  function openSettings() {
    const u = currentUser || {};
    \(('settings-picture').value = u.picture \vert{}\vert{} '';\)('settings-display-name').value = u.username || '';
    \(('settings-age').value = u.age \vert{}\vert{} '';\)('settings-show-age').checked = u.showAge !== false;
    \(('settings-font').value = u.font \vert{}\vert{} 'Segoe UI, sans-serif';\)('settings-color').value = u.color || '#fff';
    \$('settings-glow').checked = !!u.glow;
    \$('settings-panel').classList.remove('hidden');
  }

  function openProfile(name) {
    const u = read('moon-chat-accounts', {})[name.toLowerCase()] || {};
    \$('popup-name').textContent = u.username || name;
    \$('popup-account').textContent = `Account: ${u.username || name}`;
    img(\(('popup-picture'), u.picture);\)('popup-age').textContent = u.showAge !== false && u.age ? `Age: ${u.age}` : 'Age hidden';
    \$('profile-popup').classList.remove('hidden');
  }

  \$('settings-btn').onclick = openSettings;
  \$('close-settings').onclick = () => \(('settings-panel').classList.add('hidden');\)('account-button').onclick = () => openProfile(currentUser.username);
  ('close-profile').onclick = () => ('profile-popup').classList.add('hidden');

  \$('save-settings').onclick = () => {
    const old = currentUser.username, keyName = old.toLowerCase(), a = read('moon-chat-accounts', {});
    currentUser.username = \$('settings-display-name').value.trim() || old;
    currentUser.picture = \$('settings-picture').value.trim();
    currentUser.age = \$('settings-age').value;
    currentUser.showAge = \$('settings-show-age').checked;
    currentUser.font = \$('settings-font').value;
    currentUser.color = \$('settings-color').value;
    currentUser.glow = \$('settings-glow').checked;
    delete a[keyName];
    a[currentUser.username.toLowerCase()] = currentUser;
    write('moon-chat-accounts', a);
    enterChat();
    \$('settings-panel').classList.add('hidden');
  };

  setMode('login');
})();
