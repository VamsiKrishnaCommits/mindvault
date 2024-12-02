const platformAdapters = {
    twitter: {
        postSelector: 'article[data-testid="tweet"]',
        textSelector: '[data-testid="tweetText"]',
        authorSelector: '[data-testid="User-Name"]',
        buttonInsertionPoint: (post) => post.querySelector('[data-testid="bookmark"]')?.parentElement,
        getPostId: (element) => element.querySelector('a[href*="/status/"]')?.href.split('/').pop(),
        getText: (element) => element.querySelector('[data-testid="tweetText"]')?.textContent || '',
        getUrl: (element) => element.querySelector('a[href*="/status/"]')?.href
    },
    reddit: {
        postSelector: 'shreddit-post',
        authorSelector: 'a[slot="credit-bar"] span',
        buttonInsertionPoint: (post) => {
            return post.querySelector('[slot="credit-bar"]') || 
                   post.querySelector('.header');
        },
        getPostId: (element) => {
            return element.getAttribute('id') || 
                   element.getAttribute('data-ks-item');
        },
        getText: (element) => {
            const textElement = element.querySelector('.md.feed-card-text-preview') || 
                               element.querySelector('.post-title') ||
                               element.querySelector('h1[slot="title"]') ||
                               element.querySelector('a[slot="title"]');
            
            return textElement ? textElement.textContent.trim() : '';
        },
        getUrl: (element) => {
            const permalink = element.getAttribute('permalink');
            if (permalink) {
                return `https://www.reddit.com${permalink}`;
            }
            
            const anyPostLink = element.querySelector('a[href*="/comments/"]')?.href;
            return anyPostLink || null;
        }
    },
    linkedin: {
        postSelector: '.feed-shared-update-v2',
        textSelector: '.feed-shared-text',
        authorSelector: '.update-components-actor__title',
        buttonInsertionPoint: (post) => {
            return post.querySelector('.feed-shared-social-action-bar__action-button') || 
                   post.querySelector('.feed-shared-social-action-bar');
        },
        getPostId: (element) => {
            const activitySection = element.querySelector('[data-urn]');
            if (activitySection?.getAttribute('data-urn')) {
                return activitySection.getAttribute('data-urn');
            }
            const parentDiv = element.closest('[data-id]');
            return parentDiv?.getAttribute('data-id') || null;
        },
        getText: (element) => {
            const textElement = element.querySelector('.feed-shared-text') || 
                               element.querySelector('.update-components-text');
            return textElement ? textElement.textContent.trim() : '';
        },
        getUrl: (element) => {
            const urn = element.querySelector('[data-urn]')?.getAttribute('data-urn') || 
                       element.closest('[data-id]')?.getAttribute('data-id');
            return urn ? `https://www.linkedin.com/feed/update/${urn}` : null;
        }
    }
};

function detectPlatform(url) {
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('reddit.com')) return 'reddit';
    if (url.includes('linkedin.com')) return 'linkedin';
    return null;
}

function createButtonContainer() {
    const container = document.createElement('div');
    container.className = 'knowledge-keeper-buttons';
    container.style.cssText = `
        display: inline-flex;
        align-items: center;
    `;
    return container;
}

function createSaveButton(post, adapter, postId) {
    const saveButton = document.createElement('button');
    saveButton.className = 'knowledge-keeper-btn save-btn';
    saveButton.innerHTML = '💾';
    saveButton.title = 'Save post';
    
    saveButton.addEventListener('click', async (e) => {
        console.log('Save button clicked');
        e.preventDefault();
        e.stopPropagation();
        
        const postText = adapter.getText(post);
        if (!postText) return;
        
        // Visual feedback
        saveButton.innerHTML = '✅';
        
        // Get author and URL using adapter methods
        const author = post.querySelector(adapter.authorSelector)?.textContent || 'Unknown';
        const url = adapter.getUrl(post);
        
        // Prepare post data
        const postData = {
            text: postText,
            author: author,
            url: url,
            platform: detectPlatform(window.location.href),
            timestamp: Date.now()
        };

        // Send message to background script
        chrome.runtime.sendMessage({
            action: 'savePost',
            post: {
                text: postText,
                author: author,
                url: url,
                timestamp: new Date().toISOString()
            }
        }, response => {
            if (!response || !response.success) {
                console.error('Failed to save post:', response?.error);
                saveButton.innerHTML = '❌';
                setTimeout(() => {
                    saveButton.innerHTML = '💾';
                }, 2000);
            } else {
                saveButton.innerHTML = '✅';
                setTimeout(() => {
                    saveButton.innerHTML = '💾';
                }, 2000);
            }
        });
    });
    
    return saveButton;
}

