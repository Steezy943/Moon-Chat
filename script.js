// --- Supabase Config Setup ---
const SUPABASE_URL = "https://supabase.co";
const SUPABASE_KEY = "sb_publishable_oD3pjw8LGY6uFblF0azYZQ_5CuGNZtL";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let authMode = 'login'; 
let currentUserSession = null;
let localUserMetadata = { role: 'user', username: '', font_family: '', font_color: '', text_glow: false };

// --- DOM Elements Cache ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
const cardContainer = document.getElementById('card-container');
const glassCard = document.getElementById('glass-card');
const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const birthdateInput = document.getElementById('birthdate');
const birthdateGroup = document.querySelector('.id-signup-only');
const submitBtn = document.getElementById('submit-btn');

// --- Interactive Particle Grid background ---
let particles = [];
const mouse = { x: null, y: null, radius: 160 };

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
});

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
}
window.addEventListener('resize', resizeCanvas);

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.radius = Math.random() * 1.5 + 1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        if (mouse.x && mouse.y) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < mouse.radius) {
                let force = (mouse.radius - distance) / mouse.radius;
                this.x += (dx / distance) * force * 2;
                this.y += (dy / distance) * force * 2;
            }
        }
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    let count = Math.floor((canvas.width * canvas.height) / 9500);
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    connectLines();
    requestAnimationFrame(animateParticles);
}
function connectLines() {
    for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
            let dx = particles[a].x - particles[b].x;
            let dy = particles[a].y - particles[b].y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 90) {
                let alpha = (90 - dist) / 90 * 0.12;
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particles[a].x, particles[a].y);
                ctx.lineTo(particles[b].x, particles[b].y);
                ctx.stroke();
            }
        }
    }
}
resizeCanvas();
animateParticles();

// --- 3D Glass Panel Pointer Tracking Matrix ---
let isHovered = false;
cardContainer.addEventListener('mouseenter', () => { isHovered = true; });
cardContainer.addEventListener('mouseleave', () => { isHovered = false; });

