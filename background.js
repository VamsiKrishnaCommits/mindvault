// Add this at the top to check if storage is accessible
chrome.storage.local.get(null, (items) => {
  console.log("Initial storage state:", items);
});

// Global summarizer instance
let summarizer = null;

async function initializeSummarizer() {
  try {
    const canSummarize = await ai.summarizer.capabilities();
    if (canSummarize && canSummarize.available !== "no") {
      summarizer = await ai.summarizer.create();
      console.log("Summarizer initialized in background");
    }
  } catch (error) {
    console.error("Failed to initialize summarizer:", error);
  }
}

// Initialize summarizer when service worker starts
initializeSummarizer();

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message:", message);

  if (message.action === "summarizePost") {
    // Immediately respond that we received the request
    sendResponse({ received: true });

    // Handle summarization in the background
    handleSummarization(message.text, sender.tab.id, message.postId).catch(
      (error) => console.error("Summarization error:", error)
    );

    return true; // Keep message channel open for async response
  }

  if (message.action === "savePost") {
    console.log("Saving post:", message.post);
    // First verify we received the tweet data
    if (!message.post || !message.post.url) {
      console.error("Invalid post data received");
      sendResponse({ success: false, error: "Invalid post data" });
      return true;
    }

    // Log the post we're trying to save
    console.log("Post to save:", message.post);

    // Get existing posts first
    chrome.storage.local.get(["posts"], async function (result) {
      let posts = result.posts || {};
      console.log("Post content:", message.post.text);
      // Classify the post using AI
      const category = await classifyPostContent(message.post.text);
      // Add new post with classification
      posts[message.post.url] = {
        ...message.post,
        category: category,
        savedAt: new Date().toISOString(),
      };

      // Save updated posts
      chrome.storage.local.set({ posts: posts }, function () {
        if (chrome.runtime.lastError) {
          console.error("Storage error:", chrome.runtime.lastError);
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message,
          });
        } else {
          console.log("Posts after save:", posts);
          // Verify the save by reading back
          chrome.storage.local.get(["posts"], function (verification) {
            console.log("Verification read:", verification);
            sendResponse({ success: true });
          });
        }
      });
    });

    return true; // Keep the message channel open for async response
  }

  if (message.action === "openPopup") {
    chrome.windows.create({
      url: "popup.html",
      type: "popup",
      width: 400,
      height: 600,
      focused: true,
    });
    return true;
  }
});

// Global session variable
let aiSession = null;

// Initialize AI session
async function initializeAISession() {
  try {
    const { available } = await ai.languageModel.capabilities();
    const systemPrompt = `You are a text classification assistant. Given any text, respond with exactly ONE category from the list below. Choose the most specific category possible.

TECH:
- Technology, Programming, AI, Cybersecurity, Software Development, Hardware, Web Development, Mobile Development, Cloud Computing, Data Science

BUSINESS:
- Business, Marketing, Entrepreneurship, Management, Strategy, Startups, Leadership, Sales, Productivity

SCIENCE:
- Physics, Biology, Chemistry, Astronomy, Mathematics, Research, Medicine, Psychology, Engineering

LIFESTYLE:
- Travel, Food, Fashion, Fitness, Wellness, Home, Relationships, Hobbies, Self Improvement

ARTS:
- Music, Film, Literature, Photography, Design, Architecture, History, Philosophy, Culture

FINANCE:
- Investing, Cryptocurrency, Personal Finance, Economics, Trading, Banking, Insurance, Real Estate

EDUCATION:
- Learning, Teaching, Academic, Skills, Career Development, Training, Tutorials, Resources

Rules:
1. Respond with ONE word only
2. Choose from the categories listed above
3. Use the most specific sub-category when possible
4. No explanations or additional text

Example: "How to build a React Native app for iOS and Android"
Response: Mobile Development

Example: "Top 10 investment strategies for retirement planning"
Response: Investing`;

    if (available !== "no") {
      aiSession = await ai.languageModel.create({
        systemPrompt,
      });
      console.log("AI session initialized successfully");
    }
  } catch (error) {
    console.error("Failed to initialize AI session:", error);
    aiSession = null;
  }
}

// Modified classification function with timing
async function classifyPostContent(postText) {
  const startTime = performance.now();
  try {
    if (!aiSession) {
      await initializeAISession();
    } else {
      console.log("Cloning existing AI session");
      aiSession = await aiSession.clone();
    }

    if (aiSession) {
      // Add context and instruction to the prompt
      const enhancedPrompt = `Please categorize the following post content:
Content: "${postText}"
Based on this content, what is the most specific and relevant category?`;

      console.log("Enhanced prompt:", enhancedPrompt);

      const category = await aiSession.prompt(enhancedPrompt);
      const endTime = performance.now();
      const seconds = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`Post classification took ${seconds} seconds`);
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

async function handleSummarization(text, tabId, postId) {
  try {
    if (!summarizer) {
      await initializeSummarizer();
    }

    const processingMessage = {
      action: "summaryUpdate",
      status: "processing",
      postId: postId,
    };

    chrome.runtime.sendMessage(processingMessage);
    chrome.tabs.sendMessage(tabId, processingMessage);

    const startTime = performance.now();

    // Use streaming summarization
    const stream = await summarizer.summarizeStreaming(text, {
      systemPrompt:
        "You are a post summarizer. Provide a concise 2-sentence maximum summary.",
    });

    let fullSummary = "";
    for await (const chunk of stream) {
      // Only send the new chunk, not the full summary
      const streamMessage = {
        action: "summaryUpdate",
        status: "streaming",
        postId: postId,
        chunk: chunk,
      };
      chrome.runtime.sendMessage(streamMessage);
      chrome.tabs.sendMessage(tabId, streamMessage);
      fullSummary = chunk;
    }

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);

    // Send completion message
    const completionMessage = {
      action: "summaryUpdate",
      status: "complete",
      postId: postId,
      summary: fullSummary,
      duration: duration,
    };

    chrome.runtime.sendMessage(completionMessage);
    chrome.tabs.sendMessage(tabId, completionMessage);
  } catch (error) {
    console.error("Summarization failed:", error);
    const errorMessage = {
      action: "summaryUpdate",
      status: "error",
      postId: postId,
      error: error.message,
    };

    chrome.runtime.sendMessage(errorMessage);
    chrome.tabs.sendMessage(tabId, errorMessage);
  }
}
