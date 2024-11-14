// Add this at the top to check if storage is accessible
chrome.storage.local.get(null, (items) => {
    console.log('Initial storage state:', items);
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message:', message);
    
    if (message.action === 'saveTweet') {
        // First verify we received the tweet data
        if (!message.tweet || !message.tweet.url) {
            console.error('Invalid tweet data received');
            sendResponse({ success: false, error: 'Invalid tweet data' });
            return true;
        }

        // Log the tweet we're trying to save
        console.log('Tweet to save:', message.tweet);

        // Get existing tweets first
        chrome.storage.local.get(['tweets'], async function(result) {
            let tweets = result.tweets || {};
            
            // Classify the tweet using AI
            const category = await classifyTweetContent(message.tweet.text);
            
            // Add new tweet with classification
            tweets[message.tweet.url] = {
                ...message.tweet,
                category: category,
                savedAt: new Date().toISOString()
            };
            
            // Save updated tweets
            chrome.storage.local.set({ tweets: tweets }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Storage error:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    console.log('Tweets after save:', tweets);
                    // Verify the save by reading back
                    chrome.storage.local.get(['tweets'], function(verification) {
                        console.log('Verification read:', verification);
                        sendResponse({ success: true });
                    });
                }
            });
        });

        return true; // Keep the message channel open for async response
    }
});

// Global session variable
let aiSession = null;

// Initialize AI session
async function initializeAISession() {
    try {
        const { available } = await ai.languageModel.capabilities();
        if (available !== "no") {
            aiSession = await ai.languageModel.create({
                systemPrompt: "You are a tweet classifier. Analyze the tweet content and return a single relevant category tag. Respond with just the category name. If there are multiple categories, choose the most relevant one. But make sure to choose one."
            });
            console.log('AI session initialized successfully');
        }
    } catch (error) {
        console.error('Failed to initialize AI session:', error);
        aiSession = null;
    }
}

// Modified classification function with timing
async function classifyTweetContent(tweetText) {
    const startTime = performance.now();
    try {
        // If session doesn't exist or was destroyed, create a new one
        if (!aiSession) {
            await initializeAISession();
        }
        
        if (aiSession) {
            const category = await aiSession.prompt(tweetText);
            const endTime = performance.now();
            const seconds = ((endTime - startTime) / 1000).toFixed(2);
            console.log(`Tweet classification took ${seconds} seconds`);
            return category.trim();
        }
        return "Uncategorized";
    } catch (error) {
        const endTime = performance.now();
        const seconds = ((endTime - startTime) / 1000).toFixed(2);
        console.error(`AI classification error after ${seconds} seconds:`, error);
        // If we get a session error, try to reinitialize for next time
        aiSession = null;
        return "Uncategorized";
    }
}

// Initialize the session when the extension starts
initializeAISession();

// Clean up session when extension is shutting down
chrome.runtime.onSuspend.addListener(() => {
    if (aiSession) {
        aiSession.destroy();
        aiSession = null;
    }
}); 