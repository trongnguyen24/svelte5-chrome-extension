// @svelte-compiler-ignore
// @svelte-compiler-ignore
import { marked } from 'marked'
import { getPageContent } from '../services/contentService.js'
import { settingsStore } from './settingsStore.svelte.js' // Import the settingsStore object
import { summarizeWithGemini, summarizeChaptersWithGemini } from '../lib/api.js' // Assuming api.js is updated or compatible

// Access state from the imported object
const { settings: appSettings, isInitialized: settingsInitialized } =
  settingsStore

// --- State ---
let summary = $state('')
let chapterSummary = $state('')
let isLoading = $state(false) // Loading state for the main summary
let isChapterLoading = $state(false) // Loading state for chapters
let error = $state('') // Error for the main summary
let chapterError = $state('') // Error for chapters
let isYouTubeVideoActive = $state(false) // Is the current tab a YouTube video?
let currentContentSource = $state('') // Store the source text for potential re-summarization

// --- Actions ---

/**
 * Reset all summary-related states.
 */
function resetState() {
  summary = ''
  chapterSummary = ''
  isLoading = false
  isChapterLoading = false
  error = ''
  chapterError = ''
  isYouTubeVideoActive = false
  currentContentSource = ''
}

/**
 * Fetches content from the current tab and triggers the summarization process.
 */
export async function fetchAndSummarize() {
  if (isLoading || isChapterLoading) {
    console.warn('[summaryStore] Summarization already in progress.')
    return
  }

  // Wait for settings to be initialized
  if (!settingsStore.isInitialized) {
    console.log('[summaryStore] Chờ cài đặt được tải...')
    // Simple polling mechanism - can be improved with a Promise/event if needed
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (settingsStore.isInitialized) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100) // Check every 100ms
    })
    console.log('[summaryStore] Cài đặt đã sẵn sàng.')
  }

  // Now settings are guaranteed to be initialized
  const { settings: appSettings } = settingsStore // Destructure settings after initialization check

  resetState() // Reset state before starting
  isLoading = true // Start main loading

  try {
    // 1. Get API Key first
    const apiKey = appSettings.geminiApiKey // Use state from settingsStore
    if (!apiKey) {
      throw new Error('Chưa cấu hình API Key trong cài đặt.')
    }

    // 2. Get Page Content (determine if YouTube)
    // For the main summary, we always need the basic transcript or webpage text
    const mainContentResult = await getPageContent(
      'transcript',
      appSettings.summaryLang
    ) // Request transcript for YT, will fallback to webpage text

    if (mainContentResult.type === 'error' || !mainContentResult.content) {
      throw new Error(
        mainContentResult.error || 'Không thể lấy nội dung trang.'
      )
    }

    isYouTubeVideoActive = mainContentResult.type === 'youtube'
    currentContentSource = mainContentResult.content // Store the fetched content

    // --- Start Chapter Summarization in Parallel (if YouTube) ---
    if (isYouTubeVideoActive) {
      isChapterLoading = true // Start chapter loading
      // Use IIAFE for parallel execution without awaiting here
      ;(async () => {
        chapterError = '' // Reset chapter error specifically
        try {
          // Fetch timestamped transcript specifically for chapters
          const chapterContentResult = await getPageContent(
            'timestampedTranscript',
            appSettings.summaryLang
          )
          if (
            chapterContentResult.type === 'error' ||
            !chapterContentResult.content
          ) {
            throw new Error(
              chapterContentResult.error ||
                'Không thể lấy transcript có timestamp.'
            )
          }

          const chapterSummarizedText = await summarizeChaptersWithGemini(
            chapterContentResult.content,
            apiKey,
            appSettings.summaryLang,
            appSettings.summaryLength
          )

          if (!chapterSummarizedText || chapterSummarizedText.trim() === '') {
            console.warn(
              '[summaryStore] Gemini trả về kết quả rỗng cho tóm tắt chapter.'
            )
            chapterSummary =
              '<p><i>Không thể tạo tóm tắt chapter từ nội dung này.</i></p>'
          } else {
            chapterSummary = marked.parse(chapterSummarizedText)
          }
          console.log('[summaryStore] Đã xử lý tóm tắt chapter.')
        } catch (e) {
          console.error('[summaryStore] Lỗi tóm tắt chapter:', e)
          chapterError = e.message || 'Lỗi không mong muốn khi tóm tắt chapter.'
        } finally {
          isChapterLoading = false // End chapter loading regardless of outcome
        }
      })()
    }

    // --- Continue Main Summarization (Awaited) ---
    console.log('[summaryStore] Bắt đầu tóm tắt chính...')
    const summarizedText = await summarizeWithGemini(
      currentContentSource, // Use the stored content
      apiKey,
      isYouTubeVideoActive, // Pass boolean flag
      appSettings.summaryLang, // Pass language
      appSettings.summaryLength, // Pass length
      appSettings.summaryFormat // Pass format
    )

    if (!summarizedText || summarizedText.trim() === '') {
      console.warn(
        '[summaryStore] Gemini trả về kết quả rỗng cho tóm tắt chính.'
      )
      summary = '<p><i>Không thể tạo tóm tắt từ nội dung này.</i></p>'
    } else {
      summary = marked.parse(summarizedText)
    }
    console.log('[summaryStore] Đã xử lý tóm tắt chính.')
  } catch (e) {
    console.error('[summaryStore] Lỗi trong quá trình tóm tắt chính:', e)
    error = e.message || 'Đã xảy ra lỗi không mong muốn.'
    // Ensure chapter loading stops if main process fails early
    if (isChapterLoading && !chapterError) {
      // isChapterLoading = false; // Let the parallel process handle its own loading state
    }
  } finally {
    isLoading = false // End main loading
  }
}

// --- Exported State ---
// Export an object containing the state variables and actions
export const summaryStore = {
  get summary() {
    return summary
  },
  get chapterSummary() {
    return chapterSummary
  },
  get isLoading() {
    return isLoading
  },
  get isChapterLoading() {
    return isChapterLoading
  },
  get error() {
    return error
  },
  get chapterError() {
    return chapterError
  },
  get isYouTubeVideoActive() {
    return isYouTubeVideoActive
  },
  get currentContentSource() {
    return currentContentSource
  },
  fetchAndSummarize, // Also export the action
}

console.log('summaryStore.svelte.js loaded')
