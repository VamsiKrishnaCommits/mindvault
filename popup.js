let allPosts = {};

function displayPosts(posts, searchTerm = '') {
    const container = document.getElementById('posts-container');
    console.log('Displaying posts:', posts);
    
    if (!container) {
        console.error('Post container not found!');
        return;
    }
    
    container.innerHTML = '';

    if (!posts || Object.keys(posts).length === 0) {
        console.log('No posts to display');
        container.innerHTML = `
            <div class="empty-state">
                <p>No saved posts yet!</p>
                <small>Save posts by clicking the 💾 button on supported platforms</small>
            </div>`;
        return;
    }

    const filteredPosts = Object.values(posts).filter(post => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            post.text?.toLowerCase().includes(searchLower) ||
            post.author?.toLowerCase().includes(searchLower) ||
            post.category?.toLowerCase().includes(searchLower)
        );
    });

    console.log('Filtered posts:', filteredPosts);

    if (filteredPosts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No posts match your search</p>
            </div>`;
        return;
    }

    filteredPosts
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'post';
            postElement.innerHTML = `
                <div class="category-tag">${post.category || 'Uncategorized'}</div>
                <p class="post-author">${post.author || 'Unknown Author'}</p>
                <p class="post-text">${post.text || 'No text'}</p>
                <a href="${post.url}" target="_blank" class="post-link">View Original</a>
                <small class="post-timestamp">Saved: ${new Date(post.timestamp).toLocaleString()}</small>
            `;
            container.appendChild(postElement);
        });
}

function updateDebugData() {
    chrome.storage.local.get(null, (data) => {
        console.log('All storage data:', data);
        const debugData = document.getElementById('debug-data');
        if (debugData) {
            debugData.textContent = JSON.stringify(data, null, 2);
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const mainView = document.getElementById('main-view');
    const summaryView = document.getElementById('summary-view');
    
    if (mainView && summaryView) {
        mainView.style.display = 'block';
        summaryView.style.display = 'none';
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            displayPosts(allPosts, e.target.value);
        });
    }

    // Load posts immediately
    try {
        const result = await chrome.storage.local.get(['posts']);
        console.log('Retrieved posts from storage:', result);
        allPosts = result.posts || {};
        displayPosts(allPosts);
    } catch (error) {
        console.error('Error loading posts:', error);
    }

    // Debug buttons functionality
    const showStorageBtn = document.getElementById('showStorage');
    const clearStorageBtn = document.getElementById('clearStorage');
    
    if (showStorageBtn) {
        showStorageBtn.addEventListener('click', () => {
            const debugData = document.getElementById('debug-data');
            if (debugData) {
                debugData.style.display = debugData.style.display === 'none' ? 'block' : 'none';
                updateDebugData();
            }
        });
    }

    if (clearStorageBtn) {
        clearStorageBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all saved posts?')) {
                chrome.storage.local.clear(() => {
                    allPosts = {};
                    displayPosts({});
                    updateDebugData();
                });
            }
        });
    }

    const openConsoleButton = document.getElementById('openConsole');
    if (openConsoleButton) {
        openConsoleButton.addEventListener('click', () => {
            chrome.tabs.create({ 
                url: chrome.runtime.getURL('console.html'),
                active: true 
            });
        });
    }

});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('Storage changed:', changes);
    if (namespace === 'local' && changes.posts) {
        allPosts = changes.posts.newValue || {};
        const searchInput = document.getElementById('searchInput');
        displayPosts(allPosts, searchInput ? searchInput.value : '');
        updateDebugData();
    }
});