// ==================
// CHAT FUNCTIONALITY
// ==================

const form = document.querySelector('#chat-form');      
const input = form?.querySelector('.form-control');      
const chatBox = document.querySelector('.chat-box');    
const restartBtn = document.getElementById('restartBtn');
const resultFrame = document.getElementById('resultFrame');

// ISSUE 1: Missing null checks - add safety checks
if (!form) {
    console.error('[ERROR] Chat form not found in DOM');
}
if (!input) {
    console.error('[ERROR] Input field not found in DOM');
}
if (!chatBox) {
    console.error('[ERROR] Chat box not found in DOM');
}

// Restart button functionality
if (restartBtn) {
    restartBtn.addEventListener('click', () => {
        console.log('[INFO] Restart button clicked');
        fetch('/restart', {
            method: 'POST'
        })
        .then(res => {
            console.log('[INFO] Restart response received');
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            console.log('[BOT]', data.reply);
            appendMessage('bot', data.reply);
            if (resultFrame) {
                resultFrame.src = '';
            }
        })
        .catch(err => {
            console.error('[ERROR] Failed to restart:', err);
            appendMessage('bot', 'Error restarting session.');
        });
    });
}

// Append message to chat
function appendMessage(sender, text) {
    if (!chatBox) {
        console.error('[ERROR] Cannot append message - chat box not found');
        return;
    }
    
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

// Handle form submission - ISSUE 2: Missing null check for form
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!input) {
            console.error('[ERROR] Input not found');
            return;
        }

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
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            console.log('[BOT]', data.reply);
            appendMessage('bot', data.reply);

            // ISSUE 3: Your backend returns site_id, not url
            if (data.site_id && resultFrame) {
                const url = `/sitepreview/${data.site_id}`;
                console.log('[INFO] Setting iframe to:', url);
                resultFrame.src = url;
            } else if (resultFrame) {
                // Try loading latest preview
                resultFrame.src = '/sitepreview/latest';
                console.log('[INFO] Loading latest preview');
            }
        })
        .catch(err => {
            console.error('[ERROR] Failed to send message:', err);
            appendMessage('bot', 'Error contacting Webby.');
        });
    });
}

// =========================
// SECTION SWITCHING SYSTEM
// =========================

const chatTool = document.getElementById('chatTool');
const editTool = document.getElementById('editTool'); // Make sure this exists in HTML
const chatSection = document.getElementById('chatSection');
const EditSection = document.getElementById('EditSection'); // Fixed reference
const sectionTitle = document.getElementById('section-title');

// Section switching function
function switchSection(sectionType) {
    // Remove active class from all tools
    document.querySelectorAll('.tool-icons').forEach(tool => {
        tool.classList.remove('active');
    });

    if (sectionType === 'chat') {
        if (chatSection) chatSection.classList.remove('hidden');
        if (EditSection) EditSection.classList.add('hidden'); // Fixed reference
        if (chatTool) chatTool.classList.add('active');
        if (sectionTitle) sectionTitle.innerHTML = '💬 Webby <span class="status-indicator"></span>';
        console.log('[INFO] Switched to chat section');
    } else if (sectionType === 'edit') {
        if (EditSection) EditSection.classList.remove('hidden'); // Fixed reference
        if (chatSection) chatSection.classList.add('hidden');
        if (editTool) editTool.classList.add('active'); // Fixed reference
        if (sectionTitle) sectionTitle.innerHTML = '🎨 Edit <span class="status-indicator"></span>';
        console.log('[INFO] Switched to edit section');
    }
}

// Tool bar event listeners with proper null checks
if (chatTool) {
    chatTool.addEventListener('click', () => switchSection('chat'));
}
if (editTool) {
    editTool.addEventListener('click', () => switchSection('edit'));
}

// ========================
// EDIT SECTION SWITCHING SYSTEM
// ========================

// Get all the edit tool buttons and sections
const imagesTool = document.getElementById('imagesTool');
const graphicsTool = document.getElementById('graphicsTool'); 
const videosTool = document.getElementById('videosTool'); 
const imagesSection = document.getElementById('imagesSection');
const graphicsSection = document.getElementById('graphicsSection');
const videosSection = document.getElementById('videosSection');

