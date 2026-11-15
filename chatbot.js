// QWERTY Club concierge chat widget
// Communicates with /api/chat (Anthropic-backed serverless function)

(function () {
  const STORAGE_KEY = 'qwerty_chat_history_v1';
  const MAX_HISTORY = 20;

  const $toggle = document.getElementById('cb-toggle');
  const $panel = document.getElementById('cb-panel');
  const $body = document.getElementById('cb-body');
  const $input = document.getElementById('cb-input');
  const $send = document.getElementById('cb-send');

  if (!$toggle || !$panel || !$body) return;

  let history = loadHistory();
  let busy = false;

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function saveHistory() {
    try {
      const trimmed = history.slice(-MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }

  // Keycap avatar for the concierge
  function keyGlyph() {
    return 'Q';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatBubble(text) {
    let html = escapeHtml(text);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    html = html.replace(/(\bhello@qwerty\.club\b)/g, '<a href="mailto:hello@qwerty.club">$1</a>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function renderMsg(role, text) {
    const wrap = document.createElement('div');
    wrap.className = 'cb-msg ' + (role === 'user' ? 'user' : 'qw');
    const avatarContent = role === 'user' ? '' : keyGlyph();
    wrap.innerHTML = `
      <div class="cb-msg-avatar">${avatarContent}</div>
      <div class="cb-bubble">${formatBubble(text)}</div>
    `;
    $body.appendChild(wrap);
    $body.scrollTop = $body.scrollHeight;
  }

  function renderTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'cb-msg qw';
    wrap.id = 'cb-typing-row';
    wrap.innerHTML = `
      <div class="cb-msg-avatar">${keyGlyph()}</div>
      <div class="cb-bubble"><div class="cb-typing"><span></span><span></span><span></span></div></div>
    `;
    $body.appendChild(wrap);
    $body.scrollTop = $body.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('cb-typing-row');
    if (t) t.remove();
  }

  function renderHistory() {
    $body.innerHTML = '';
    if (history.length === 0) {
      renderMsg('qw', "Hey, I'm the QWERTY club concierge. Ask me about the membership tiers, this month's drop, or which switches to try first.\n\nWhat are you typing on right now?");
    } else {
      history.forEach(m => renderMsg(m.role === 'user' ? 'user' : 'qw', m.content));
    }
  }

  async function sendMessage(text) {
    if (busy || !text.trim()) return;
    busy = true;
    $send.disabled = true;

    const userMsg = { role: 'user', content: text.trim() };
    history.push(userMsg);
    renderMsg('user', userMsg.content);
    saveHistory();

    $input.value = '';
    renderTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });

      removeTyping();

      if (!res.ok) {
        const errText = res.status === 429
          ? "I'm getting a lot of chat right now — try again in a moment, or email hello@qwerty.club."
          : "Something went sideways on my end. Email hello@qwerty.club and the crew will get back to you within a day.";
        renderMsg('qw', errText);
        busy = false;
        $send.disabled = false;
        return;
      }

      const data = await res.json();
      const reply = (data && data.message) || "Sorry, I dropped the thread. Try again?";

      const botMsg = { role: 'assistant', content: reply };
      history.push(botMsg);
      renderMsg('qw', reply);
      saveHistory();
    } catch (e) {
      removeTyping();
      renderMsg('qw', "Connection hiccup. Try again, or email hello@qwerty.club.");
    }

    busy = false;
    $send.disabled = false;
    $input.focus();
  }

  $toggle.addEventListener('click', () => {
    const isOpen = $panel.classList.toggle('open');
    $toggle.classList.toggle('open', isOpen);
    if (isOpen) {
      renderHistory();
      setTimeout(() => $input.focus(), 100);
    }
  });

  $send.addEventListener('click', () => sendMessage($input.value));

  $input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage($input.value);
    }
  });
})();
