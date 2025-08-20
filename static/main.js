// ==================
// WEBBY AI INTERFACE
// ==================

class WebbyInterface {
    constructor() {
        this.elements = this.initializeElements();
        this.state = {
            iframeAccessible: false,
            iframeDocument: null,
            editModeActive: false,
            currentSection: 'chat',
            currentEditSubsection: 'images',
            editableElements: new Map() // Store editable elements for easy access
        };
        this.init();
    }

    // Initialize all DOM elements with proper error handling
    initializeElements() {
        const elements = {
            form: document.querySelector('#chat-form'),
            input: document.querySelector('.form-control'),
            chatBox: document.querySelector('.chat-box'),
            restartBtn: document.getElementById('restartBtn'),
            resultFrame: document.getElementById('resultFrame'),
            loaderOverlay: document.getElementById('loader-overlay'),
            chatTool: document.getElementById('chatTool'),
            editTool: document.getElementById('editTool'),
            chatSection: document.getElementById('chatSection'),
            editSection: document.getElementById('EditSection'),
            sectionTitle: document.getElementById('section-title'),
            toggleEdit: document.getElementById('toggleEditBtn'),
            loaderSpinner: document.querySelector('.loader'),
        };

        // Validate critical elements
        const criticalElements = ['form', 'input', 'chatBox'];
        criticalElements.forEach(key => {
            if (!elements[key]) {
                console.error(`[ERROR] Critical element ${key} not found`);
            }
        });

        return elements;
    }

    init() {
        this.setupEventListeners();
        this.setupNotificationSystem();
        this.setupIframeHandling();
        this.appendWelcomeMessage();
        this.injectStyles();
        this.toggleEditMode();
    }

    // Loader Helper functions
    showLoader() {
        if (this.elements.loaderOverlay) {
            this.elements.loaderOverlay.style.display = 'flex';
        }
    }

    hideLoader() {
        if (this.elements.loaderOverlay) {
            this.elements.loaderOverlay.style.display = 'none';
        }
    }