window.addEventListener('mousemove', (e) => {
    if (isHovered) {
        glassCard.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(15px)';
        return; 
    }
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    const tiltX = -(dy / centerY) * 18; 
    const tiltY = (dx / centerX) * 18;
    glassCard.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(0px)`;
});

// --- Auth Toggle Listeners ---
const toggleLogin = document.getElementById('toggle-login');
const toggleSignup = document.getElementById('toggle-signup');

toggleLogin.addEventListener('click', () => switchAuthMode('login'));
toggleSignup.addEventListener('click', () => switchAuthMode('signup'));

function switchAuthMode(mode) {
    authMode = mode;
    toggleLogin.classList.toggle('active', mode === 'login');
    toggleSignup.classList.toggle('active', mode === 'signup');
    document.getElementById('auth-title').innerText = mode === 'login' ? 'Welcome Back' : 'Create Account';
    submitBtn.innerText = mode === 'login' ? 'Login' : 'Next';

    if (mode === 'signup') {
        birthdateGroup.classList.remove('hidden');
        birthdateInput.setAttribute('required', 'true');
    } else {
        birthdateGroup.classList.add('hidden');
        birthdateInput.removeAttribute('required');
    }
}

// --- Auth Form Management Execution ---
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = usernameInput.value.trim();
    const pass = passwordInput.value;
    const bday = birthdateInput.value;

    if (authMode === 'signup') {
        // Authenticate anonymously bypassing emails cleanly
        const { data, error } = await supabase.auth.signInAnonymously({
            options: {
                data: {
                    display_username: user,
                    password_hash_ver: pass, // saved metadata for local comparison logic
                    birthdate: bday
                }
            }
        });

        if (error) { alert(`Sign-up Fail: ${error.message}`); return; }
        currentUserSession = data.user;
        
        document.getElementById('auth-section').classList.remove('active');
        document.getElementById('customize-section').classList.add('active');
        document.getElementById('username-preview').innerText = user;
    } else {
        // Look up corresponding identity rows
        const { data: matchedProfiles, error: lookupErr } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', user);
        if (lookupErr || !matchedProfiles || matchedProfiles.length === 0) {
            alert("No user exists with that username."); return;
        }

        // Sign in using cached credentials 
        const { data: authData, error: loginErr } = await supabase.auth.signInAnonymously();
        if (loginErr) { alert("Login interface error."); return; }

        currentUserSession = authData.user;
        // Override session reference pointers manually 
        currentUserSession.id = matchedProfiles.id;
        await initChatSystem();
    }
});

// --- Preview Syncer ---
const fontSelect = document.getElementById('font-family');
const colorInput = document.getElementById('font-color');
const glowToggle = document.getElementById('glow-toggle');
const previewSpan = document.getElementById('username-preview');

function updateLivePreview() {
    previewSpan.style.fontFamily = fontSelect.value;
    previewSpan.style.color = colorInput.value;
    previewSpan.style.textShadow = glowToggle.checked ? `0 0 10px ${colorInput.value}, 0 0 20px ${colorInput.value}` : 'none';
}
fontSelect.addEventListener('change', updateLivePreview);
colorInput.addEventListener('input', updateLivePreview);
glowToggle.addEventListener('change', updateLivePreview);

// --- Complete Profile Layer Setup ---
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    if (!currentUserSession) return;
    const user = usernameInput.value.trim();

    const profileData = {
        id: currentUserSession.id,
        username: user,
        avatar_url: document.getElementById('avatar').value,
        banner_url: document.getElementById('banner').value,
        font_family: fontSelect.value,
        font_color: colorInput.value,
        text_glow: glowToggle.checked,
        updated_at: new Date()
    };

    const { error } = await supabase.from('profiles').upsert(profileData);
    if (error) { alert(`Save failed: ${error.message}`); } else { await initChatSystem(); }
});

// --- Interactive Chat Space ---
async function initChatSystem() {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, username, is_banned, font_family, font_color, text_glow, muted_until')
        .eq('id', currentUserSession.id)
        .maybeSingle();

    if (error || !profile) { alert("Failed to resolve user account metadata."); return; }
    if (profile.is_banned) { alert("Account has been permanently banned."); window.location.reload(); return; }

    localUserMetadata = profile;
    document.getElementById('user-role-badge').innerText = `Role: ${profile.role.toUpperCase()}`;

    cardContainer.style.maxWidth = "780px"; 
    document.getElementById('auth-section').classList.remove('active');
    document.getElementById('customize-section').classList.remove('active');
    document.getElementById('chat-section').classList.add('active');

    loadMessages();
    listenToGlobalChat();
}

async function loadMessages() {
    const { data: messages } = await supabase.from('messages').select('*').order('id', { ascending: true }).limit(80);
    const container = document.getElementById('message-container');
    container.innerHTML = '';
    if (messages) messages.forEach(msg => displaySingleMessage(msg));
    container.scrollTop = container.scrollHeight;
}
function displaySingleMessage(msg) {
    const container = document.getElementById('message-container');
    const div = document.createElement('div');
    div.className = 'msg-block';
    
    let adminUI = '';
    if (localUserMetadata.role === 'owner' && msg.username.toLowerCase() !== 'steezy') {
        adminUI = `
            <div class="mod-tools">
                <button class="mod-btn" onclick="executeModAction('mute', '${msg.user_id}')">Mute</button>
                <button class="mod-btn" onclick="executeModAction('timeout', '${msg.user_id}')">10m</button>
                <button class="mod-btn" onclick="executeModAction('ban', '${msg.user_id}')">Ban</button>
            </div>
        `;
    }

    div.innerHTML = `
        <div class="msg-content-wrap">
            <span class="msg-author" style="font-family: ${msg.font_family || 'inherit'}; color: ${msg.font_color || '#fff'}; text-shadow: ${msg.text_glow ? '0 0 8px '+msg.font_color : 'none'}">${msg.username}:</span>
            <span class="msg-text">${msg.content}</span>
        </div>
        ${adminUI}
    `;
    container.appendChild(div);
}

function listenToGlobalChat() {
    supabase.channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            displaySingleMessage(payload.new);
            document.getElementById('message-container').scrollTop = document.getElementById('message-container').scrollHeight;
        }).subscribe();
}

document.getElementById('chat-input-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-msg');
    
    if (localUserMetadata.muted_until && new Date(localUserMetadata.muted_until) > new Date()) {
        alert("You are currently muted/timed out."); return;
    }

    await supabase.from('messages').insert({
        user_id: currentUserSession.id,
        username: localUserMetadata.username,
        content: input.value,
        font_family: localUserMetadata.font_family,
        font_color: localUserMetadata.font_color,
        text_glow: localUserMetadata.text_glow
    });
    input.value = '';
});

async function executeModAction(type, targetUserId) {
    let updateFields = {};
    if (type === 'ban') updateFields = { is_banned: true };
    else if (type === 'mute') updateFields = { muted_until: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365)) }; 
    else if (type === 'timeout') updateFields = { muted_until: new Date(new Date().getTime() + (10 * 60 * 1000)) };

    const { error } = await supabase.from('profiles').update(updateFields).eq('id', targetUserId);
    if (error) alert(`Error: ${error.message}`); else alert(`Applied ${type.toUpperCase()}`);
}
