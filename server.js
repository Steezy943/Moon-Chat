(() => {
  'use strict';

  const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(f)); } catch { return f; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  window.addEventListener('load', () => {
    if (!window.supabase) {
      console.warn("Supabase CDN not available yet. Retrying network link...");
      return;
    }

    // Fail-Safe: Sync text lines and player sidebar loops instantly across same-machine tabs
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('moon-chat-messages-')) {
        syncChannelFeedsSilently();
      }
    });

    const networkInterval = setInterval(() => {
      if (window.currentUser && !window.realtimeChannel) {
        clearInterval(networkInterval);
        initSupabaseMeshPipeline();
        initAutomatedHighFrequencyPolling();
      }
    }, 1000);
  });

  // Automated Non-Destructive Polling Sync Layer (Simulates 24/7 background room button selection)
  function initAutomatedHighFrequencyPolling() {
    setInterval(() => {
      if (window.currentUser && typeof window.key === 'function') {
        syncChannelFeedsSilently();
      }
    }, 1000); // Triggers automatically every 1 second (1000ms)
  }

  function syncChannelFeedsSilently() {
    if (!window.currentUser || !window.activeChannel) return;
    
    const keyStr = `moon-chat-messages-${window.activeChannel}`;
    const cachedMessages = read(keyStr, []);
    
    // Scan through backend message collections and push new arrivals into layout boxes dynamically
    cachedMessages.forEach(msg => {
      // If message node doesn't exist in DOM structure yet, append it seamlessly
      if (msg && msg.id && !document.getElementById(`msg-${msg.id}`)) {
        if (typeof window.render === 'function') {
          window.render(msg);
          
          // Auto scroll container down if user is near the bottom threshold
          const container = document.getElementById('message-container');
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }
      }
    });

    // Automatically check online user presence updates layout lists
    if (typeof window.renderUserSidebarList === 'function') {
      window.renderUserSidebarList();
    }
  }

  function initSupabaseMeshPipeline() {
    const supabaseUrl = 'https://supabase.com';
    const supabaseKey = 'sb_publishable_oD3pjw8LGY6uFblF0azYZQ_5CuGNZtL';
    const client = window.supabase.createClient(supabaseUrl, supabaseKey);

    window.realtimeChannel = client.channel('moon-chat-global-room-2026', {
      config: { broadcast: { self: false }, presence: { key: window.currentUser.username.toLowerCase() } }
    });

    window.realtimeChannel.on('broadcast', { event: 'shuttle-msg' }, payload => {
      const data = payload.payload;
      if (data && data.channel) {
        const targetKey = `moon-chat-messages-${data.channel}`;
        const ms = read(targetKey, []);
        if (!ms.some(existing => existing.id === data.msg.id)) {
          ms.push(data.msg);
          write(targetKey, ms.slice(-100));
          syncChannelFeedsSilently();
        }
      }
    });

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
