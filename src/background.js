const YOUTUBE_MATCH_PATTERN = '*://*.youtube.com/watch*'
const CONTENT_SCRIPT_PATH = 'assets/youtubetranscript.js' // Đảm bảo đường dẫn này chính xác

// Function to inject the content script into a tab
async function injectContentScript(tabId) {
  try {
    // Kiểm tra xem script đã được chèn chưa (cách đơn giản)
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () =>
        typeof window.isYoutubeTranscriptContentScriptReady === 'boolean',
    })

    if (results[0]?.result === true) {
      console.log(`Content script already injected in tab ${tabId}`)
      return // Script đã tồn tại
    }

    // Nếu chưa, chèn script
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: [CONTENT_SCRIPT_PATH],
    })
    console.log(`Content script injected into tab ${tabId}`)

    // Đánh dấu là đã chèn (cần thêm vào content script)
    // await chrome.scripting.executeScript({
    //   target: { tabId: tabId },
    //   func: () => { window.isYoutubeTranscriptContentScriptReady = true; },
    // });
  } catch (err) {
    console.warn(
      `Failed to inject or check content script in tab ${tabId}:`,
      err
    )
    // Xử lý lỗi cụ thể nếu cần
    if (err.message.includes('Cannot access contents of url')) {
      console.warn(
        `Cannot access tab ${tabId}, possibly a chrome:// or protected page.`
      )
    } else if (err.message.includes('Cannot access chrome://')) {
      console.warn(`Skipping chrome:// tab ${tabId}.`)
    } else {
      // Các lỗi khác
    }
  }
}

// 1. Inject script on Action Click (Toolbar Icon)
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) {
    console.warn('Action clicked on a tab without ID or URL.')
    return
  }

  // Check if it's a YouTube video page
  if (tab.url.includes('youtube.com/watch')) {
    // Cách kiểm tra đơn giản hơn
    console.log('Action clicked on YouTube page, attempting injection...')
    await injectContentScript(tab.id)
  } else {
    console.log('Action clicked on non-YouTube page.')
  }

  // Open the side panel regardless of injection result (có thể điều chỉnh)
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId })
  } catch (error) {
    console.error(`Error opening side panel: ${error}`)
    // Có thể thông báo cho người dùng nếu cần
  }
})

// 2. Inject script on Extension Install/Update for existing YouTube tabs
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    console.log(
      `Extension ${details.reason}ed. Checking existing YouTube tabs...`
    )
    try {
      const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/watch*' }) // Chính xác hơn
      for (const tab of tabs) {
        if (tab.id && tab.status === 'complete') {
          // Chỉ chèn vào tab đã tải xong
          console.log(
            `Attempting injection into existing YouTube tab ${tab.id} on ${details.reason}`
          )
          await injectContentScript(tab.id)
        }
      }
    } catch (error) {
      console.error(`Error querying or injecting into existing tabs: ${error}`)
    }
  }
})

// // Tùy chọn: Lắng nghe thay đổi URL để chèn script nếu người dùng điều hướng đến YouTube
// chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
//   if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
//      console.log(`YouTube page loaded/updated: ${tab.url}. Attempting injection...`);
//      await injectContentScript(tabId);
//   }
// });
