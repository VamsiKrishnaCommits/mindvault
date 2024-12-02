# MindVault

## Inspiration
The inspiration for MindVault emerged from a common frustration with digital note-taking. While tools like Google Keep and Notion are great for saving content, they often become cluttered over time, making it difficult to find specific information later. We wanted to create a solution that automatically organizes saved content, ensuring that when users revisit their notes, they find a well-structured library with proper classification and source references.


MindVault is a Chrome extension that helps you save and categorize content from various platforms (Twitter, Reddit, LinkedIn and more) using AI-powered classification and summarization.

## Features

- Save posts/tweets with one click
- AI-powered content categorization
- Automatic content summarization
- Cross-platform support (Twitter, Reddit, LinkedIn, and more)
- Text selection saving
- Organized content management console

## Prerequisites

Before installing the extension, you need to enable several Chrome flags and APIs:

### 1. Enable Gemini Nano

1. Open Chrome and navigate to `chrome://flags/#optimization-guide-on-device-model`
2. Enable "BypassPerfRequirement"
3. Relaunch Chrome

### 2. Enable Prompt API

1. Go to `chrome://flags/#prompt-api-for-gemini-nano`
2. Select "Enabled"
3. Relaunch Chrome

### 3. Verify Gemini Nano Availability

1. Open DevTools Console (F12)
2. Run: `(await ai.languageModel.capabilities()).available;`
3. Should return "readily"

If not "readily" available:
1. Run `await ai.languageModel.create();` in console (may fail, but that's okay)
2. Relaunch Chrome
3. Go to `chrome://components`
4. Check for "Optimization Guide On Device Model" version ≥ 2024.5.21.1031
5. Click "Check for update" if needed

### 4. Enable Summarization API

1. Navigate to `chrome://flags/#summarization-api-for-gemini-nano`
2. Select "Enabled"
3. Relaunch Chrome
4. Run in console: `await ai.summarizer.create();`
5. Verify with: `await ai.summarizer.capabilities();`
   - Should return "readily" (might take 3-5 minutes)

## Installation

1. Clone the repository:
https://github.com/VamsiKrishnaCommits/mindvault.git


2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `mindvault` directory


## Usage

1. **Saving Content**
   - Click the 💾 button on any supported post
   - Or select text and use the floating save button

2. **Viewing Saved Content**
   - Click the extension icon to open the popup
   - Use the console for advanced management:
     - Categories
     - Search
     - Filters
     - Statistics

3. **Summarization**
   - Click the 📝 button on any post or select text and use the floating summary button
   - View AI-generated summary in the popup


## Troubleshooting

1. **AI Services Not Working**
   - Ensure all flags are enabled
   - Check Chrome version (minimum v122)
   - Verify model downloads in `chrome://components`

2. **Platform Support**
   - Verify selectors in platform adapters
   - Check console for errors

## Contact

For any issues or feedback, please contact vamsi.mosalakanti@gmail.com
