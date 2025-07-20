const form = document.querySelector('#chat-form');      // Form element for user input
const input = form.querySelector('.form-control');      // Input field for user messages
const chatBox = document.querySelector('.chat-box');    // Container for chat messages

const restartBtn = document.getElementById('restartBtn');
const resultFrame = document.getElementById('resultFrame');

restartBtn.addEventListener('click', () => {
    console.log('[INFO] Restart button clicked');
    fetch('/restart', {  // Use relative URL
        method: 'POST'
    })
    .then(res => {
        console.log('[INFO] Restart response received');
        return res.json();
    })
    .then(data => {
        console.log('[BOT]', data.reply);
        appendMessage('bot', data.reply);
        resultFrame.src = '';  // Clear iframe
    })
    .catch(err => {
        console.error('[ERROR] Failed to restart:', err);
        appendMessage('bot', 'Error restarting session.');
    });
});

function appendMessage(sender, text) {
    const msg = document.createElement('div');
    msg.classList.add(`${sender}-message`);
    msg.textContent = text;

    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight; // auto-scroll
    console.log(`[UI] ${sender} message appended:`, text);
}

// When page loads → start conversation
window.addEventListener('load', () => {
    console.log('[INFO] Page loaded');
    appendMessage('bot', 'Welcome to Webby! Click "Restart" to begin.');
});

// When user submits a message
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const message = input.value.trim();
    if (!message) {
        console.warn('[WARN] Empty input submitted');
        return;
    }

    console.log('[USER]', message);
    appendMessage('user', message);
    input.value = '';

    fetch('/chat', {  // Use relative URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    })
    .then(res => {
        console.log('[INFO] Chat response received');
        return res.json();
    })
    .then(data => {
        console.log('[BOT]', data.reply);
        appendMessage('bot', data.reply);

        if (data.url) {
            console.log('[INFO] Setting iframe to:', data.url);
            resultFrame.src = data.url;
        } else {
            console.log('[INFO] No URL received from server');
        }
    })
    .catch(err => {
        console.error('[ERROR] Failed to send message:', err);
        appendMessage('bot', 'Error contacting Webby.');
    });
});