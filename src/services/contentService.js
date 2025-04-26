import {
  getActiveTabInfo,
  sendMessageToTab,
  executeFunction,
} from './chromeService.js'

const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i

/**
 * Lấy nội dung text từ body của trang web.
 * Thử lấy innerText trước, nếu không đủ dài thì fallback về textContent.
 * @returns {string | null} Nội dung text hoặc null nếu không lấy được.
 */
function getWebpageText() {
  // Hàm này sẽ được thực thi trong context của trang web bởi executeFunction
  const minLength = 50 // Độ dài tối thiểu để coi là nội dung hợp lệ
  let content = document.body?.innerText?.trim()

  if (content && content.length >= minLength) {
    return content
  }

  // Fallback to textContent if innerText is too short or unavailable
  console.log('innerText không đủ dài hoặc không có, thử textContent...')
  content = document.body?.textContent?.trim()

  if (content && content.length >= minLength) {
    return content
  }

  console.warn('Không thể lấy đủ nội dung text từ trang web.')
  return null
}

/**
 * Lấy nội dung từ tab hiện tại.
 * Tự động xác định là trang YouTube hay trang web thường.
 * @param {'transcript' | 'timestampedTranscript' | 'webpage'} contentType Loại nội dung cần lấy.
 *        'transcript': Chỉ lấy text transcript từ YouTube.
 *        'timestampedTranscript': Lấy transcript kèm timestamp từ YouTube.
 *        'webpage': Lấy text từ trang web bất kỳ (sẽ tự động áp dụng nếu không phải YouTube).
 * @param {string} [preferredLang='en'] Ngôn ngữ ưu tiên cho transcript YouTube.
 * @returns {Promise<{ type: 'youtube' | 'webpage' | 'error', content: string | null, error?: string }>}
 *          Object chứa loại trang, nội dung và lỗi (nếu có).
 */
export async function getPageContent(
  contentType = 'webpage',
  preferredLang = 'en'
) {
  const tab = await getActiveTabInfo()
  if (!tab || !tab.id || !tab.url) {
    return {
      type: 'error',
      content: null,
      error: 'Không thể lấy thông tin tab hiện tại.',
    }
  }

  const isYouTubeVideo = YOUTUBE_MATCH_PATTERN.test(tab.url)

  if (isYouTubeVideo && contentType !== 'webpage') {
    // Xử lý YouTube
    const action =
      contentType === 'timestampedTranscript'
        ? 'fetchTranscriptWithTimestamp'
        : 'fetchTranscript'
    try {
      console.log(
        `[contentService] Gửi yêu cầu ${action} đến tab ${tab.id} với ngôn ngữ ${preferredLang}`
      )
      const response = await sendMessageToTab(tab.id, {
        action: action,
        lang: preferredLang,
      })

      if (response && response.success && response.transcript) {
        console.log(
          `[contentService] Nhận được transcript (${action}) thành công.`
        )
        return {
          type: 'youtube',
          content: response.transcript,
        }
      } else {
        console.error(
          `[contentService] Lỗi từ content script (${action}):`,
          response?.error
        )
        return {
          type: 'error',
          content: null,
          error:
            response?.error ||
            `Không thể lấy ${contentType} từ content script.`,
        }
      }
    } catch (error) {
      console.error(`[contentService] Lỗi khi gửi message (${action}):`, error)
      return {
        type: 'error',
        content: null,
        error: `Lỗi giao tiếp với content script: ${error.message}`,
      }
    }
  } else {
    // Xử lý trang web thường (hoặc YouTube nhưng yêu cầu là 'webpage')
    console.log('[contentService] Lấy nội dung text từ trang web...')
    try {
      const pageText = await executeFunction(tab.id, getWebpageText)
      if (pageText) {
        console.log('[contentService] Lấy nội dung trang web thành công.')
        return { type: 'webpage', content: pageText }
      } else {
        return {
          type: 'error',
          content: null,
          error: 'Không thể lấy đủ nội dung text từ trang web.',
        }
      }
    } catch (error) {
      console.error('[contentService] Lỗi khi thực thi script lấy text:', error)
      return {
        type: 'error',
        content: null,
        error: `Lỗi khi lấy nội dung trang web: ${error.message}`,
      }
    }
  }
}

console.log('contentService.js loaded')
