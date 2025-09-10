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
            downloadBtn: document.getElementById('downloadBtn'),
            resultFrame: document.getElementById('resultFrame'),
            loaderOverlay: document.getElementById('loader-overlay'),
            chatTool: document.getElementById('chatTool'),
            editTool: document.getElementById('editTool'),
            chatSection: document.getElementById('chatSection'),
            editSection: document.getElementById('EditSection'),
            sectionTitle: document.getElementById('section-title'),
            toggleEdit: document.getElementById('toggleEditBtn'),
            loaderSpinner: document.querySelector('.loader'),
            editSearchButton: document.getElementById('edit-search-btn'),
            queryInput: document.getElementById('unsplash-query'),
            imageGallery: document.getElementById('image-gallery')
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
        this.setupImageSearch(); // Fixed: properly call image search setup
    }

    // Fixed Image Search Setup
    setupImageSearch() {
        if (this.elements.editSearchButton && this.elements.queryInput && this.elements.imageGallery) {
            this.elements.editSearchButton.addEventListener('click', () => {
                this.handleImageSearch();
            });

            // Allow Enter key to trigger search
            this.elements.queryInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleImageSearch();
                }
            });
        } else {
            console.warn('[WARN] Image search elements not found');
        }
    }

    // Fixed Image Search Handler
    async handleImageSearch() {
        const query = this.elements.queryInput.value.trim();
        if (!query) {
            this.showNotification('Please enter a search term', 'warning');
            return;
        }

        try {
            // Show loading state
            this.elements.imageGallery.innerHTML = '<div class="loading-images">Searching for images...</div>';
            
            const results = await this.searchUnsplashImages(query);
            this.displayImageResults(results);
            
            if (results.length > 0) {
                this.showNotification(`Found ${results.length} images`, 'success');
            } else {
                this.showNotification('No images found for this search', 'info');
            }
        } catch (error) {
            console.error('[ERROR] Image search failed:', error);
            this.showNotification('Failed to search images', 'error');
            this.elements.imageGallery.innerHTML = '<div class="error-message">Failed to load images</div>';
        }
    }

    // Fixed Unsplash API call
    async searchUnsplashImages(query) {
        try {
            const response = await fetch(`/api/unsplash?q=${encodeURIComponent(query)}&per_page=12`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('[ERROR] Unsplash API call failed:', error);
            throw error;
        }
    }

    // Fixed Image Results Display
    displayImageResults(images) {
        if (!this.elements.imageGallery) return;

        this.elements.imageGallery.innerHTML = '';

        if (images.length === 0) {
            this.elements.imageGallery.innerHTML = '<div class="no-results">No images found</div>';
            return;
        }

        images.forEach(img => {
            const imageElement = document.createElement('div');
            imageElement.className = 'unsplash-image-container';
            
            imageElement.innerHTML = `
                <img src="${img.urls.small}" 
                     alt="${img.alt_description || 'Unsplash image'}" 
                     class="unsplash-img"
                     draggable="true"
                     data-full-url="${img.urls.full}"
                     data-regular-url="${img.urls.regular}">
                <div class="image-overlay">
                    <button class="use-image-btn" data-url="${img.urls.regular}">Use Image</button>
                    <div class="image-info">
                        <small>Photo by ${img.user.name}</small>
                    </div>
                </div>
            `;

            // Add drag and drop functionality
            const imgEl = imageElement.querySelector('img');
            imgEl.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', img.urls.regular);
                e.dataTransfer.setData('text/uri-list', img.urls.regular);
            });

            // Add click to use functionality
            const useBtn = imageElement.querySelector('.use-image-btn');
            useBtn.addEventListener('click', () => {
                this.useImage(img.urls.regular, img.alt_description || 'Selected image');
            });

            this.elements.imageGallery.appendChild(imageElement);
        });
    }

    // Handle using selected image
    useImage(imageUrl, altText) {
        // If iframe is accessible and edit mode is active, try to insert image
        if (this.state.iframeAccessible && this.state.iframeDocument && this.state.editModeActive) {
            this.insertImageIntoIframe(imageUrl, altText);
        } else {
            // Copy URL to clipboard as fallback
            this.copyToClipboard(imageUrl);
            this.showNotification('Image URL copied to clipboard', 'success');
        }
    }

    // Insert image into iframe if possible
    insertImageIntoIframe(imageUrl, altText) {
        try {
            const doc = this.state.iframeDocument;
            const img = doc.createElement('img');
            img.src = imageUrl;
            img.alt = altText;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            
            // Try to insert at a reasonable location
            const body = doc.body;
            if (body) {
                body.appendChild(img);
                this.showNotification('Image added to website', 'success');
            }
        } catch (error) {
            console.error('[ERROR] Failed to insert image:', error);
            this.copyToClipboard(imageUrl);
            this.showNotification('Image URL copied to clipboard', 'info');
        }
    }

    // Copy text to clipboard utility
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
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

    setupIframeDropHandling() {
    if (!this.state.iframeDocument) return;

    const doc = this.state.iframeDocument;

    doc.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    doc.addEventListener("drop", (e) => {
        e.preventDefault();

        let imageUrl =
            e.dataTransfer.getData("text/plain") ||
            e.dataTransfer.getData("text/uri-list");

        if (!imageUrl) return;

        // ✅ If dropped on an existing <img>, replace its src
        if (e.target.tagName === "IMG") {
            e.target.src = imageUrl;
            e.target.removeAttribute("contenteditable"); // optional: stop editing mode
            console.log("Replaced image with Unsplash URL:", imageUrl);
        } else {
            // Otherwise, insert new image where dropped
            const img = doc.createElement("img");
            img.src = imageUrl;
            img.style.maxWidth = "100%";
            e.target.appendChild(img);
        }
    });
}


    checkIframeAccessibility() {
        try {
            const doc = this.elements.resultFrame.contentDocument ||
                this.elements.resultFrame.contentWindow.document;

            if (doc && doc.body) {
                this.state.iframeAccessible = true;
                this.state.iframeDocument = doc; // Store reference to iframe document
                this.setupIframeDropHandling();

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
        const elements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, span, div, button, li, img, article, section');

        elements.forEach(el => {
            el.setAttribute('contenteditable', 'true');
            el.style.outline = '1px dashed rgba(203, 108, 230, 0.5)';
            el.style.cursor = 'true';

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

                // Clear iframe drop listeners
                this.iframeDropListeners = null;

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

            /* Image gallery styles */
            .unsplash-image-container {
                position: relative;
                display: inline-block;
                margin: 8px;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: transform 0.2s ease;
            }

            .unsplash-image-container:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            }

            .unsplash-img {
                width: 200px;
                height: 150px;
                object-fit: cover;
                display: block;
                cursor: pointer;
            }

            .image-overlay {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(transparent, rgba(0,0,0,0.7));
                color: white;
                padding: 10px;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .unsplash-image-container:hover .image-overlay {
                opacity: 1;
            }

            .use-image-btn {
                background: linear-gradient(135deg, #cb6ce6, #aa41c4);
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                margin-bottom: 4px;
                transition: background 0.2s ease;
            }

            .use-image-btn:hover {
                background: linear-gradient(135deg, #aa41c4, #8e2de2);
            }

            .image-info small {
                font-size: 10px;
                opacity: 0.8;
            }

            .loading-images, .error-message, .no-results {
                text-align: center;
                padding: 20px;
                color: #666;
                font-style: italic;
            }

            #image-gallery {
                max-height: 400px;
                overflow-y: auto;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 8px;
                background: #f9f9f9;
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
    saveChangesBtn() {
        const saveBtn = document.getElementById('saveChangesBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (this.state.iframeAccessible && this.state.iframeDocument) {
                    // ✅ Extract updated HTML from iframe
                    const updatedHTML = this.state.iframeDocument.documentElement.outerHTML;
    
                    // Send to backend
                    fetch('/save_changes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ html: updatedHTML })
                    })
                    .then(res => res.json())
                    .then(data => {
                        console.log('[INFO] Changes saved:', data);
                        this.showNotification("Changes saved successfully!", 'success');
                    })
                    .catch(err => {
                        console.error('[ERROR] Failed to save changes:', err);
                        this.showNotification("Failed to save changes", 'error');
                    });
                } else {
                    this.showNotification("No website loaded to save", 'warning');
                }
            });
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
document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            console.log('[INFO] Download button clicked');
            window.location.href = '/download';
            
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const fullscreenBtn = document.querySelector('.tool-icons[title="Full screen preview"]');
    const iframe = document.getElementById('resultFrame'); // your preview iframe

    if (fullscreenBtn && iframe) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                // Enter fullscreen
                if (iframe.requestFullscreen) {
                    iframe.requestFullscreen();
                } else if (iframe.mozRequestFullScreen) { // Firefox
                    iframe.mozRequestFullScreen();
                } else if (iframe.webkitRequestFullscreen) { // Chrome, Safari, Opera
                    iframe.webkitRequestFullscreen();
                } else if (iframe.msRequestFullscreen) { // IE/Edge
                    iframe.msRequestFullscreen();
                }
            } else {
                // Exit fullscreen if already in it
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });
    }
});
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