function createSummarizeButton(post, adapter, postId) {
    const summarizeButton = document.createElement('button');
    summarizeButton.className = 'knowledge-keeper-btn summarize-btn';
    summarizeButton.innerHTML = '📝';
    summarizeButton.title = 'Summarize post';
    
    summarizeButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const postText = adapter.getText(post);
        if (!postText) return;
        
        summarizeButton.innerHTML = '⌛';
        
        let summaryContainer = document.getElementById('summarizer');
        if (!summaryContainer) {
            summaryContainer = createDraggableSummary(postId);
        }
        
        summaryContainer.dataset.buttonId = postId;
        
        await chrome.storage.local.set({
            currentSummary: {
                text: postText,
                postId: postId,
                status: 'processing'
            }
        });
        
        chrome.runtime.sendMessage({
            action: 'summarizePost',
            text: postText,
            postId: postId
        });
    });
    
    return summarizeButton;
}

function addButtonsToPosts() {
    const platform = detectPlatform(window.location.href);
    console.log('Current platform:', platform);
    
    if (!platform) {
        console.log('No platform detected');
        return;
    }

    const adapter = platformAdapters[platform];
    console.log('Using adapter:', adapter);
    
    const posts = document.querySelectorAll(adapter.postSelector);
    console.log('Found posts:', posts.length);
    
    posts.forEach((post, index) => {
        console.log(`Processing post ${index + 1}`);
        if (post.querySelector('.knowledge-keeper-btn')) {
            console.log('Buttons already exist for this post');
            return;
        }
        
        const insertionPoint = adapter.buttonInsertionPoint(post);
        if (!insertionPoint) {
            console.log('No insertion point found for post');
            return;
        }
        
        const buttonContainer = createButtonContainer();
        const postId = adapter.getPostId(post);
        const postUrl = adapter.getUrl(post);
        console.log('Post ID:', postId);
        console.log('Post URL:', postUrl);
        
        const saveButton = createSaveButton(post, adapter, postId);
        const summarizeButton = createSummarizeButton(post, adapter, postId);
        
        buttonContainer.appendChild(saveButton);
        buttonContainer.appendChild(summarizeButton);
        insertionPoint.appendChild(buttonContainer);
    });
}

// Run initially and set up mutation observer
addButtonsToPosts();
const observer = new MutationObserver(addButtonsToPosts);
observer.observe(document.body, { childList: true, subtree: true });

function createDraggableSummary(tweetId) {
    const container = document.createElement('div');
    container.className = 'summary-container';
    container.id = `summarizer`;
    
    container.innerHTML = `
        <div class="summary-header">
            <h4 class="summary-title">Summary</h4>
            <button class="summary-close">×</button>
        </div>
        <div class="summary-content">
            Generating summary...
        </div>
    `;

    document.body.appendChild(container);

    // Dragging functionality
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    container.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === container || e.target.closest('.summary-header')) {
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;

            container.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
    }

    function dragEnd() {
        isDragging = false;
    }

    // Close button functionality
    container.querySelector('.summary-close').addEventListener('click', () => {
        container.remove();
    });

    return container;
}

// Add message listener for summary updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'summaryUpdate') {
        const summaryContainer = document.getElementById(`summarizer`);
        if (!summaryContainer) return;

        const summaryContent = summaryContainer.querySelector('.summary-content');
        if (!summaryContent) return;

        switch (message.status) {
            case 'processing':
                summaryContent.innerHTML = '<div class="summary-text generating"></div>';
                break;
            case 'streaming':
                const textDiv = summaryContent.querySelector('.summary-text');
                if (textDiv) {
                    textDiv.textContent = message.chunk;
                }
                break;
            case 'complete':
                summaryContent.innerHTML = `
                    <div class="summary-text">${message.summary}</div>
                    <small>Generated in ${message.duration}s</small>
                `;
                break;
            case 'error':
                summaryContent.innerHTML = `Error: ${message.error}`;
                break;
        }
    }
});

