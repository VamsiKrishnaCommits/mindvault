// Function to create save button for each tweet
function addSaveButtonsToTweets() {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    
    tweets.forEach(tweet => {
        // Check if we already added a button to this tweet
        if (tweet.querySelector('.knowledge-keeper-btn')) return;
        
        const saveButton = document.createElement('button');
        saveButton.className = 'knowledge-keeper-btn';
        saveButton.innerHTML = '💾';
        
        saveButton.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Immediately show saved state
            saveButton.innerHTML = '✓';
            
            const tweetText = tweet.querySelector('[data-testid="tweetText"]')?.textContent;
            const tweetAuthor = tweet.querySelector('[data-testid="User-Name"]')?.textContent;
            const tweetUrl = tweet.querySelector('a[href*="/status/"]')?.href;
            
            console.log('Attempting to save tweet:', { tweetText, tweetAuthor, tweetUrl });
            
            // Send data to background script for processing
            chrome.runtime.sendMessage({
                action: 'saveTweet',
                tweet: {
                    text: tweetText,
                    author: tweetAuthor,
                    url: tweetUrl,
                    timestamp: new Date().toISOString()
                }
            }, response => {
                // Only handle error case
                if (!response || !response.success) {
                    console.error('Failed to save tweet:', response?.error);
                    saveButton.innerHTML = '❌';
                    setTimeout(() => {
                        saveButton.innerHTML = '💾';
                    }, 2000);
                }
            });
            
            // Reset button state after delay regardless of save status
            setTimeout(() => {
                if (saveButton.innerHTML === '✓') {
                    saveButton.innerHTML = '💾';
                }
            }, 2000);
        });
        
        // Add button to tweet
        const actionsBar = tweet.querySelector('[role="group"]');
        if (actionsBar) {
            actionsBar.appendChild(saveButton);
        }
    });
}

// Monitor for new tweets being added to the page
const observer = new MutationObserver(() => {
    addSaveButtonsToTweets();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Initial run
addSaveButtonsToTweets(); 