// Function to switch between edit subsections
function switchEditSubsection(type) {
    console.log(`[INFO] Switching to edit subsection: ${type}`);
    
    // Hide all edit sections and remove active state
    const allEditSections = document.querySelectorAll('.edit-section');
    const allEditTools = document.querySelectorAll('.editor-tool');
    
    allEditSections.forEach(section => {
        section.classList.add('hidden');
        section.classList.remove('active');
    });
    
    allEditTools.forEach(tool => {
        tool.classList.remove('active');
        tool.setAttribute('aria-pressed', 'false');
    });
    
    // Show the selected section and activate the corresponding tool
    switch(type) {
        case 'images':
            if (imagesSection) {
                imagesSection.classList.remove('hidden');
                imagesSection.classList.add('active');
            }
            if (imagesTool) {
                imagesTool.classList.add('active');
                imagesTool.setAttribute('aria-pressed', 'true');
            }
            break;
            
        case 'graphics':
            if (graphicsSection) {
                graphicsSection.classList.remove('hidden');
                graphicsSection.classList.add('active');
            }
            if (graphicsTool) {
                graphicsTool.classList.add('active');
                graphicsTool.setAttribute('aria-pressed', 'true');
            }
            break;
            
        case 'videos':
            if (videosSection) {
                videosSection.classList.remove('hidden');
                videosSection.classList.add('active');
            }
            if (videosTool) {
                videosTool.classList.add('active');
                videosTool.setAttribute('aria-pressed', 'true');
            }
            break;
            
        default:
            console.warn(`[WARN] Unknown edit subsection type: ${type}`);
    }
}

// Add event listeners to edit tools with null checks
if (imagesTool) {
    imagesTool.addEventListener('click', () => switchEditSubsection('images'));
    console.log('[INFO] Images tool listener added');
}

if (graphicsTool) {
    graphicsTool.addEventListener('click', () => switchEditSubsection('graphics'));
    console.log('[INFO] Graphics tool listener added');
}

if (videosTool) {
    videosTool.addEventListener('click', () => switchEditSubsection('videos'));
    console.log('[INFO] Videos tool listener added');
}

// ========================
// EDIT SECTION FUNCTIONALITY
// ========================

// Initialize edit section functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('[INFO] Initializing edit section functionality');
    
    // Set images as default active section
    switchEditSubsection('images');
    
    // Initialize file upload handlers
    initializeFileUploads();
});

// File upload functionality
function initializeFileUploads() {
    console.log('[INFO] Initializing file upload handlers');
    
    // Images upload
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    
    if (imageUpload && imagePreview) {
        imageUpload.addEventListener('change', function(e) {
            handleImageUpload(e.target.files, imagePreview);
        });
        console.log('[INFO] Image upload handler added');
    }
    
    // Graphics upload
    const graphicsUpload = document.getElementById('graphicsUpload');
    const graphicsPreview = document.getElementById('graphicsPreview');
    
    if (graphicsUpload && graphicsPreview) {
        graphicsUpload.addEventListener('change', function(e) {
            handleGraphicsUpload(e.target.files, graphicsPreview);
        });
        console.log('[INFO] Graphics upload handler added');
    }
    
    // Videos upload
    const videoUpload = document.getElementById('videoUpload');
    const videoPreview = document.getElementById('videoPreview');
    
    if (videoUpload && videoPreview) {
        videoUpload.addEventListener('change', function(e) {
            handleVideoUpload(e.target.files, videoPreview);
        });
        console.log('[INFO] Video upload handler added');
    }
}

// Handle image file uploads
function handleImageUpload(files, previewContainer) {
    console.log(`[INFO] Processing ${files.length} image files`);
    
    Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) {
            console.warn(`[WARN] File ${file.name} is not an image`);
            showNotification(`${file.name} is not a valid image file`, 'warning');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageDiv = document.createElement('div');
            imageDiv.className = 'image-item';
            imageDiv.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}" style="max-width: 200px; max-height: 150px; border-radius: 8px; margin: 5px;">
                <div class="image-info">
                    <p style="font-size: 12px; margin: 5px 0;">${file.name}</p>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: #ff4757; color: white; border: none; border-radius: 4px; padding: 2px 8px; cursor: pointer;">
                        Remove
                    </button>
                </div>
            `;
            previewContainer.appendChild(imageDiv);
        };
        reader.readAsDataURL(file);
    });
    
    showNotification(`${files.length} image(s) uploaded successfully`, 'success');
}

// Handle graphics file uploads (similar to images but with different styling)
function handleGraphicsUpload(files, previewContainer) {
    console.log(`[INFO] Processing ${files.length} graphics files`);
    
    Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) {
            console.warn(`[WARN] File ${file.name} is not a graphics file`);
            showNotification(`${file.name} is not a valid graphics file`, 'warning');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const graphicsDiv = document.createElement('div');
            graphicsDiv.className = 'graphics-item';
            graphicsDiv.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}" style="max-width: 180px; max-height: 120px; border-radius: 8px; margin: 5px; border: 2px solid #cb6ce6;">
                <div class="graphics-info">
                    <p style="font-size: 12px; margin: 5px 0; color: #cb6ce6;">${file.name}</p>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: #cb6ce6; color: white; border: none; border-radius: 4px; padding: 2px 8px; cursor: pointer;">
                        Remove
                    </button>
                </div>
            `;
            previewContainer.appendChild(graphicsDiv);
        };
        reader.readAsDataURL(file);
    });
    
    showNotification(`${files.length} graphics file(s) uploaded successfully`, 'success');
}

