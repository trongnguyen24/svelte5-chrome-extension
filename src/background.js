const YOUTUBE_MATCH_PATTERN = '*://*.youtube.com/watch*'
const CONTENT_SCRIPT_PATH = 'assets/youtubetranscript.js' // Đảm bảo đường dẫn này chính xác

// Function to inject the content script into a tab
async function injectContentScript(tabId) {
  // Thêm kiểm tra xem chrome.scripting có tồn tại không
  if (!chrome.scripting) {
    console.error(
      'chrome.scripting API is not available. Check permissions or context.'
    )
    return
  }

  try {
    // Kiểm tra xem script đã được chèn chưa (cách đơn giản)
    console.log(`Checking if script already exists in tab ${tabId}...`)
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () =>
        typeof window.isYoutubeTranscriptContentScriptReady === 'boolean',
    })
    console.log(`Script check result for tab ${tabId}:`, results)

    if (results[0]?.result === true) {
      console.log(`Content script already injected in tab ${tabId}`)
      return // Script đã tồn tại
    }

    // Nếu chưa, chèn script
    console.log(`Attempting to inject script into tab ${tabId}...`)
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
      err,
      // Log thêm thông tin lỗi nếu có
      err.stack
    )
    // Xử lý lỗi cụ thể nếu cần
    if (err.message?.includes('Cannot access contents of url')) {
      console.warn(
        `Cannot access tab ${tabId}, possibly a chrome:// or protected page.`
      )
    } else if (err.message?.includes('Cannot access chrome://')) {
      console.warn(`Skipping chrome:// tab ${tabId}.`)
    } else if (err.message?.includes('No tab with id')) {
      console.warn(`Tab with id ${tabId} not found.`)
    } else {
      // Các lỗi khác
      console.warn(`An unexpected error occurred for tab ${tabId}:`, err)
    }
  }
}

// 1. Inject script on Action Click (Toolbar Icon)
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) {
    console.warn('Action clicked on a tab without ID or URL.')
    return
  }

  // Luôn thử mở side panel trước
  try {
    console.log(`Attempting to open side panel for window ${tab.windowId}...`)
    await chrome.sidePanel.open({ windowId: tab.windowId })
    console.log(`Side panel open command issued for window ${tab.windowId}.`)
  } catch (error) {
    console.error(
      `Error opening side panel for window ${tab.windowId}: ${error}`
    )
    // Ghi lại lỗi nhưng vẫn tiếp tục thử inject script nếu cần
  }

  // Sau đó mới kiểm tra và inject script nếu là trang YouTube
  if (tab.url.includes('youtube.com/watch')) {
    console.log('Action clicked on YouTube page, attempting injection...')
    await injectContentScript(tab.id)
  } else {
    console.log('Action clicked on non-YouTube page.')
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

// Lắng nghe tin nhắn từ các phần khác của extension (ví dụ: side panel)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[background.js] Received message:', message, 'from:', sender)

  // Xử lý yêu cầu lấy transcript từ side panel
  if (message.action === 'getTranscript' && message.tabId) {
    const targetTabId = message.tabId
    console.log(
      `[background.js] Processing getTranscript for tab ${targetTabId}`
    )

    // Sử dụng hàm bất đồng bộ để xử lý và gửi phản hồi
    ;(async () => {
      try {
        // Đảm bảo content script đã được inject (có thể gọi lại injectContentScript nếu cần)
        // Hoặc đơn giản là thực thi trực tiếp hàm lấy transcript
        // Lưu ý: Hàm getTranscriptContent phải được định nghĩa
        // hoặc bạn inject một file chứa hàm đó.
        // Ở đây, chúng ta sẽ inject một hàm đơn giản làm ví dụ.
        const results = await chrome.scripting.executeScript({
          target: { tabId: targetTabId },
          func: () => {
            // Logic để lấy transcript từ trang YouTube
            // Ví dụ đơn giản: tìm phần tử chứa transcript
            // *** THAY THẾ BẰNG LOGIC LẤY TRANSCRIPT THỰC TẾ CỦA BẠN ***
            const transcriptElement = document.querySelector(
              'ytd-transcript-body-renderer'
            ) // Selector ví dụ
            return transcriptElement
              ? transcriptElement.innerText
              : 'Transcript not found.'
          },
        })

        // Kiểm tra kết quả trả về từ executeScript
        if (chrome.runtime.lastError) {
          // Lỗi trong quá trình executeScript
          console.error(
            `[background.js] executeScript error: ${chrome.runtime.lastError.message}`
          )
          sendResponse({ error: chrome.runtime.lastError.message })
        } else if (results && results[0]) {
          console.log(
            `[background.js] Script executed successfully on tab ${targetTabId}. Result:`,
            results[0].result
          )
          sendResponse({ transcript: results[0].result })
        } else {
          console.warn(
            `[background.js] executeScript returned unexpected results for tab ${targetTabId}:`,
            results
          )
          sendResponse({
            error: 'Failed to execute script or no result returned.',
          })
        }
      } catch (err) {
        console.error(
          `[background.js] Error executing script for tab ${targetTabId}:`,
          err
        )
        sendResponse({
          error:
            err.message || 'Unknown error occurred during script execution.',
        })
      }
    })()

    // Trả về true để chỉ ra rằng sendResponse sẽ được gọi bất đồng bộ
    return true
  }

  // Xử lý các action khác nếu cần
  // else if (message.action === 'anotherAction') { ... }

  // Nếu không xử lý message này, không cần trả về gì hoặc trả về false
  console.log('[background.js] No specific action handler for this message.')
  // return false; // Không cần thiết vì mặc định là false
})

console.log('[background.js] Message listener added.')

// 3. Lắng nghe sự kiện chuyển tab để cập nhật trạng thái loại tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    if (tab && tab.url) {
      const isYouTube = tab.url.includes('youtube.com/watch')
      console.log(
        `[background.js] Tab activated: ${tab.url}, Is YouTube: ${isYouTube}`
      )
      // Gửi message đến side panel (hoặc các phần khác lắng nghe)
      chrome.runtime
        .sendMessage({
          action: 'tabUpdated',
          isYouTube: isYouTube,
          tabId: tab.id, // Gửi kèm tabId để tiện xử lý nếu cần
        })
        .catch((error) => {
          // Bắt lỗi nếu không có listener nào hoặc side panel chưa mở
          if (
            error.message.includes('Could not establish connection') ||
            error.message.includes('Receiving end does not exist')
          ) {
            console.warn(
              '[background.js] Side panel not open or no listener for tabUpdated message.'
            )
          } else {
            console.error(
              '[background.js] Error sending tabUpdated message:',
              error
            )
          }
        })
    }
  } catch (error) {
    console.error('[background.js] Error in onActivated listener:', error)
  }
})

console.log('[background.js] Tab activation listener added.')
