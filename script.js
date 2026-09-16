(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const channels = [
    { id: 'general', name: 'general', topic: 'Welcome to Moon Chat' },
    { id: 'off-topic', name: 'off-topic', topic: 'Talk about anything' },
    { id: 'gaming', name: 'gaming', topic: 'Games, clips, and squads' },
    { id: 'help', name: 'help', topic: 'Ask the community' }
  ];
  let mode = 'login', user = null, activeChannel = 'general';

  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const show = id => { document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active')); $(id)?.classList.add('active'); };

  // Background dots
  const canvas = $('bg-canvas'), ctx = canvas.getContext('2d'), mouse = { x: -999, y: -999 }; let dots = [];
  function resize() { const d = Math.min(devicePixelRatio || 1, 2); canvas.width = innerWidth * d; canvas.height = innerHeight * d; ctx.setTransform(d,0,0,d,0,0); dots = Array.from({ length: Math.max(80, Math.min(180, innerWidth * innerHeight / 10000)) }, () => ({ x: Math.random()*innerWidth, y: Math.random()*innerHeight, vx: (Math.random()-.5)*.25, vy: (Math.random()-.5)*.25, r: Math.random()*1.5+.5 })); }
  function animate() { ctx.clearRect(0,0,innerWidth,innerHeight); dots.forEach(p => { const dx=mouse.x-p.x, dy=mouse.y-p.y, dist=Math.hypot(dx,dy); if(dist<170&&dist>0){const f=(170-dist)/170;p.x+=dx/dist*f*.8;p.y+=dy/dist*f*.8;} p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>innerWidth)p.vx*=-1;if(p.y<0||p.y>innerHeight)p.vy*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();}); requestAnimationFrame(animate); }
  addEventListener('resize', resize); addEventListener('mousemove', e => { mouse.x=e.clientX;mouse.y=e.clientY; const card=$('card-container'), panel=$('glass-card'); if(!card.matches(':hover')) panel.style.transform=`rotateX(${-(e.clientY/innerHeight-.5)*12}deg) rotateY(${(e.clientX/innerWidth-.5)*12}deg)`; }); $('card-container').addEventListener('mouseenter', () => $('glass-card').style.transform='rotateX(0) rotateY(0)'); resize(); animate();

  function status(message='') { $('form-status').textContent = message; }
  function setMode(next) { mode=next; $('toggle-login').classList.toggle('active',mode==='login');$('toggle-signup').classList.toggle('active',mode==='signup');$('auth-title').textContent=mode==='login'?'Welcome back':'Create an account';$('submit-btn').textContent=mode==='login'?'Login':'Create account';$('birthdate-group').classList.toggle('hidden',mode!=='signup');$('birthdate').required=mode==='signup';status(); }
  $('toggle-login').onclick=()=>setMode('login'); $('toggle-signup').onclick=()=>setMode('signup');

  $('auth-form').onsubmit = e => { e.preventDefault(); const name=$('username').value.trim(), password=$('password').value, birthdate=$('birthdate').value; if(!name||password.length<4||(mode==='signup'&&!birthdate)){status('Complete the required fields.');return;} const accounts=read('moon-chat-accounts',{}), key=name.toLowerCase(); if(mode==='signup'){if(accounts[key]){status('That username is already taken.');return;} user={username:name,password,birthdate,role:key==='steezy'?'owner':'member',banned:false,mutedUntil:0};accounts[key]=user;write('moon-chat-accounts',accounts);$('username-preview').textContent=name;show('customize-section');}else{user=accounts[key];if(!user||user.password!==password){status('Incorrect username or password.');return;}if(user.banned){status('This account is banned.');return;}if(key==='steezy'){user.role='owner';accounts[key]=user;write('moon-chat-accounts',accounts);}enterChat();} };

  function preview(){const c=$('font-color').value,p=$('username-preview');p.style.fontFamily=$('font-family').value;p.style.color=c;p.style.textShadow=$('glow-toggle').checked?`0 0 14px ${c}`:'none';}
  ['font-family','font-color','glow-toggle'].forEach(id=>$(id).addEventListener('input',preview)); $('save-profile-btn').onclick=()=>{user.font=$('font-family').value;user.color=$('font-color').value;user.glow=$('glow-toggle').checked;const a=read('moon-chat-accounts',{});a[user.username.toLowerCase()]=user;write('moon-chat-accounts',a);enterChat();};

  function messageKey(){return `moon-chat-messages-${activeChannel}`;}
  function renderMessage(msg){const block=document.createElement('article');block.className='msg-block';const head=document.createElement('div');head.className='message-head';const author=document.createElement('b');author.textContent=msg.username;const time=document.createElement('time');time.textContent=msg.time||'';head.append(author,time);const text=document.createElement('p');text.textContent=msg.content;block.append(head,text);if(user?.role==='owner'&&msg.username.toLowerCase()!=='steezy'){const tools=document.createElement('div');tools.className='mod-tools';[['timeout','Timeout'],['mute','Mute'],['ban','Ban']].forEach(([action,label])=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>moderate(action,msg.username);tools.append(b);});block.append(tools);} $('message-container').append(block);}
  function loadMessages(){ $('message-container').innerHTML='';read(messageKey(),[]).forEach(renderMessage);$('message-container').scrollTop=$('message-container').scrollHeight; }
  function renderChannels(){const list=$('channel-list');list.innerHTML='';channels.forEach(ch=>{const b=document.createElement('button');b.className=`channel-btn ${ch.id===activeChannel?'active':''}`;b.innerHTML=`<span>#</span>${ch.name}`;b.onclick=()=>selectChannel(ch.id);list.append(b);});}
  function selectChannel(id){activeChannel=id;const ch=channels.find(c=>c.id===id);$('room-title').textContent=`# ${ch.name}`;$('channel-topic').textContent=ch.topic;$('chat-msg').placeholder=`Message # ${ch.name}`;renderChannels();loadMessages();}
  function enterChat(){ $('sidebar-username').textContent=user.username;$('sidebar-role').textContent=user.role==='owner'?'Owner':'Member';$('user-avatar').textContent=user.username[0].toUpperCase();$('user-role-badge').textContent=user.role.toUpperCase();$('card-container').style.maxWidth='1080px';show('chat-section');renderChannels();selectChannel(activeChannel);$('chat-msg').focus(); }
  function moderate(action,target){if(user?.role!=='owner')return;const accounts=read('moon-chat-accounts',{}),key=target.toLowerCase();if(!accounts[key])return;if(action==='ban')accounts[key].banned=true;if(action==='mute')accounts[key].mutedUntil=Date.now()+365*24*60*60*1000;if(action==='timeout')accounts[key].mutedUntil=Date.now()+10*60*1000;write('moon-chat-accounts',accounts);alert(`${target} was ${action}d.`);}
  $('chat-input-form').onsubmit=e=>{e.preventDefault();const input=$('chat-msg'),content=input.value.trim();if(!content||!user)return;const accounts=read('moon-chat-accounts',{}),stored=accounts[user.username.toLowerCase()];if(stored?.mutedUntil>Date.now()){alert('You are currently muted.');return;}const msg={username:user.username,content,time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})};const messages=read(messageKey(),[]);messages.push(msg);write(messageKey(),messages.slice(-100));renderMessage(msg);input.value='';$('message-container').scrollTop=$('message-container').scrollHeight;};
  preview();setMode('login');
})();
