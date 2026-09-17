(() => {
  'use strict';

  // Fallback if main script hasn't exposed global references yet
  const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(f)); } catch { return f; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  window.addEventListener('load', () => {
    // Check if Supabase library and user session are both active
    if (!window.supabase) {
      console.warn("Supabase CDN not available yet. Retrying network link...");
      return;
    }

    // Fail-Safe: Sync text lines and player sidebar loops instantly across same-machine tabs
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('moon-chat-messages-')) {
        if (typeof window.load === 'function') window.load();
        if (typeof window.renderUserSidebarList === 'function') window.renderUserSidebarList();
      }
    });

    // High frequency listener loop checks for window onboarding arrivals
    const networkInterval = setInterval(() => {
      if (window.currentUser && !window.realtimeChannel) {
        clearInterval(networkInterval);
        initSupabaseMeshPipeline();
      }
    }, 1000);
  });

  function initSupabaseMeshPipeline() {
    const supabaseUrl = 'https://supabase.com';
    const supabaseKey = 'sb_publishable_oD3pjw8LGY6uFblF0azYZQ_5CuGNZtL';
    const client = window.supabase.createClient(supabaseUrl, supabaseKey);

    window.realtimeChannel = client.channel('moon-chat-global-room-2026', {
      config: { broadcast: { self: false }, presence: { key: window.currentUser.username.toLowerCase() } }
    });

    // 1. CHAT BROADCAST LISTENER HOOK
    window.realtimeChannel.on('broadcast', { event: 'shuttle-msg' }, payload => {
      const data = payload.payload;
      if (data && data.channel === window.activeChannel) {
        const keyStr = `moon-chat-messages-${data.channel}`;
        const ms = read(keyStr, []);
        if (!ms.some(existing => existing.id === data.msg.id)) {
          ms.push(data.msg);
          write(keyStr, ms.slice(-100));
          if (typeof window.render === 'function') window.render(data.msg);
          const container = document.getElementById('message-container');
          if (container) container.scrollTop = container.scrollHeight;
        }
      }
    });

    // 2. PLAYER PRESENCE ONLINE TRACKING HOOK
    window.realtimeChannel.on('presence', { event: 'sync' }, () => {
      const state = window.realtimeChannel.presenceState();
      if (!window.registeredActiveMeshMembers) window.registeredActiveMeshMembers = new Map();
      window.registeredActiveMeshMembers.clear();
      
      Object.keys(state).forEach(key => {
        const info = state[key];
        if (info && info[0] && info[0].username) {
          window.registeredActiveMeshMembers.set(key, { username: info[0].username, lastSeen: Date.now() });
        }
      });
      if (typeof window.renderUserSidebarList === 'function') window.renderUserSidebarList();
    });

    window.realtimeChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await window.realtimeChannel.track({ username: window.currentUser.username, onlineAt: new Date().toISOString() });
      }
    });
  }
})();
