let allTweets = {};

function updateStats() {
    const tweets = Object.values(allTweets);
    document.getElementById('totalTweets').textContent = tweets.length;
    
    const categories = new Set(tweets.map(t => t.category));
    document.getElementById('totalCategories').textContent = categories.size;
    
    const lastSaved = tweets.length > 0 
        ? new Date(Math.max(...tweets.map(t => new Date(t.timestamp)))).toLocaleDateString()
        : '-';
    document.getElementById('lastSaved').textContent = lastSaved;
    
    // Update category filter options
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    [...categories].sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

function displayTweets(tweets, searchTerm = '', categoryFilter = '') {
    const container = document.getElementById('tweets-container');
    container.innerHTML = '';

    let filteredTweets = Object.values(tweets);

    if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredTweets = filteredTweets.filter(tweet => 
            tweet.text?.toLowerCase().includes(searchLower) ||
            tweet.author?.toLowerCase().includes(searchLower) ||
            tweet.category?.toLowerCase().includes(searchLower)
        );
    }

    if (categoryFilter) {
        filteredTweets = filteredTweets.filter(tweet => 
            tweet.category === categoryFilter
        );
    }

    filteredTweets
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .forEach(tweet => {
            const tweetElement = document.createElement('div');
            tweetElement.className = 'tweet';
            tweetElement.innerHTML = `
                <div class="category-tag">${tweet.category || 'Uncategorized'}</div>
                <p class="tweet-author">${tweet.author || 'Unknown Author'}</p>
                <p class="tweet-text">${tweet.text || 'No text'}</p>
                <div class="tweet-actions">
                    <a href="${tweet.url}" target="_blank" class="btn btn-primary">View Tweet</a>
                    <button class="btn btn-danger" onclick="deleteTweet('${tweet.url}')">Delete</button>
                </div>
                <small class="tweet-timestamp">Saved: ${new Date(tweet.timestamp).toLocaleString()}</small>
            `;
            container.appendChild(tweetElement);
        });
}

function deleteTweet(url) {
    if (confirm('Are you sure you want to delete this tweet?')) {
        delete allTweets[url];
        chrome.storage.local.set({ tweets: allTweets }, () => {
            updateStats();
            displayTweets(allTweets, 
                document.getElementById('searchInput').value,
                document.getElementById('categoryFilter').value
            );
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize search and filter functionality
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');

    searchInput.addEventListener('input', (e) => {
        displayTweets(allTweets, e.target.value, categoryFilter.value);
    });

    categoryFilter.addEventListener('change', (e) => {
        displayTweets(allTweets, searchInput.value, e.target.value);
    });

    // Clear storage button
    document.getElementById('clearStorage').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all saved tweets?')) {
            chrome.storage.local.clear(() => {
                allTweets = {};
                updateStats();
                displayTweets(allTweets);
            });
        }
    });

    // Load initial data
    chrome.storage.local.get(['tweets'], (result) => {
        allTweets = result.tweets || {};
        updateStats();
        displayTweets(allTweets);
    });
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.tweets) {
        allTweets = changes.tweets.newValue || {};
        updateStats();
        displayTweets(allTweets, 
            document.getElementById('searchInput').value,
            document.getElementById('categoryFilter').value
        );
    }
});
