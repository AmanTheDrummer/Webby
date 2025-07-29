<<<<<<< HEAD
// ==================
// CHAT FUNCTIONALITY
// ==================

const form = document.querySelector('#chat-form');      
const input = form.querySelector('.form-control');      
const chatBox = document.querySelector('.chat-box');    
const restartBtn = document.getElementById('restartBtn');
const resultFrame = document.getElementById('resultFrame');

// Restart button functionality
restartBtn.addEventListener('click', () => {
    console.log('[INFO] Restart button clicked');
    fetch('/restart', {
        method: 'POST'
    })
    .then(res => {
        console.log('[INFO] Restart response received');
        return res.json();
    })
    .then(data => {
        console.log('[BOT]', data.reply);
        appendMessage('bot', data.reply);
        resultFrame.src = '';
    })
    .catch(err => {
        console.error('[ERROR] Failed to restart:', err);
        appendMessage('bot', 'Error restarting session.');
    });
});

// Append message to chat
function appendMessage(sender, text) {
    const msg = document.createElement('div');
    msg.classList.add(`${sender}-message`);
    msg.textContent = text;

    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
    console.log(`[UI] ${sender} message appended:`, text);
}

// Initialize chat on page load
window.addEventListener('load', () => {
    console.log('[INFO] Page loaded');
    appendMessage('bot', 'Welcome to Webby! Tell me whats the name of your website?');
});

// Handle form submission
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

    fetch('/chat', {
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

// =========================
// SECTION SWITCHING SYSTEM
// =========================

const chatTool = document.getElementById('chatTool');
const artTool = document.getElementById('artTool');
const chatSection = document.getElementById('chatSection');
const artSection = document.getElementById('artSection');
const sectionTitle = document.getElementById('section-title');

// Section switching function
function switchSection(sectionType) {
    // Remove active class from all tools
    document.querySelectorAll('.tool-icons').forEach(tool => {
        tool.classList.remove('active');
    });

    if (sectionType === 'chat') {
        chatSection.classList.remove('hidden');
        artSection.classList.add('hidden');
        chatTool.classList.add('active');
        sectionTitle.innerHTML = '💬 Webby <span class="status-indicator"></span>';
        console.log('[INFO] Switched to chat section');
    } else if (sectionType === 'art') {
        artSection.classList.remove('hidden');
        chatSection.classList.add('hidden');
        artTool.classList.add('active');
        sectionTitle.innerHTML = '🎨 Design Studio <span class="status-indicator"></span>';
        console.log('[INFO] Switched to art section');
    }
}

// Tool bar event listeners
chatTool.addEventListener('click', () => switchSection('chat'));
artTool.addEventListener('click', () => switchSection('art'));

// ========================
// ART SECTION FUNCTIONALITY
// ========================

// Editor tools functionality
const editorTools = document.querySelectorAll('.editor-tool');
const colorSwatches = document.querySelectorAll('.color-swatch');
const fontFamily = document.getElementById('fontFamily');
const fontSize = document.getElementById('fontSize');
const textColor = document.getElementById('textColor');
const stylePreview = document.getElementById('stylePreview');
const applyStylesBtn = document.getElementById('applyStyles');
const resetStylesBtn = document.getElementById('resetStyles');

// Editor tool switching
editorTools.forEach(tool => {
    tool.addEventListener('click', function() {
        editorTools.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const toolType = this.dataset.tool;
        console.log('[INFO] Switched to tool:', toolType);
        
        // You can add specific tool functionality here
        switch(toolType) {
            case 'brush':
                // Handle brush tool
                break;
            case 'text':
                // Handle text tool
                break;
            case 'shapes':
                // Handle shapes tool
                break;
            case 'colors':
                // Handle colors tool
                break;
        }
    });
});

// Color swatch selection
colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', function() {
        colorSwatches.forEach(s => s.classList.remove('selected'));
        this.classList.add('selected');
        textColor.value = this.dataset.color;
        console.log('[INFO] Color selected:', this.dataset.color);
        updatePreview();
    });
});

// Typography controls
function updatePreview() {
    const preview = stylePreview.querySelector('p');
    if (preview) {
        preview.style.fontFamily = fontFamily.value;
        preview.style.fontSize = fontSize.value + 'px';
        preview.style.color = textColor.value;
        console.log('[INFO] Preview updated');
    }
}