// Handle video file uploads
function handleVideoUpload(files, previewContainer) {
    console.log(`[INFO] Processing ${files.length} video files`);
    
    Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('video/')) {
            console.warn(`[WARN] File ${file.name} is not a video`);
            showNotification(`${file.name} is not a valid video file`, 'warning');
            return;
        }
        
        const videoURL = URL.createObjectURL(file);
        const videoDiv = document.createElement('div');
        videoDiv.className = 'video-item';
        videoDiv.innerHTML = `
            <video controls style="max-width: 300px; max-height: 200px; border-radius: 8px; margin: 5px;">
                <source src="${videoURL}" type="${file.type}">
                Your browser does not support the video tag.
            </video>
            <div class="video-info">
                <p style="font-size: 12px; margin: 5px 0;">${file.name}</p>
                <button onclick="this.parentElement.parentElement.remove(); URL.revokeObjectURL('${videoURL}')" 
                        style="background: #2ed573; color: white; border: none; border-radius: 4px; padding: 2px 8px; cursor: pointer;">
                    Remove
                </button>
            </div>
        `;
        previewContainer.appendChild(videoDiv);
    });
    
    showNotification(`${files.length} video(s) uploaded successfully`, 'success');
}

// Enhanced notification function specifically for edit section
function showEditNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `edit-notification ${type}`;
    notification.textContent = message;
    
    // Position notification relative to edit section
    const editSection = document.getElementById('EditSection');
    const rect = editSection ? editSection.getBoundingClientRect() : { top: 20, right: 20 };
    
    notification.style.cssText = `
        position: fixed;
        top: ${rect.top + 10}px;
        right: 20px;
        background: ${type === 'success' ? '#2ed573' : type === 'error' ? '#ff4757' : type === 'warning' ? '#ffa502' : '#cb6ce6'};
        color: white;
        padding: 10px 16px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        font-size: 14px;
        font-weight: 500;
        animation: slideInFromRight 0.3s ease;
        max-width: 250px;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutToRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3000);
}

// Add animation styles for edit notifications
const editNotificationStyles = document.createElement('style');
editNotificationStyles.textContent = `
    @keyframes slideInFromRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutToRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
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
    
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .image-item, .graphics-item, .video-item {
        display: inline-block;
        margin: 10px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        text-align: center;
        transition: transform 0.2s ease;
    }
    
    .image-item:hover, .graphics-item:hover, .video-item:hover {
        transform: translateY(-2px);
    }
