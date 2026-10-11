const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const toneButtons = document.querySelectorAll('.tone-btn');

// State
let conversationHistory = [];
let currentTone = 'general';
let isThinking = false;

// Handle Tone Selection
toneButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    toneButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTone = btn.dataset.tone;
  });
});

// Handle Suggestion Chips
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('chip')) {
    const prompt = e.target.dataset.prompt;
    if (prompt && !isThinking) {
      input.value = prompt;
      form.dispatchEvent(new Event('submit'));
    }
  }
});

// Handle Clear Chat
clearBtn.addEventListener('click', () => {
  conversationHistory = [];
  chatBox.innerHTML = `
    <div class="welcome-card">
      <h3>Halo, Petualang! 👋</h3>
      <p>Saya asisten AI perjalanan nusantara Anda. Butuh inspirasi hidden gem, rekomendasi kuliner lokal, atau rute liburan hemat?</p>
      <div class="suggestion-chips">
        <button class="chip" data-prompt="Rekomendasikan hidden gems di Yogyakarta yang belum banyak diketahui wisatawan!">✨ Hidden gems di Jogja</button>
        <button class="chip" data-prompt="Buatkan itinerary 3 hari 2 malam di Bali dengan budget hemat untuk backpacker.">🎒 Itinerary Bali hemat 3D2N</button>
        <button class="chip" data-prompt="Apa saja 5 kuliner malam legendaris paling wajib dicoba di Bandung?">🍜 Kuliner malam Bandung</button>
        <button class="chip" data-prompt="Berapa estimasi budget dan tips perjalanan pertama kali ke Labuan Bajo?">⛵ Budget ke Labuan Bajo</button>
      </div>
    </div>
  `;
});

// Simple Markdown Formatter for Assistant replies
function formatMarkdown(text) {
  if (!text) return '';
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold **text**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Inline code `code`
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Lines & Lists
  const lines = formatted.split('\n');
  let inList = false;
  let html = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${trimmed.substring(2)}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (trimmed) {
        html += `<p>${trimmed}</p>`;
      }
    }
  }

  if (inList) html += '</ul>';
  return html;
}

// Append Message to UI
function appendMessage(sender, text, isHtml = false) {
  const row = document.createElement('div');
  row.classList.add('message-row', sender);

  const avatar = document.createElement('div');
  avatar.classList.add('avatar-icon');
  avatar.textContent = sender === 'user' ? '👤' : '🌴';

  const msg = document.createElement('div');
  msg.classList.add('message', sender);

  if (isHtml) {
    msg.innerHTML = text;
  } else {
    msg.textContent = text;
  }

  if (sender === 'user') {
    row.appendChild(msg);
    row.appendChild(avatar);
  } else {
    row.appendChild(avatar);
    row.appendChild(msg);
  }

  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
  return row;
}

// Show Thinking Indicator
function showThinking() {
  const row = document.createElement('div');
  row.classList.add('message-row', 'bot');
  row.id = 'thinking-indicator';

  const avatar = document.createElement('div');
  avatar.classList.add('avatar-icon');
  avatar.textContent = '🌴';

  const bubble = document.createElement('div');
  bubble.classList.add('message', 'bot', 'thinking-bubble');
  bubble.innerHTML = `
    <span class="dot-pulse"></span>
    <span class="dot-pulse"></span>
    <span class="dot-pulse"></span>
  `;

  row.appendChild(avatar);
  row.appendChild(bubble);
  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
  return row;
}

function removeThinking() {
  const indicator = document.getElementById('thinking-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// Form Submit Handler
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage || isThinking) return;

  // Add User Message to UI & History
  appendMessage('user', userMessage);
  conversationHistory.push({ role: 'user', text: userMessage });

  input.value = '';
  isThinking = true;
  sendBtn.disabled = true;

  // Show Thinking Indicator
  showThinking();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation: conversationHistory,
        tone: currentTone
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    removeThinking();

    const botReply = data.result || 'Maaf, tidak ada jawaban dari server.';
    conversationHistory.push({ role: 'model', text: botReply });

    appendMessage('bot', formatMarkdown(botReply), true);

  } catch (error) {
    console.error('Chat error:', error);
    removeThinking();
    appendMessage('bot', '⚠️ Maaf, terjadi kesalahan saat menghubungi server AI. Pastikan server backend sedang berjalan dan periksa koneksi internet Anda.');
  } finally {
    isThinking = false;
    sendBtn.disabled = false;
    input.focus();
  }
});