// Typography event listeners
fontFamily.addEventListener('change', updatePreview);
fontSize.addEventListener('input', updatePreview);
textColor.addEventListener('input', function() {
    // Update corresponding color swatch selection
    const matchingSwatch = document.querySelector(`[data-color="${this.value}"]`);
    if (matchingSwatch) {
        colorSwatches.forEach(s => s.classList.remove('selected'));
        matchingSwatch.classList.add('selected');
    }
    updatePreview();
});

// Apply styles to website
applyStylesBtn.addEventListener('click', function() {
    const styles = {
        fontFamily: fontFamily.value,
        fontSize: fontSize.value + 'px',
        color: textColor.value
    };
    
    console.log('[INFO] Applying styles:', styles);
    
    // You can send these styles to your backend to apply to the website
    fetch('/apply-styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styles })
    })
    .then(res => res.json())
    .then(data => {
        console.log('[INFO] Styles applied successfully');
        if (data.url) {
            resultFrame.src = data.url;
        }
        // Show success message
        showNotification('Styles applied successfully!', 'success');
    })
    .catch(err => {
        console.error('[ERROR] Failed to apply styles:', err);
        showNotification('Failed to apply styles', 'error');
    });
});

// Reset styles
resetStylesBtn.addEventListener('click', function() {
    fontFamily.value = 'Arial';
    fontSize.value = '16';
    textColor.value = '#cb6ce6';
    
    // Reset color swatch selection
    colorSwatches.forEach(s => s.classList.remove('selected'));
    document.querySelector('[data-color="#cb6ce6"]').classList.add('selected');
    
    updatePreview();
    console.log('[INFO] Styles reset to default');
    showNotification('Styles reset to default', 'info');
});

// ========================
// UTILITY FUNCTIONS
// ========================

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#cb6ce6'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS for notification animations
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(notificationStyles);

// Enter key support for chat
input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit'));
    }
});

// ========================
// ADDITIONAL TOOL FUNCTIONALITY
// ========================

// Download functionality
document.querySelector('[title="Download preview"]').addEventListener('click', function() {
    console.log('[INFO] Download requested');
    
    fetch('/download-preview', {
        method: 'POST'
    })
    .then(res => res.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'webby-preview.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showNotification('Download started!', 'success');
    })
    .catch(err => {
        console.error('[ERROR] Download failed:', err);
        showNotification('Download failed', 'error');
    });
});

// Full screen functionality
document.querySelector('[title="Full screen preview"]').addEventListener('click', function() {
    console.log('[INFO] Full screen requested');
    
    if (resultFrame.requestFullscreen) {
        resultFrame.requestFullscreen();
    } else if (resultFrame.webkitRequestFullscreen) {
        resultFrame.webkitRequestFullscreen();
    } else if (resultFrame.msRequestFullscreen) {
        resultFrame.msRequestFullscreen();
    }
});

// ========================
// INITIALIZATION
// ========================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[INFO] DOM fully loaded');
    
    // Focus input on page load
    if (input) {
        input.focus();
    }
    
    // Initialize preview
    if (stylePreview) {
        updatePreview();
    }
    
    // Check if Bootstrap is loaded
    if (typeof bootstrap !== 'undefined') {
        console.log('[INFO] Bootstrap loaded successfully');
    } else {
        console.warn('[WARN] Bootstrap not loaded');
    }
    
    console.log('[INFO] Webby AI interface initialized');
});

// ========================
// RESPONSIVE BEHAVIOR
// ========================

// Handle window resize
window.addEventListener('resize', function() {
    // Adjust iframe height on mobile
    if (window.innerWidth <= 768) {
        resultFrame.style.height = '400px';
    } else {
        resultFrame.style.height = '502px';
    }
});

// ========================
// ERROR HANDLING
// ========================

// Global error handler
window.addEventListener('error', function(e) {
    console.error('[GLOBAL ERROR]', e.error);
    showNotification('An unexpected error occurred', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('[UNHANDLED PROMISE REJECTION]', e.reason);
    showNotification('Network error occurred', 'error');
=======
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
>>>>>>> 103a66ba34ce170a9e5f50558c51fab6d6e1a334
});