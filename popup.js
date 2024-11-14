let allTweets = {};

function displayTweets(tweets, searchTerm = '') {
    const container = document.getElementById('tweets-container');
    console.log('Displaying tweets:', tweets);
    
    if (!container) {
        console.error('Tweet container not found!');
        return;
    }
    
    container.innerHTML = '';

    if (!tweets || Object.keys(tweets).length === 0) {
        console.log('No tweets to display');
        container.innerHTML = `
            <div class="empty-state">
                <p>No saved tweets yet!</p>
                <small>Save tweets by clicking the 💾 button on Twitter</small>
            </div>`;
        return;
    }

    const filteredTweets = Object.values(tweets).filter(tweet => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            tweet.text?.toLowerCase().includes(searchLower) ||
            tweet.author?.toLowerCase().includes(searchLower) ||
            tweet.category?.toLowerCase().includes(searchLower)
        );
    });

    console.log('Filtered tweets:', filteredTweets);

    if (filteredTweets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No tweets match your search</p>
            </div>`;
        return;
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
                <a href="${tweet.url}" target="_blank" class="tweet-link">View on Twitter</a>
                <small class="tweet-timestamp">Saved: ${new Date(tweet.timestamp).toLocaleString()}</small>
            `;
            container.appendChild(tweetElement);
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

document.addEventListener('DOMContentLoaded', () => {
    console.log('Popup DOM loaded');
    
    // Initialize search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            displayTweets(allTweets, e.target.value);
        });
    }

    // Display tweets
    chrome.storage.local.get(['tweets'], (result) => {
        console.log('Retrieved tweets from storage:', result);
        allTweets = result.tweets || {};
        displayTweets(allTweets);
    });

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
            if (confirm('Are you sure you want to clear all saved tweets?')) {
                chrome.storage.local.clear(() => {
                    allTweets = {};
                    displayTweets({});
                    updateDebugData();
                });
            }
        });
    }

    document.getElementById('openConsole').addEventListener('click', () => {
        chrome.tabs.create({ url: 'console.html' });
    });
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('Storage changed:', changes);
    if (namespace === 'local' && changes.tweets) {
        allTweets = changes.tweets.newValue || {};
        const searchInput = document.getElementById('searchInput');
        displayTweets(allTweets, searchInput ? searchInput.value : '');
        updateDebugData();
    }
}); 