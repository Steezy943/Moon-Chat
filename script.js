(() => {
  'use strict';
  
  const $ = id => document.getElementById(id);
  
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

  if (!localStorage.getItem('moon-chat-accounts')) {
    const defaultAccounts = {
      "user": { username: "User", password: "password", birthdate: "2000-01-01", picture: "", showAge: true, font: "Segoe UI, sans-serif", color: "#ffffff", glow: false, role: "member", banned: false, mutedUntil: 0 },
      "steezy": { username: "Steeezy", password: "password", birthdate: "1000-01-01", picture: "", showAge: true, font: "Segoe UI, sans-serif", color: "#ff5555", glow: true, role: "owner", banned: false, mutedUntil: 0 }
    };
    localStorage.setItem('moon-chat-accounts', JSON.stringify(defaultAccounts));
  }

  let mode = 'signup';
  let currentUser = null;
  let activeChannel = 'general';
  let userListTabMode = 'online'; 

  // Core Supabase Low-Latency Pipeline Connectivity Nodes
  const supabaseUrl = 'https://vmmipisnzgafawbmdrrw.supabase.com'; // <-- Enter your Supabase Project URL here
  const supabaseKey = 'sb_publishable_oD3pjw8LGY6uFblF0azYZQ_5CuGNZtL'; // <-- Enter your Supabase Anon API key here
  const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;
  let realtimeChannel = null;
  let registeredActiveMeshMembers = new Map();

  const channels = {
    general: 'Welcome to Moon Chat',
    'off-topic': 'Talk about anything',
    gaming: 'Games, clips, and squads',
    help: 'Ask the community'
  };

  const show = id => {
    document.querySelectorAll('.form-step').forEach(x => x.classList.remove('active'));
    const targetElement = $(id);
    if (targetElement) {
      targetElement.classList.add('active');
    }
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

  const canvas = $('bg-canvas');
  const ctx = canvas.getContext('2d');
  const mouse = { x: -999, y: -999 };
  let dots = [];

  function resize() {
    const d = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * d;
    canvas.height = innerHeight * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    
    dots = Array.from({ length: Math.min(140, Math.max(60, (innerWidth * innerHeight) / 14000)) }, () => ({
      originX: Math.random() * innerWidth,
      originY: Math.random() * innerHeight,
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.5 + 0.3
    }));
  }

  function animate() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    
    dots.forEach(p => {
      p.originX += p.vx;
      p.originY += p.vy;
      
      if (p.originX < 0 || p.originX > innerWidth) p.vx *= -1;
      if (p.originY < 0 || p.originY > innerHeight) p.vy *= -1;

      const dx = mouse.x - p.originX;
      const dy = mouse.y - p.originY;
      const distance = Math.hypot(dx, dy);
      const activeRadius = 180;
      if (distance < activeRadius) {
        const force = (activeRadius - distance) / activeRadius;
        p.x += (mouse.x - p.x) * force * 0.08;
        p.y += (mouse.y - p.y) * force * 0.08;
      } else {
        p.x += (p.originX - p.x) * 0.04;
        p.y += (p.originY - p.y) * 0.04;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
      ctx.fill();
    });
    
    requestAnimationFrame(animate);
  }

  addEventListener('resize', resize);
  
  addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    
    const card = document.getElementById('glass-card');
    if (card && !document.getElementById('card-container').matches(':hover')) {
      const rotateX = -((e.clientY / innerHeight) - 0.5) * 14;
      const rotateY = ((e.clientX / innerWidth) - 0.5) * 14;
      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }
  }, { passive: true });

  const mainCardContainer = document.getElementById('card-container');
  if (mainCardContainer) {
    mainCardContainer.onmouseenter = () => {
      const card = document.getElementById('glass-card');
      if (card) card.style.transform = 'rotateX(0deg) rotateY(0deg)';
    };
  }
  
  resize();
  animate();

  window.setMode = function(m) {
    mode = m;
    const loginToggle = document.getElementById('toggle-login');
    const signupToggle = document.getElementById('toggle-signup');
    const authTitle = document.getElementById('auth-title');
    const submitBtn = document.getElementById('submit-btn');
    const birthdateGroup = document.getElementById('birthdate-group');
    const birthdateInput = document.getElementById('birthdate');
    const formStatus = document.getElementById('form-status');

    if (loginToggle) loginToggle.classList.toggle('active', m === 'login');
    if (signupToggle) signupToggle.classList.toggle('active', m === 'signup');
    if (authTitle) authTitle.textContent = m === 'login' ? 'Welcome back' : 'Create account';
    if (submitBtn) submitBtn.textContent = m === 'login' ? 'Login' : 'Create account';
    if (birthdateGroup) birthdateGroup.classList.toggle('hidden', m !== 'signup');
    if (birthdateInput) birthdateInput.required = m === 'signup';
    if (formStatus) formStatus.textContent = '';
  };

  const authForm = document.getElementById('auth-form');
  if (authForm) {
    authForm.onsubmit = e => {
      e.preventDefault();
      const usernameInput = document.getElementById('username');
      const passwordInput = document.getElementById('password');
      const birthdateInput = document.getElementById('birthdate');
      const formStatus = document.getElementById('form-status');

      const name = usernameInput ? usernameInput.value.trim() : '';
      const pass = passwordInput ? passwordInput.value : '';
      const keyName = name.toLowerCase();
      const birthdate = birthdateInput ? birthdateInput.value : '';

      if (!name || pass.length < 4 || (mode === 'signup' && !birthdate)) {
        if (formStatus) formStatus.textContent = 'Complete the required fields.';
        return;
      }
      const a = read('moon-chat-accounts', {});
      if (mode === 'signup') {
        if (a[keyName]) {
          if (formStatus) formStatus.textContent = 'That username is already taken.';
          return;
        }
        currentUser = { username: name, password: pass, birthdate, picture: '', showAge: true, font: 'Segoe UI, sans-serif', color: '#ffffff', glow: false, role: keyName === 'steezy' ? 'owner' : 'member', banned: false, mutedUntil: 0 };
        a[keyName] = currentUser;
        write('moon-chat-accounts', a);
        enterChat();
      } else {
        currentUser = a[keyName];
        if (!currentUser || currentUser.password !== pass) {
          if (formStatus) formStatus.textContent = 'Incorrect username or password.';
          return;
        }
        if (currentUser.banned) {
          if (formStatus) formStatus.textContent = 'This account is banned.';
          return;
        }
        if (keyName === 'steezy') currentUser.role = 'owner';
        enterChat();
      }
    };
  }
  function key() {
    return `moon-chat-messages-${activeChannel}`;
  }

  function scrollToBottom() {
    const container = document.getElementById('message-container');
    if (container) container.scrollTop = container.scrollHeight;
  }

  function render(m) {
    const b = document.createElement('article');
    b.className = 'msg-block';

    const accounts = read('moon-chat-accounts', {});
    const authorData = accounts[m.username.toLowerCase()] || {};
    
    if (authorData.picture) {
      const avatarImg = document.createElement('img');
      avatarImg.className = 'avatar';
      avatarImg.src = authorData.picture;
      avatarImg.alt = m.username;
      b.append(avatarImg);
    } else {
      const avatarFallback = document.createElement('span');
      avatarFallback.className = 'avatar';
      avatarFallback.textContent = m.username.toUpperCase().charAt(0);
      b.append(avatarFallback);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'msg-body-wrapper';

    const h = document.createElement('div');
    h.className = 'msg-head';
    
    const n = document.createElement('button');
    n.className = 'msg-author';
    n.textContent = m.username;
    
    if (authorData.font) n.style.fontFamily = authorData.font;
    if (authorData.color) n.style.color = authorData.color;
    if (authorData.glow && authorData.color) {
      n.style.textShadow = `0 0 10px ${authorData.color}`;
    }
    
    n.onclick = () => openProfile(m.username);
    
    const t = document.createElement('time');
    t.className = 'msg-time';
    t.textContent = m.time || '';
    h.append(n, t);
    
    const p = document.createElement('p');
    p.textContent = m.content;
    wrapper.append(h, p);

    if (currentUser?.role === 'owner' && m.username.toLowerCase() !== 'steezy') {
      const tools = document.createElement('div');
      tools.className = 'mod-tools';
      ['timeout', 'mute', 'ban'].forEach(act => {
        const x = document.createElement('button');
        x.textContent = act;
        x.onclick = () => moderate(act, m.username);
        tools.append(x);
      });
      wrapper.append(tools);
    }
    
    b.append(wrapper);
    const msgContainer = document.getElementById('message-container');
    if (msgContainer) msgContainer.append(b);
  }

  function load() {
    const msgContainer = document.getElementById('message-container');
    if (msgContainer) msgContainer.replaceChildren();
    read(key(), []).forEach(render);
    scrollToBottom();
  }
  function chans() {
    const l = document.getElementById('channel-list');
    if (l) {
      l.replaceChildren();
      Object.keys(channels).forEach(id => {
        const b = document.createElement('button');
        b.className = `channel-btn${id === activeChannel ? ' active' : ''}`;
        b.textContent = `#  ${id}`;
        b.onclick = () => select(id);
        l.append(b);
      });
    }
  }

  function select(id) {
    activeChannel = id;
    const roomTitle = document.getElementById('room-title');
    const channelTopic = document.getElementById('channel-topic');
    const chatMsgInput = document.getElementById('chat-msg');

    if (roomTitle) roomTitle.textContent = `# ${id}`;
    if (channelTopic) channelTopic.textContent = channels[id];
    if (chatMsgInput) chatMsgInput.placeholder = `Message # ${id}`;
    chans();
    load();
  }

  function enterChat() {
    const sidebarUser = document.getElementById('sidebar-username');
    const sidebarRole = document.getElementById('sidebar-role');
    const userAvatar = document.getElementById('user-avatar');
    const userAvatarImg = document.getElementById('user-avatar-image');
    const roleBadge = document.getElementById('user-role-badge');
    const cardContainer = document.getElementById('card-container');

    if (sidebarUser) sidebarUser.textContent = currentUser.username;
    if (sidebarRole) sidebarRole.textContent = currentUser.role === 'owner' ? 'Owner' : 'Member';
    if (userAvatar) userAvatar.textContent = currentUser.username.toUpperCase().charAt(0);
    if (userAvatarImg) img(userAvatarImg, currentUser.picture);
    if (roleBadge) roleBadge.textContent = currentUser.role.toUpperCase();
    if (cardContainer) cardContainer.style.maxWidth = '1140px';
    
    show('chat-section');
    select(activeChannel);
    initWebSocketSync();
  }

  function initWebSocketSync() {
    if (!supabase) {
      console.error("Supabase script node missing from HTML layout frame.");
      return;
    }
    if (realtimeChannel) return;

    realtimeChannel = supabase.channel('moon-chat-global-room-2026', {
      config: { presence: { key: currentUser.username.toLowerCase() } }
    });

    // 1. DYNAMIC BROADCAST RECEIVED EVENT LISTENER
    realtimeChannel.on('broadcast', { event: 'shuttle-msg' }, payload => {
      const data = payload.payload;
      if (data && data.channel === activeChannel) {
        const ms = read(`moon-chat-messages-${data.channel}`, []);
        if (!ms.some(existing => existing.id === data.msg.id)) {
          ms.push(data.msg);
          write(`moon-chat-messages-${data.channel}`, ms.slice(-100));
          render(data.msg);
          scrollToBottom();
        }
      }
    });

    // 2. LIVE PRESENCE MAP CHANGES LISTENER
    realtimeChannel.on('presence', { event: 'sync' }, () => {
      const state = realtimeChannel.presenceState();
      registeredActiveMeshMembers.clear();
      
      Object.keys(state).forEach(key => {
        const presenceInfo = state[key][0];
        if (presenceInfo && presenceInfo.username) {
          registeredActiveMeshMembers.set(key, { username: presenceInfo.username, lastSeen: Date.now() });
        }
      });
      renderUserSidebarList();
    });

    realtimeChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await realtimeChannel.track({ username: currentUser.username, onlineAt: new Date().toISOString() });
      }
    });
  }
  function renderUserSidebarList() {
    const listContainer = document.getElementById('users-box-list');
    if (!listContainer) return;
    listContainer.replaceChildren();

    const accounts = read('moon-chat-accounts', {});
    registeredActiveMeshMembers.forEach((val, key) => {
      if (Date.now() - val.lastSeen > 25000) registeredActiveMeshMembers.delete(key);
    });

    Object.keys(accounts).forEach(keyName => {
      const account = accounts[keyName];
      const isOnline = registeredActiveMeshMembers.has(keyName) || account.username.toLowerCase() === currentUser.username.toLowerCase();

      if (userListTabMode === 'online' && !isOnline) return;
      if (userListTabMode === 'offline' && isOnline) return;

      const row = document.createElement('div');
      row.className = `user-item-row ${!isOnline ? 'offline-status' : ''}`;

      if (account.picture) {
        const pimg = document.createElement('img');
        pimg.className = 'avatar';
        pimg.src = account.picture;
        row.append(pimg);
      } else {
        const fallback = document.createElement('span');
        fallback.className = 'avatar';
        fallback.textContent = account.username.toUpperCase().charAt(0);
        row.append(fallback);
      }

      const nameLabel = document.createElement('span');
      nameLabel.className = 'user-item-name';
      nameLabel.textContent = account.username;
      row.append(nameLabel);
      listContainer.append(row);
    });
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

  const chatInputForm = document.getElementById('chat-input-form');
  if (chatInputForm) {
    chatInputForm.onsubmit = e => {
      e.preventDefault();
      const chatMsgInput = document.getElementById('chat-msg');
      const c = chatMsgInput ? chatMsgInput.value.trim() : '';
      const a = read('moon-chat-accounts', {})[currentUser.username.toLowerCase()];
      if (!c || a?.mutedUntil > Date.now()) return;
      
      const m = {
        id: currentUser.username + "-" + Date.now() + "-" + Math.floor(Math.random() * 100000),
        username: currentUser.username,
        content: c,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      const ms = read(key(), []);
      ms.push(m);
      write(key(), ms.slice(-100));
      render(m);
      scrollToBottom();

      // Emit data payloads directly into Supabase Realtime Channels
      if (realtimeChannel) {
        realtimeChannel.send({
          type: 'broadcast',
          event: 'shuttle-msg',
          payload: { channel: activeChannel, msg: m }
        });
      }
      if (chatMsgInput) chatMsgInput.value = '';
    };
  }

  window.openSettings = function() {
    const u = currentUser || {};
    const setPic = document.getElementById('settings-picture');
    const setDisp = document.getElementById('settings-display-name');
    const setAge = document.getElementById('settings-age');
    const setShowAge = document.getElementById('settings-show-age');
    const setFont = document.getElementById('settings-font');
    const setColor = document.getElementById('settings-color');
    const setGlow = document.getElementById('settings-glow');
    const setPanel = document.getElementById('settings-panel');

    if (setPic) setPic.value = u.picture || '';
    if (setDisp) setDisp.value = u.username || '';
    if (setAge) setAge.value = u.age || '';
    if (setShowAge) setShowAge.checked = u.showAge !== false;
    if (setFont) setFont.value = u.font || 'Segoe UI, sans-serif';
    if (setColor) setColor.value = u.color || '#fff';
    if (setGlow) setGlow.checked = !!u.glow;
    if (setPanel) setPanel.classList.remove('hidden');
  };

  window.openProfile = function(name) {
    const u = read('moon-chat-accounts', {})[name.toLowerCase()] || {};
    const popName = document.getElementById('popup-name');
    const popAcc = document.getElementById('popup-account');
    const popPic = document.getElementById('popup-picture');
    const popAge = document.getElementById('popup-age');
    const popPopup = document.getElementById('profile-popup');

    if (popName) popName.textContent = u.username || name;
    if (popAcc) popAcc.textContent = `Account: ${u.username || name}`;
    if (popPic) img(popPic, u.picture);
    if (popAge) popAge.textContent = u.showAge !== false && u.age ? `Age: ${u.age}` : 'Age hidden';
    if (popPopup) popPopup.classList.remove('hidden');
  };

  const saveSettingsBtn = document.getElementById('save-settings');
  if (saveSettingsBtn) {
    saveSettingsBtn.onclick = () => {
      const setDisp = document.getElementById('settings-display-name');
      const setPic = document.getElementById('settings-picture');
      const setAge = document.getElementById('settings-age');
      const setShowAge = document.getElementById('settings-show-age');
      const setFont = document.getElementById('settings-font');
      const setColor = document.getElementById('settings-color');
      const setGlow = document.getElementById('settings-glow');

      const old = currentUser.username;
      const keyName = old.toLowerCase();
      const a = read('moon-chat-accounts', {});

      currentUser.username = setDisp && setDisp.value.trim() ? setDisp.value.trim() : old;
      currentUser.picture = setPic ? setPic.value.trim() : '';
      currentUser.age = setAge ? setAge.value : '';
      currentUser.showAge = setShowAge ? setShowAge.checked : true;
      currentUser.font = setFont ? setFont.value : 'Segoe UI, sans-serif';
      currentUser.color = setColor ? setColor.value : '#fff';
      currentUser.glow = setGlow ? setGlow.checked : false;

      delete a[keyName];
      a[currentUser.username.toLowerCase()] = currentUser;
      write('moon-chat-accounts', a);
      enterChat();
      const setPanel = document.getElementById('settings-panel');
      if (setPanel) setPanel.classList.add('hidden');
    };
  }

  const tabOnlineBtn = document.getElementById('tab-online-btn');
  if (tabOnlineBtn) {
    tabOnlineBtn.onclick = () => {
      userListTabMode = 'online';
      tabOnlineBtn.classList.add('active');
      const tabOfflineBtn = document.getElementById('tab-offline-btn');
      if (tabOfflineBtn) tabOfflineBtn.classList.remove('active');
      renderUserSidebarList();
    };
  }
  
  const tabOfflineBtn = document.getElementById('tab-offline-btn');
  if (tabOfflineBtn) {
    tabOfflineBtn.onclick = () => {
      userListTabMode = 'offline';
      tabOfflineBtn.classList.add('active');
      const tabOnlineBtn = document.getElementById('tab-online-btn');
      if (tabOnlineBtn) tabOnlineBtn.classList.remove('active');
      renderUserSidebarList();
    };
  }

  function forceFreshOnboardingStart() {
    currentUser = null;
    window.setMode('signup');
    show('auth-section');
    const authBox = document.getElementById('auth-section');
    if (authBox) authBox.scrollTop = 0;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceFreshOnboardingStart);
  } else {
    forceFreshOnboardingStart();
  }
})();