// Create selection overlay
function createSelectionOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'selection-overlay';
    overlay.style.cssText = `
        position: absolute;
        background: rgba(255, 255, 255, 0.98);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 8px;
        display: flex;
        gap: 8px;
        z-index: 9999;
        border: 1px solid rgba(0, 0, 0, 0.1);
    `;
    return overlay;
}

// Create overlay buttons
function createOverlayButton(icon, title, onClick) {
    const button = document.createElement('button');
    button.innerHTML = icon;
    button.title = title;
    button.style.cssText = `
        border: none;
        background: none;
        padding: 8px;
        cursor: pointer;
        border-radius: 6px;
        transition: background 0.2s;
        font-size: 16px;
    `;
    button.addEventListener('mouseenter', () => {
        button.style.background = 'rgba(0, 0, 0, 0.05)';
    });
    button.addEventListener('mouseleave', () => {
        button.style.background = 'none';
    });
    button.addEventListener('click', onClick);
    return button;
}

// Handle text selection
document.addEventListener('mouseup', (e) => {
    // Ignore selections within our own UI elements
    if (e.target.closest('.knowledge-keeper-btn') || 
        e.target.closest('.selection-overlay') ||
        e.target.closest('.summary-container')) {
        return;
    }

    const existingOverlay = document.querySelector('.selection-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && selectedText.length > 1) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const overlay = createSelectionOverlay();

        // Save button with visual feedback
        const saveButton = createOverlayButton('💾', 'Save selection', async () => {
            const postId = 'selection-' + Date.now();
            const postData = {
                id: postId,
                text: selectedText,
                author: 'Selected Text',
                url: window.location.href,
                timestamp: Date.now()
            };

            saveButton.innerHTML = '✅'; // Changed to check icon

            chrome.runtime.sendMessage({
                action: 'savePost',
                post: postData
            }, response => {
                if (response?.success) {
                    saveButton.innerHTML = '✅'; // Changed to check icon
                    setTimeout(() => overlay.remove(), 1000);
                } else {
                    saveButton.innerHTML = '❌';
                    setTimeout(() => {
                        saveButton.innerHTML = '💾';
                    }, 2000);
                }
            });
        });

        // Summarize button with visual feedback
        const summarizeButton = createOverlayButton('📝', 'Summarize selection', () => {
            const postId = 'selection-' + Date.now();
            summarizeButton.innerHTML = '⌛'; // Show loading state
            
            let summaryContainer = document.getElementById('summarizer');
            if (!summaryContainer) {
                summaryContainer = createDraggableSummary(postId);
                document.body.appendChild(summaryContainer);
            }

            chrome.runtime.sendMessage({
                action: 'summarizePost',
                text: selectedText,
                postId: postId
            }, response => {
                if (response?.received) {
                    overlay.remove();
                } else {
                    summarizeButton.innerHTML = '❌';
                    setTimeout(() => {
                        summarizeButton.innerHTML = '📝';
                    }, 2000);
                }
            });
        });

        overlay.appendChild(saveButton);
        overlay.appendChild(summarizeButton);

        // Position the overlay
        const overlayTop = window.scrollY + rect.top - overlay.offsetHeight - 10;
        const overlayLeft = window.scrollX + rect.left + (rect.width / 2);

        overlay.style.position = 'absolute';
        overlay.style.top = `${overlayTop}px`;
        overlay.style.left = `${overlayLeft}px`;
        overlay.style.transform = 'translateX(-50%)';

        document.body.appendChild(overlay);

        // Remove overlay when clicking outside
        document.addEventListener('mousedown', (e) => {
            if (!overlay.contains(e.target)) {
                overlay.remove();
            }
        }, { once: true });
    }
}); 