`;

// Only add styles if they don't exist
if (!document.querySelector('#edit-notification-styles')) {
    editNotificationStyles.id = 'edit-notification-styles';
    document.head.appendChild(editNotificationStyles);
}

// Override the showNotification function for edit section
const originalShowNotification = window.showNotification;
window.showNotification = function(message, type = 'info') {
    // Check if we're in edit mode
    const editSection = document.getElementById('EditSection');
    if (editSection && !editSection.classList.contains('hidden')) {
        showEditNotification(message, type);
    } else if (originalShowNotification) {
        originalShowNotification(message, type);
    } else {
        console.log(`[NOTIFICATION] ${type.toUpperCase()}: ${message}`);
    }
};

console.log('[INFO] Edit section JavaScript loaded successfully');

// ========================
// EDIT SECTION FUNCTIONALITY
// ========================



// ========================
// UTILITY FUNCTIONS
// ========================

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
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
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
if (input) {
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (form) form.dispatchEvent(new Event('submit'));
        }
    });
}

// ========================
// ADDITIONAL TOOL FUNCTIONALITY - ISSUE 7: Backend endpoints don't exist
// ========================

// Download functionality
const downloadBtn = document.querySelector('[title="Download preview"]');
if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
        console.log('[INFO] Download requested');
        showNotification('Download feature not implemented yet', 'info');
        
        // COMMENTED OUT - This endpoint doesn't exist
        /*
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
        */
    });
}

// Full screen functionality
const fullscreenBtn = document.querySelector('[title="Full screen preview"]');
if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', function() {
        console.log('[INFO] Full screen requested');
        
        if (resultFrame) {
            if (resultFrame.requestFullscreen) {
                resultFrame.requestFullscreen();
            } else if (resultFrame.webkitRequestFullscreen) {
                resultFrame.webkitRequestFullscreen();
            } else if (resultFrame.msRequestFullscreen) {
                resultFrame.msRequestFullscreen();
            }
        }
    });
}

// ========================
// INITIALIZATION
// ========================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[INFO] DOM fully loaded');
    
    if (input) {
        input.focus();
    }
    
    if (stylePreview) {
        updatePreview();
    }
    
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

window.addEventListener('resize', function() {
    if (resultFrame) {
        if (window.innerWidth <= 768) {
            resultFrame.style.height = '400px';
        } else {
            resultFrame.style.height = '502px';
        }
    }
});

// ========================
// ERROR HANDLING - ISSUE 8: This was causing the "unexpected error" message
// ========================


// ========================
// EDIT GENERATED WEBSITE - ISSUE 9: Syntax errors
// ========================

// Enhanced save functionality with proper error handling
document.addEventListener("DOMContentLoaded", () => {
    const previewIframe = document.getElementById('resultFrame');
    let iframeAccessible = false;

    // Test iframe accessibility and make elements editable
    if (previewIframe) {
        previewIframe.onload = () => {
            try {
                const doc = previewIframe.contentDocument || previewIframe.contentWindow.document;
                if (doc && doc.body) {
                    // Successfully accessed iframe content
                    iframeAccessible = true;
                    
                    const elements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, img, span, div, button, li, ul, ol, form, input');
                    elements.forEach(el => {
                        el.setAttribute('contenteditable', 'true');
                        el.style.outline = '1px dashed rgba(203, 108, 230, 0.5)';
                        el.style.cursor = 'text';
                        
                        // Add hover effect for better UX
                        el.addEventListener('mouseenter', () => {
                            el.style.outline = '2px solid #cb6ce6';
                        });
                        
                        el.addEventListener('mouseleave', () => {
                            el.style.outline = '1px dashed rgba(203, 108, 230, 0.5)';
                        });
                    });
                    
                    console.log('[SUCCESS] Made elements editable:', elements.length, 'elements');
                    showNotification('Elements are now editable!', 'success');
                } else {
                    throw new Error('Cannot access document body');
                }
            } catch (error) {
                console.log('[WARNING] Cannot access iframe content:', error.message);
                iframeAccessible = false;
                showNotification('Direct editing not available (cross-origin)', 'warning');
            }
        };

        // Handle iframe load errors
        previewIframe.onerror = () => {
            console.error('[ERROR] Failed to load iframe');
            showNotification('Failed to load preview', 'error');
        };
    }

    // Fixed: Use class selector instead of ID
    const saveBtn = document.querySelector(".save-changes");

    if (saveBtn) {
        saveBtn.addEventListener("click", function () {
            // Show loading state
            saveBtn.disabled = true;
            saveBtn.innerHTML = '⏳';
            saveBtn.title = 'Saving...';

            if (!iframeAccessible) {
                showNotification('Cannot save: iframe content not accessible', 'error');
                resetSaveButton();
                return;
            }

            try {
                const iframe = document.getElementById('resultFrame');
                const editableDoc = iframe.contentDocument || iframe.contentWindow.document;
                
                if (!editableDoc) {
                    throw new Error('Cannot access iframe document');
                }

                // Clean up the HTML before saving
                const clonedDoc = editableDoc.cloneNode(true);
                const elements = clonedDoc.querySelectorAll('[contenteditable]');
                
                // Remove editing attributes
                elements.forEach(el => {
                    el.removeAttribute('contenteditable');
                    el.style.outline = '';
                    el.style.cursor = '';
                });

                const updatedHtml = clonedDoc.documentElement.outerHTML;

                // Validate HTML content
                if (!updatedHtml || updatedHtml.length < 100) {
                    throw new Error('Invalid HTML content');
                }

                console.log('[INFO] Saving HTML content, length:', updatedHtml.length);

                fetch("/update_site", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest"
                    },
                    body: JSON.stringify({ html_code: updatedHtml }),
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('[SUCCESS] Site updated:', data);
                    showNotification(data.message || "Changes saved successfully!", 'success');
                    resetSaveButton();
                })
                .catch(error => {
                    console.error('[ERROR] Save failed:', error);
                    showNotification(`Failed to save: ${error.message}`, 'error');
                    resetSaveButton();
                });

            } catch (error) {
                console.error('[ERROR] Save operation failed:', error);
                showNotification(`Save error: ${error.message}`, 'error');
                resetSaveButton();
            }
        });
    } else {
        console.warn("⚠️ Save Changes button not found - check class selector");
    }

    // Helper function to reset save button
    function resetSaveButton() {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '💾';
            saveBtn.title = 'Save changes';
        }
    }

    // Enhanced notification system
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.save-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `save-notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${getNotificationColor(type)};
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
        `;

        document.body.appendChild(notification);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 4000);
    }

    function getNotificationColor(type) {
        const colors = {
            success: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
            error: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
            warning: 'linear-gradient(135deg, #ffeaa7, #fdcb6e)',
            info: 'linear-gradient(135deg, #cb6ce6, #aa41c4)'
        };
        return colors[type] || colors.info;
    }

    // Add CSS animations if not already present
    if (!document.querySelector('#save-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'save-notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideOutRight {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }
        `;
        document.head.appendChild(style);
    }
});