// Initialize Supabase configuration
const SUPABASE_URL = "https://supabase.co";
const SUPABASE_KEY = "sb_publishable_oD3pjw8LGY6uFblF0azYZQ_5CuGNZtL";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let authMode = 'login'; 
let currentUserSession = null;
let localUserMetadata = { role: 'user', username: '', font_family: '', font_color: '', text_glow: false };

// --- DOM ELEMENTS ---
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

// --- INTERACTIVE BACKGROUND PARTICLE ENGINE ---
let particles = [];
const mouse = { x: null, y: null, radius: 180 };

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
        this.vx = (Math.random() - 0.5) * 1.2;
        this.vy = (Math.random() - 0.5) * 1.2;
        this.radius = Math.random() * 2 + 1.5;
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
                // Pull particles gently around the cursor
                let force = (mouse.radius - distance) / mouse.radius;
                this.x += (dx / distance) * force * 1.5;
                this.y += (dy / distance) * force * 1.5;
            }
        }
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    let count = Math.floor((canvas.width * canvas.height) / 8000);
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    connectLines();
    requestAnimationFrame(animateParticles);
}
function connectLines() {
    for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
            let dx = particles[a].x - particles[b].x;
            let dy = particles[a].y - particles[b].y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 110) {
                let alpha = (110 - dist) / 110 * 0.2;
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

// --- 3D INTERACTIVE GLASS CARD TILT ENGINE ---
let isHovered = false;

cardContainer.addEventListener('mouseenter', () => { isHovered = true; });
cardContainer.addEventListener('mouseleave', () => { 
    isHovered = false;
});

window.addEventListener('mousemove', (e) => {
    if (isHovered) {
        // Reset transformation when card is directly hovered
        glassCard.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(10px)';
        return; 
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    // Direct 3D alignment pointing towards the cursor location
    const tiltX = -(dy / centerY) * 20; 
    const tiltY = (dx / centerX) * 20;

    glassCard.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(0px)`;
});

// --- AUTHENTICATION MODE UI CONTROLS ---
function switchAuthMode(mode) {
    authMode = mode;
    document.getElementById('toggle-login').classList.toggle('active', mode === 'login');
    document.getElementById('toggle-signup').classList.toggle('active', mode === 'signup');
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

// --- FORM INTERACTION & SUPABASE LAYER ---
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const birthdate = birthdateInput.value;
    
    // Virtual email syntax layer generation to bypass explicit user email requirements
    const virtualEmail = `${username.toLowerCase()}@chat.unblocked`;

    if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
            email: virtualEmail,
            password: password,
            options: {
                data: {
                    display_username: username,
                    birthdate: birthdate
                }
            }
        });

        if (error) {
            alert(`Sign-up Error: ${error.message}`);
            return;
        }
        
        currentUserSession = data.user;
        document.getElementById('auth-section').classList.remove('active');
        document.getElementById('customize-section').classList.add('active');
        document.getElementById('username-preview').innerText = username;

    } else {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: virtualEmail,
            password: password
        });

        if (error) {
            alert(`Login Error: Username or password invalid.`);
            return;
        }
        
        currentUserSession = data.user;
        await initChatSystem();
    }
});
// --- PROFILE LIVE VISUAL PREVIEW SYNC ---
const avatarInput = document.getElementById('avatar');
const bannerInput = document.getElementById('banner');
const fontSelect = document.getElementById('font-family');
const colorInput = document.getElementById('font-color');
const glowToggle = document.getElementById('glow-toggle');
const previewSpan = document.getElementById('username-preview');

function updateLivePreview() {
    previewSpan.style.fontFamily = fontSelect.value;
    previewSpan.style.color = colorInput.value;
    
    if (glowToggle.checked) {
        previewSpan.style.textShadow = `0 0 10px ${colorInput.value}, 0 0 20px ${colorInput.value}`;
    } else {
        previewSpan.style.textShadow = 'none';
    }
}

fontSelect.addEventListener('change', updateLivePreview);
colorInput.addEventListener('input', updateLivePreview);
glowToggle.addEventListener('change', updateLivePreview);

// --- PROFILE SAVE & CHAT ROUTER ---
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    if (!currentUserSession) return;

    const profileData = {
        id: currentUserSession.id,
        avatar_url: avatarInput.value,
        banner_url: bannerInput.value,
        font_family: fontSelect.value,
        font_color: colorInput.value,
        text_glow: glowToggle.checked,
        updated_at: new Date()
    };

    const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

    if (error) {
        alert(`Error saving custom configs: ${error.message}`);
    } else {
        await initChatSystem();
    }
});

// --- MESSAGING ENGINE & PERMISSIONS SCRIPTING ---
async function initChatSystem() {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, username, is_banned, muted_until')
        .eq('id', currentUserSession.id)
        .single();

    if (error || !profile) {
        alert("Profile context could not be pulled.");
        return;
    }

    if (profile.is_banned) {
        alert("Your account context has been permanently banned from this platform.");
        window.location.reload();
        return;
    }

    localUserMetadata = profile;
    document.getElementById('user-role-badge').innerText = `Role: ${profile.role.toUpperCase()}`;

    cardContainer.style.maxWidth = "750px"; 
    document.getElementById('auth-section').classList.remove('active');
    document.getElementById('customize-section').classList.remove('active');
    document.getElementById('chat-section').classList.add('active');

    loadMessages();
    listenToGlobalChat();
}

async function loadMessages() {
    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .order('id', { ascending: true })
        .limit(100);

    const container = document.getElementById('message-container');
    container.innerHTML = '';
    if (messages) messages.forEach(msg => displaySingleMessage(msg));
    container.scrollTop = container.scrollHeight;
}
function displaySingleMessage(msg) {
    const container = document.getElementById('message-container');
    const div = document.createElement('div');
    div.className = 'msg-block';
    
    let administrativePayload = '';
    if (localUserMetadata.role === 'owner' && msg.username.toLowerCase() !== 'steezy') {
        administrativePayload = `
            <div class="mod-tools">
                <button class="mod-btn" onclick="executeModAction('mute', '${msg.user_id}')">Mute</button>
                <button class="mod-btn" onclick="executeModAction('timeout', '${msg.user_id}')">10m</button>
                <button class="mod-btn" onclick="executeModAction('ban', '${msg.user_id}')">Ban</button>
            </div>
        `;
    }

    div.innerHTML = `
        <div class="msg-content-wrap">
            <span class="msg-author" style="font-family: ${msg.font_family || 'inherit'}; color: ${msg.font_color || '#fff'}; text-shadow: ${msg.text_glow ? '0 0 8px ' + msg.font_color : 'none'}">${msg.username}:</span>
            <span class="msg-text">${msg.content}</span>
        </div>
        ${administrativePayload}
    `;
    container.appendChild(div);
}

function listenToGlobalChat() {
    supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            displaySingleMessage(payload.new);
            const container = document.getElementById('message-container');
            container.scrollTop = container.scrollHeight;
        })
        .subscribe();
}

document.getElementById('chat-input-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-msg');
    
    if (localUserMetadata.muted_until && new Date(localUserMetadata.muted_until) > new Date()) {
        alert("You are currently timed out/muted.");
        return;
    }

    const { error } = await supabase.from('messages').insert({
        user_id: currentUserSession.id,
        username: localUserMetadata.username,
        content: input.value,
        font_family: localUserMetadata.font_family,
        font_color: localUserMetadata.font_color,
        text_glow: localUserMetadata.text_glow
    });

    if (error) {
        alert("Message dropped: Account is currently restricted.");
    } else {
        input.value = '';
    }
});

async function executeModAction(type, targetUserId) {
    let updateFields = {};
    
    if (type === 'ban') {
        updateFields = { is_banned: true };
    } else if (type === 'mute') {
        updateFields = { muted_until: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365)) }; 
    } else if (type === 'timeout') {
        updateFields = { muted_until: new Date(new Date().getTime() + (10 * 60 * 1000)) };
    }

    const { error } = await supabase
        .from('profiles')
        .update(updateFields)
        .eq('id', targetUserId);

    if (error) {
        alert(`Moderation request rejected: ${error.message}`);
    } else {
        alert(`Successfully applied user state update: [${type.toUpperCase()}]`);
    }
}
