(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('bg-canvas');
  const ctx = canvas.getContext('2d');
  const cardContainer = $('card-container');
  const glassCard = $('glass-card');
  let particles = [];
  let authMode = 'login';
  let cachedUser = null;
  let supabaseClient = null;
  const mouse = { x: -1000, y: -1000 };

  // The original page called supabase.createClient while declaring a const named
  // supabase, which throws before any click handler can be registered. Keep the
  // UI usable even when the optional backend is unavailable.
  function connectBackend() {
    const api = window.supabase;
    if (!api || !api.createClient) return null;
    const url = 'https://supabase.co';
    const key = 'sb_publishable_oD3pjw8LGY6uFblF0azYZQ_5CuGNZtL';
    try { return api.createClient(url, key); } catch (_) { return null; }
  }
  supabaseClient = connectBackend();

  function resizeCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio;
    canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles = Array.from({ length: Math.min(170, Math.max(55, Math.floor(innerWidth * innerHeight / 10500))) }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22, r: Math.random() * 1.35 + .45
    }));
  }
  function animate() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    particles.forEach((p) => {
      const dx = mouse.x - p.x, dy = mouse.y - p.y, distance = Math.hypot(dx, dy);
      if (distance < 160 && distance > 1) { const force = (160 - distance) / 160; p.x += dx / distance * force * .8; p.y += dy / distance * force * .8; }
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > innerWidth) p.vx *= -1;
      if (p.y < 0 || p.y > innerHeight) p.vy *= -1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill();
    });
    requestAnimationFrame(animate);
  }
  addEventListener('resize', resizeCanvas); addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  resizeCanvas(); animate();

  let insideCard = false;
  cardContainer.addEventListener('mouseenter', () => { insideCard = true; glassCard.style.transform = 'rotateX(0deg) rotateY(0deg)'; });
  cardContainer.addEventListener('mouseleave', () => { insideCard = false; });
  addEventListener('mousemove', (e) => {
    if (insideCard) return;
    const tiltY = ((e.clientX / innerWidth) - .5) * 10;
    const tiltX = -((e.clientY / innerHeight) - .5) * 10;
    glassCard.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  });

  function setStatus(message = '') { $('form-status').textContent = message; }
  function switchAuthMode(mode) {
    authMode = mode;
    $('toggle-login').classList.toggle('active', mode === 'login'); $('toggle-signup').classList.toggle('active', mode === 'signup');
    $('toggle-login').setAttribute('aria-selected', mode === 'login'); $('toggle-signup').setAttribute('aria-selected', mode === 'signup');
    $('auth-title').textContent = mode === 'login' ? 'Welcome back' : 'Create an account'; $('submit-btn').textContent = mode === 'login' ? 'Login' : 'Create account';
    $('birthdate').required = mode === 'signup'; $('birthdate').closest('.input-group').classList.toggle('hidden', mode !== 'signup'); setStatus();
  }
  $('toggle-login').addEventListener('click', () => switchAuthMode('login')); $('toggle-signup').addEventListener('click', () => switchAuthMode('signup'));

  function localAccounts() { try { return JSON.parse(localStorage.getItem('moon-chat-accounts') || '{}'); } catch (_) { return {}; } }
  function showStep(id) { document.querySelectorAll('.form-step').forEach((el) => el.classList.remove('active')); $(id).classList.add('active'); }
  async function authenticate(username, password, birthdate) {
    if (supabaseClient) {
      const { data, error } = authMode === 'signup'
        ? await supabaseClient.from('profiles').insert({ id: crypto.randomUUID(), username, password_plaintext_ver: password, birthdate, role: 'user' }).select().single()
        : await supabaseClient.from('profiles').select('*').eq('username', username).maybeSingle();
      if (!error && data && (authMode === 'signup' || data.password_plaintext_ver === password)) return data;
      if (authMode === 'login' && error) throw new Error('Unable to connect to the chat server.');
    }
    const accounts = localAccounts();
    if (authMode === 'signup') { if (accounts[username]) throw new Error('That username is already taken.'); accounts[username] = { id: username, username, password, birthdate, role: 'user' }; localStorage.setItem('moon-chat-accounts', JSON.stringify(accounts)); return accounts[username]; }
    if (!accounts[username] || accounts[username].password !== password) throw new Error('Incorrect username or password.');
    return accounts[username];
  }
  $('auth-form').addEventListener('submit', async (event) => {
    event.preventDefault(); setStatus(''); const username = $('username').value.trim(), password = $('password').value;
    if (!username || password.length < 4) { setStatus('Enter a username and a password of at least 4 characters.'); return; }
    $('submit-btn').disabled = true; $('submit-btn').textContent = 'Loading…';
    try { cachedUser = await authenticate(username, password, $('birthdate').value); if (authMode === 'signup') { $('username-preview').textContent = username; showStep('customize-section'); } else { initChat(); } }
    catch (error) { setStatus(error.message || 'Something went wrong.'); }
    finally { $('submit-btn').disabled = false; if ($('auth-section').classList.contains('active')) $('submit-btn').textContent = authMode === 'login' ? 'Login' : 'Create account'; }
  });

  function updatePreview() { const color = $('font-color').value; $('username-preview').style.fontFamily = $('font-family').value; $('username-preview').style.color = color; $('username-preview').style.textShadow = $('glow-toggle').checked ? `0 0 14px ${color}` : 'none'; }
  ['font-family', 'font-color', 'glow-toggle'].forEach((id) => $(id).addEventListener('input', updatePreview));
  $('save-profile-btn').addEventListener('click', async () => {
    updatePreview();
    if (supabaseClient && cachedUser?.id && cachedUser.id !== cachedUser.username) await supabaseClient.from('profiles').update({ avatar_url: $('avatar').value, banner_url: $('banner').value, font_family: $('font-family').value, font_color: $('font-color').value, text_glow: $('glow-toggle').checked }).eq('id', cachedUser.id);
    initChat();
  });

  function initChat() { $('user-role-badge').textContent = `Role: ${(cachedUser?.role || 'user').toUpperCase()}`; cardContainer.style.maxWidth = '780px'; showStep('chat-section'); loadMessages(); }
  function displayMessage(message) { const div = document.createElement('div'); div.className = 'msg-block'; const wrap = document.createElement('div'); wrap.className = 'msg-content-wrap'; const author = document.createElement('span'); author.className = 'msg-author'; author.textContent = message.username; const text = document.createElement('span'); text.className = 'msg-text'; text.textContent = message.content; wrap.append(author, text); div.appendChild(wrap); $('message-container').appendChild(div); }
  function loadMessages() { $('message-container').innerHTML = ''; const messages = JSON.parse(localStorage.getItem('moon-chat-messages') || '[]'); messages.forEach(displayMessage); }
  $('chat-input-form').addEventListener('submit', (event) => { event.preventDefault(); const input = $('chat-msg'), content = input.value.trim(); if (!content) return; const messages = JSON.parse(localStorage.getItem('moon-chat-messages') || '[]'); const message = { username: cachedUser?.username || 'Guest', content }; messages.push(message); localStorage.setItem('moon-chat-messages', JSON.stringify(messages.slice(-80))); displayMessage(message); input.value = ''; $('message-container').scrollTop = $('message-container').scrollHeight; });
})();
