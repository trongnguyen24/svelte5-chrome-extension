const YOUTUBE_MATCH_PATTERN = '*://*.youtube.com/watch*'
const CONTENT_SCRIPT_PATH = 'assets/youtubetranscript.js'

// Function to inject the content script into a tab
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: [CONTENT_SCRIPT_PATH],
    })
    console.log(`Content script injected into tab ${tabId}`)
  } catch (err) {
    // Log the error, but don't throw, as the script might already be injected
    // (e.g., via manifest or previous injection)
    console.warn(`Failed to inject content script into tab ${tabId}:`, err)
    // We might want more sophisticated checks here in the future,
    // like pinging the content script first.
  }
}

// 1. Inject script on Action Click (Toolbar Icon)
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) {
    console.warn('Action clicked on a tab without ID or URL.')
    return
  }

  // Check if it's a YouTube video page
  if (tab.url.match(YOUTUBE_MATCH_PATTERN)) {
    console.log('Action clicked on YouTube page, attempting injection...')
    await injectContentScript(tab.id)
  }

  // Open the side panel
  await chrome.sidePanel.open({ windowId: tab.windowId })
})

// 2. Inject script on Extension Install/Update for existing YouTube tabs
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    const tabs = await chrome.tabs.query({ url: YOUTUBE_MATCH_PATTERN })
    for (const tab of tabs) {
      if (tab.id) {
        console.log(
          `Injecting script into existing YouTube tab ${tab.id} on ${details.reason}`
        )
        await injectContentScript(tab.id)
      }
    }
  }
})

// Optional: Handle cases where the side panel is opened by other means (e.g., keyboard shortcut)
// This might require listening to side panel events if available, or other triggers.
// For now, clicking the action icon is the primary trigger.