    // Centralized event listener setup
    setupEventListeners() {
        // Chat form submission
        if (this.elements.form && this.elements.input) {
            this.elements.form.addEventListener('submit', (e) => this.handleChatSubmit(e));
            this.elements.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.elements.form.dispatchEvent(new Event('submit'));
                }
            });
        }

        // Restart button
        if (this.elements.restartBtn) {
            this.elements.restartBtn.addEventListener('click', () => this.handleRestart());
        }

        // Section switching
        if (this.elements.chatTool) {
            this.elements.chatTool.addEventListener('click', () => this.switchSection('chat'));
        }
        if (this.elements.editTool) {
            this.elements.editTool.addEventListener('click', () => this.switchSection('edit'));
        }

        // Window resize
        window.addEventListener('resize', () => this.handleResize());

        // DOM loaded
        document.addEventListener('DOMContentLoaded', () => this.handleDOMLoaded());
    }

    // Unified notification system
    setupNotificationSystem() {
        this.notificationQueue = [];
        this.maxNotifications = 3;
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Remove oldest notification if queue is full
        if (this.notificationQueue.length >= this.maxNotifications) {
            const oldest = this.notificationQueue.shift();
            if (oldest && oldest.element.parentNode) {
                oldest.element.remove();
            }
        }

        const notification = this.createNotificationElement(message, type);
        document.body.appendChild(notification);

        const notificationObj = {
            element: notification,
            timeout: setTimeout(() => this.removeNotification(notification), duration)
        };

        this.notificationQueue.push(notificationObj);
    }

    createNotificationElement(message, type) {
        const notification = document.createElement('div');
        notification.className = `webby-notification ${type}`;
        notification.textContent = message;

        const colors = {
            success: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
            error: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
            warning: 'linear-gradient(135deg, #ffeaa7, #fdcb6e)',
            info: 'linear-gradient(135deg, #cb6ce6, #aa41c4)'
        };

        notification.style.cssText = `
            position: fixed;
            top: ${20 + this.notificationQueue.length * 70}px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: 'Bricolage Grotesque', sans-serif;
            font-weight: 500;
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
            word-wrap: break-word;
            cursor: pointer;
        `;

        // Click to dismiss
        notification.addEventListener('click', () => this.removeNotification(notification));

        return notification;
    }

    removeNotification(notification) {
        const index = this.notificationQueue.findIndex(n => n.element === notification);
        if (index > -1) {
            const notificationObj = this.notificationQueue.splice(index, 1)[0];
            clearTimeout(notificationObj.timeout);

            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }

        // Reposition remaining notifications
        this.repositionNotifications();
    }

    repositionNotifications() {
        this.notificationQueue.forEach((notificationObj, index) => {
            notificationObj.element.style.top = `${20 + index * 70}px`;
        });
    }

    // Chat functionality
    async handleChatSubmit(e) {
        e.preventDefault();

        const message = this.elements.input.value.trim();
        if (!message) return;

        this.appendMessage('user', message);
        this.elements.input.value = '';
        this.showLoader();

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.appendMessage('bot', data.reply);

            if (data.site_id && this.elements.resultFrame) {
                this.elements.resultFrame.src = `/sitepreview/${data.site_id}`;
            }
        } catch (error) {
            console.error('[ERROR] Chat request failed:', error);
            this.appendMessage('bot', 'Error contacting Webby.');
            this.showNotification('Failed to send message', 'error');
        } finally {
            this.hideLoader();
        }
    }

    appendMessage(sender, text) {
        if (!this.elements.chatBox) return;

        const msg = document.createElement('div');
        msg.classList.add(`${sender}-message`);
        msg.textContent = text;

        this.elements.chatBox.appendChild(msg);
        this.elements.chatBox.scrollTop = this.elements.chatBox.scrollHeight;
    }

    appendWelcomeMessage() {
        this.appendMessage('bot', 'Welcome to Webby! Tell me whats the name of your website?');
    }

    // Section switching
    switchSection(sectionType) {
        // Remove active class from all tools
        document.querySelectorAll('.tool-icons').forEach(tool => {
            tool.classList.remove('active');
        });

        if (sectionType === 'chat') {
            this.elements.chatSection?.classList.remove('hidden');
            this.elements.editSection?.classList.add('hidden');
            this.elements.chatTool?.classList.add('active');
            if (this.elements.sectionTitle) {
                this.elements.sectionTitle.innerHTML = '💬 Webby <span class="status-indicator"></span>';
            }
        } else if (sectionType === 'edit') {
            this.elements.editSection?.classList.remove('hidden');
            this.elements.chatSection?.classList.add('hidden');
            this.elements.editTool?.classList.add('active');
            if (this.elements.sectionTitle) {
                this.elements.sectionTitle.innerHTML = '🎨 Edit <span class="status-indicator"></span>';
            }
        }

        this.state.currentSection = sectionType;
    }

    // Iframe handling
    setupIframeHandling() {
        if (this.elements.resultFrame) {
            this.elements.resultFrame.addEventListener('load', () => {
                this.hideLoader();
                this.checkIframeAccessibility();
            });
            this.elements.resultFrame.addEventListener('error', () => {
                this.showNotification('Failed to load preview', 'error');
            });
        }
    }

    checkIframeAccessibility() {
        try {
            const doc = this.elements.resultFrame.contentDocument ||
                this.elements.resultFrame.contentWindow.document;

            if (doc && doc.body) {
                this.state.iframeAccessible = true;
                this.state.iframeDocument = doc; // Store reference to iframe document

                // Only make elements editable if edit mode is active
                if (this.state.editModeActive) {
                    this.makeElementsEditable(doc);
                } else {
                    console.log('[INFO] Iframe loaded but edit mode is inactive');
                }
            } else {
                throw new Error('Cannot access document body');
            }
        } catch (error) {
            console.log('[WARNING] Cannot access iframe content:', error.message);
            this.state.iframeAccessible = false;
            this.showNotification('Direct editing not available (cross-origin)', 'warning');
        }
    }

    makeElementsEditable(doc) {
        const elements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, span, div, button, li, img');

        elements.forEach(el => {
            el.setAttribute('contenteditable', 'true');
            el.style.outline = '1px dashed rgba(203, 108, 230, 0.5)';
            el.style.cursor = 'text';

            // Create event listener functions
            const mouseEnterHandler = () => {
                el.style.outline = '2px solid #cb6ce6';
            };

            const mouseLeaveHandler = () => {
                el.style.outline = '1px dashed rgba(203, 108, 230, 0.5)';
            };

            // Add event listeners
            el.addEventListener('mouseenter', mouseEnterHandler);
            el.addEventListener('mouseleave', mouseLeaveHandler);

            // Store the element and its listeners for later removal
            this.state.editableElements.set(el, {
                mouseEnterHandler,
                mouseLeaveHandler
            });
        });

        this.showNotification('Elements are now editable!', 'success');
    }

    makeElementsNonEditable(doc) {
        const elements = doc.querySelectorAll('[contenteditable="true"]');

        elements.forEach(el => {
            // Remove contenteditable attribute
            el.removeAttribute('contenteditable');

            // Remove all styling
            el.style.outline = '';
            el.style.cursor = '';

            // Remove event listeners if they exist
            const listeners = this.state.editableElements.get(el);
            if (listeners) {
                el.removeEventListener('mouseenter', listeners.mouseEnterHandler);
                el.removeEventListener('mouseleave', listeners.mouseLeaveHandler);
                this.state.editableElements.delete(el);
            }
        });

        this.showNotification('Elements are no longer editable', 'info');
    }

    // Toggle edit mode functionality
    toggleEditMode() {
        if (this.elements.toggleEdit) {
            this.elements.toggleEdit.addEventListener('click', () => {
                // Toggle the edit mode state
                this.state.editModeActive = !this.state.editModeActive;

                if (this.state.editModeActive) {
                    // Enable edit mode
                    this.elements.toggleEdit.classList.add('active');
                    //this.showNotification('Edit mode enabled', 'success');

                    // Make elements editable if iframe is accessible
                    if (this.state.iframeAccessible && this.state.iframeDocument) {
                        this.makeElementsEditable(this.state.iframeDocument);
                    } else if (this.state.iframeAccessible) {
                        // Fallback: try to get document again
                        const doc = this.elements.resultFrame.contentDocument ||
                            this.elements.resultFrame.contentWindow.document;
                        if (doc && doc.body) {
                            this.state.iframeDocument = doc;
                            this.makeElementsEditable(doc);
                        }
                    } else {
                        this.showNotification('No website loaded to edit', 'warning');
                    }
                } else {
                    // Disable edit mode
                    this.elements.toggleEdit.classList.remove('active');
                    //this.showNotification('Edit mode disabled', 'info');

                    // Make elements non-editable if iframe is accessible
                    if (this.state.iframeAccessible && this.state.iframeDocument) {
                        this.makeElementsNonEditable(this.state.iframeDocument);
                    }
                }
            });
        } else {
            console.warn('[WARN] Toggle edit button not found');
        }
    }

    // Utility methods
    handleRestart() {
        fetch('/restart', { method: 'POST' })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                this.appendMessage('bot', data.reply);
                if (this.elements.resultFrame) {
                    this.elements.resultFrame.src = '';
                }

                // Reset edit mode state and clear editableElements map
                this.state.editModeActive = false;
                this.state.iframeAccessible = false;
                this.state.iframeDocument = null;
                this.state.editableElements.clear(); // Clear the map

                if (this.elements.toggleEdit) {
                    this.elements.toggleEdit.classList.remove('active');
                }

                this.showNotification('Session restarted', 'success');
            })
            .catch(error => {
                console.error('[ERROR] Restart failed:', error);
                this.showNotification('Error restarting session', 'error');
            });
    }


    handleResize() {
        if (this.elements.resultFrame) {
            this.elements.resultFrame.style.height = window.innerWidth <= 768 ? '400px' : '502px';
        }
    }

    handleDOMLoaded() {
        if (this.elements.input) {
            this.elements.input.focus();
        }
        this.showNotification('Webby AI interface initialized', 'success');
    }

    // Inject required styles
    injectStyles() {
        if (document.querySelector('#webby-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'webby-styles';
        styles.textContent = `
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(100%); }
                to { opacity: 1; transform: translateX(0); }
            }
            
            @keyframes slideOutRight {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(100%); }
            }
            
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .webby-notification {
                transition: top 0.3s ease;
            }
            
            .edit-section {
                transition: all 0.3s ease;
            }
            
            .edit-section.hidden {
                display: none;
            }
            
            .edit-section.active {
                display: block;
                animation: fadeInUp 0.3s ease;
            }

            /* Edit mode toggle button styles */
            #toggleEditBtn {
                transition: all 0.3s ease;
            }

            #toggleEditBtn.active {
                background: linear-gradient(135deg, #4ecdc4, #44a08d) !important;
                color: white !important;
                box-shadow: 0 4px 12px rgba(78, 205, 196, 0.4);
            }

            /* Editable elements highlight */
            [contenteditable="true"] {
                transition: all 0.2s ease;
            }

            [contenteditable="true"]:focus {
                outline: 2px solid #cb6ce6 !important;
                background: rgba(203, 108, 230, 0.05);
            }
        `;

        document.head.appendChild(styles);
    }

    // Public API for external use
    getState() {
        return { ...this.state };
    }

    updateState(newState) {
        this.state = { ...this.state, ...newState };
    }

    // Helper method to manually trigger edit mode (for debugging/testing)
    setEditMode(enabled) {
        this.state.editModeActive = enabled;

        if (this.elements.toggleEdit) {
            if (enabled) {
                this.elements.toggleEdit.classList.add('active');
            } else {
                this.elements.toggleEdit.classList.remove('active');
            }
        }

        if (this.state.iframeAccessible && this.state.iframeDocument) {
            if (enabled) {
                this.makeElementsEditable(this.state.iframeDocument);
            } else {
                this.makeElementsNonEditable(this.state.iframeDocument);
            }
        }
    }
}

// File Upload Manager Class
class FileUploadManager {
    constructor(webbyInterface) {
        this.webby = webbyInterface;
        this.allowedTypes = {
            images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            graphics: ['image/svg+xml', 'image/png', 'image/jpeg'],
            videos: ['video/mp4', 'video/webm', 'video/ogg']
        };
        this.init();
    }

    init() {
        this.setupUploadHandlers();
    }

    setupUploadHandlers() {
        const uploadTypes = ['image', 'graphics', 'video'];

        uploadTypes.forEach(type => {
            const upload = document.getElementById(`${type}Upload`);
            const preview = document.getElementById(`${type}Preview`);

            if (upload && preview) {
                upload.addEventListener('change', (e) => {
                    this.handleFileUpload(e.target.files, type, preview);
                });
            }
        });
    }

    handleFileUpload(files, type, previewContainer) {
        const validFiles = Array.from(files).filter(file =>
            this.isValidFileType(file, type)
        );

        if (validFiles.length !== files.length) {
            const invalidCount = files.length - validFiles.length;
            this.webby.showNotification(
                `${invalidCount} file(s) skipped - invalid type for ${type}`,
                'warning'
            );
        }

        validFiles.forEach(file => {
            this.createFilePreview(file, type, previewContainer);
        });

        if (validFiles.length > 0) {
            this.webby.showNotification(
                `${validFiles.length} ${type} file(s) uploaded successfully`,
                'success'
            );
        }
    }

    isValidFileType(file, uploadType) {
        const allowedForType = this.allowedTypes[uploadType + 's'] || [];
        return allowedForType.includes(file.type);
    }

    createFilePreview(file, type, container) {
        const fileURL = URL.createObjectURL(file);
        const previewDiv = document.createElement('div');
        previewDiv.className = `${type}-item`;

        if (type === 'video') {
            previewDiv.innerHTML = `
                <video controls style="max-width: 300px; max-height: 200px; border-radius: 8px; margin: 5px;">
                    <source src="${fileURL}" type="${file.type}">
                    Your browser does not support the video tag.
                </video>
                <div class="file-info">
                    <p style="font-size: 12px; margin: 5px 0;">${file.name}</p>
                    <button onclick="this.parentElement.parentElement.remove(); URL.revokeObjectURL('${fileURL}')" 
                            style="background: #2ed573; color: white; border: none; border-radius: 4px; padding: 2px 8px; cursor: pointer;">
                        Remove
                    </button>
                </div>
            `;
        } else {
            previewDiv.innerHTML = `
                <img src="${fileURL}" alt="${file.name}" style="max-width: 200px; max-height: 150px; border-radius: 8px; margin: 5px;">
                <div class="file-info">
                    <p style="font-size: 12px; margin: 5px 0;">${file.name}</p>
                    <button onclick="this.parentElement.parentElement.remove(); URL.revokeObjectURL('${fileURL}')" 
                            style="background: #ff4757; color: white; border: none; border-radius: 4px; padding: 2px 8px; cursor: pointer;">
                        Remove
                    </button>
                </div>
            `;
        }

        container.appendChild(previewDiv);
    }
}

// Initialize the application
let webbyApp;
let fileUploadManager;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWebby);
} else {
    initializeWebby();
}

function initializeWebby() {
    try {
        webbyApp = new WebbyInterface();
        fileUploadManager = new FileUploadManager(webbyApp);
        console.log('[SUCCESS] Webby application initialized');
    } catch (error) {
        console.error('[ERROR] Failed to initialize Webby:', error);
        // Fallback notification
        alert('Failed to initialize Webby interface. Please refresh the page.');
    }
}

// Export for external access if needed
window.WebbyApp = {
    instance: () => webbyApp,
    fileManager: () => fileUploadManager
};