// Platform-specific styling
const platformStyles = {
    twitter: {
        color: '#1DA1F2',
        icon: '🐦'
    },
    reddit: {
        color: '#FF4500',
        icon: '🤖'
    },
    linkedin: {
        color: '#0A66C2',
        icon: '💼'
    },
    facebook: {
        color: '#1877F2',
        icon: '👥'
    },
    unknown: {
        color: '#64748b',
        icon: '📝'
    }
};

// Initialize the console
async function initializeConsole() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const clearButton = document.getElementById('clearStorage');

    // Add event listeners
    searchInput.addEventListener('input', refreshPosts);
    categoryFilter.addEventListener('change', refreshPosts);
    clearButton.addEventListener('click', clearAllData);

    // Initial load
    await updateCategoryFilter();
    await refreshPosts();
    updateStats();
}

// Update category filter
async function updateCategoryFilter() {
    const result = await chrome.storage.local.get('posts');
    const posts = result.posts ? Object.values(result.posts) : [];
    const categories = new Set(posts.map(post => post.category || 'Uncategorized'));
    
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    
    Array.from(categories)
        .sort()
        .forEach(category => {
            categoryFilter.innerHTML += `
                <option value="${category}">${category}</option>
            `;
        });
}
// Refresh posts based on current filters
async function refreshPosts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    // Get all posts from storage
    const result = await chrome.storage.local.get('posts');
    const posts = result.posts ? Object.values(result.posts) : [];
    
    // Apply filters
    const filteredPosts = posts.filter(post => {
        const matchesSearch = !searchTerm || 
            post.text?.toLowerCase().includes(searchTerm) ||
            post.author?.toLowerCase().includes(searchTerm) ||
            post.category?.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || post.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    // Display posts
    displayPosts(filteredPosts);
    updateStats();
}

// Display posts in the grid
function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    container.innerHTML = '';

    if (posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No posts found</p>
            </div>`;
        return;
    }

    posts
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .forEach(post => {
            const postElement = createPostElement(post);
            container.appendChild(postElement);
        });
}
// Create a single post element
function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
        
    postDiv.innerHTML = `
        <div class="post-header">
            <span class="category-tag">${post.category || 'Uncategorized'}</span>
        </div>
        <div class="post-content">
            <div class="post-author">${post.author || 'Unknown Author'}</div>
            <div class="post-text">${post.text || 'No text'}</div>
        </div>
        <div class="post-footer">
            <div class="post-actions">
                ${post.url ? `<a href="${post.url}" target="_blank" class="btn btn-primary">View Original</a>` : ''}
                <button class="btn btn-danger delete-btn" data-post-id="${post.id}">Delete</button>
            </div>
            <div class="post-timestamp">Saved: ${new Date(post.timestamp).toLocaleString()}</div>
        </div>
    `;

    // Add delete functionality
    const deleteBtn = postDiv.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deletePost(post.id));

    return postDiv;
}

// Update statistics
async function updateStats() {
    // Get posts from storage using the 'posts' key
    const result = await chrome.storage.local.get('posts');
    const posts = result.posts ? Object.values(result.posts) : [];
    
    // Update total posts count
    document.getElementById('totalPosts').textContent = posts.length;
        
    // Find most recent post
    const lastSaved = posts.reduce((latest, post) => {
        const timestamp = new Date(post.timestamp);
        return timestamp > latest ? timestamp : latest;
    }, new Date(0));
    
    document.getElementById('lastSaved').textContent = 
        lastSaved.getTime() > 0 ? lastSaved.toLocaleString() : '-';
}

// Delete a single post
async function deletePost(postId) {
    // Get current posts
    const result = await chrome.storage.local.get('posts');
    const posts = result.posts || {};
    
    // Delete the specific post
    delete posts[postId];
    
    // Update storage with modified posts object
    await chrome.storage.local.set({ posts });
    
    // Refresh UI
    await updateCategoryFilter();
    await refreshPosts();
    updateStats();
}

// Clear all data
async function clearAllData() {
    if (confirm('Are you sure you want to delete all saved posts?')) {
        // Set posts to empty object instead of clearing all storage
        await chrome.storage.local.set({ posts: {} });
        
        // Refresh UI
        await updateCategoryFilter();
        await refreshPosts();
        updateStats();
    }
}

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', initializeConsole);

