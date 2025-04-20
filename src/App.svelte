<script>
  import Setting from './components/Setting.svelte'
  import { marked } from 'marked' // Import marked để render Markdown
  import { getApiKey, summarizeWithGemini } from './lib/api.js' // Import từ api.js

  let textToSummarize = $state('')
  let summary = $state('')
  let isLoading = $state(false)
  let error = $state('')

  // --- Main Handler ---
  async function handleSummarizeText() {
    error = ''
    summary = ''
    isLoading = true
    let pageContent = '' // Variable to store content from the tab

    try {
      // Check if running in Chrome extension context
      if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
        throw new Error(
          'Không thể truy cập API của Chrome. Đảm bảo bạn đang chạy trong môi trường extension.'
        )
      }

      // 1. Get the active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (!tab || !tab.id) {
        throw new Error('Không tìm thấy tab đang hoạt động.')
      }

      // 2. Execute script to get body text
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText, // Function to extract text
      })

      // Check if script execution was successful and returned a result
      if (!results || results.length === 0 || !results[0].result) {
        // Try getting text content as a fallback
        const fallbackResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.body.textContent,
        })
        if (
          !fallbackResults ||
          fallbackResults.length === 0 ||
          !fallbackResults[0].result
        ) {
          throw new Error('Không thể lấy nội dung văn bản từ trang web.')
        }
        pageContent = fallbackResults[0].result
      } else {
        pageContent = results[0].result
      }

      if (!pageContent || pageContent.trim() === '') {
        throw new Error('Trang web không có nội dung văn bản để tóm tắt.')
      }

      // 3. Get API key and summarize
      const apiKey = await getApiKey()
      const summarizedText = await summarizeWithGemini(pageContent, apiKey)
      summary = marked.parse(summarizedText) // Parse Markdown result
    } catch (e) {
      console.error('Summarization error:', e)
      error = e.message || 'Đã xảy ra lỗi không mong muốn.'
    } finally {
      isLoading = false
    }
  }
</script>

<div class="h-screen flex bg-background p-4">
  <!-- Main Content -->
  <div class="flex-grow flex flex-col items-center p-4">
    <h1 class="mb-4 text-text-primary text-xl">SuperSummary</h1>

    <div class="text-center mb-4">
      <button
        onclick={handleSummarizeText}
        class=" bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
        disabled={isLoading}
      >
        {isLoading ? 'Đang tóm tắt...' : 'Tóm tắt trang này'}
      </button>
    </div>

    <!-- Loading Indicator -->
    {#if isLoading}
      <div class="text-center">Đang xử lý...</div>
    {/if}

    <!-- Error Message -->
    {#if error}
      <div class="text-center text-red-500 mt-4">Lỗi: {error}</div>
    {/if}

    <!-- Summary Result -->
    {#if summary}
      <div class="mt-4 p-4 prose dark:prose-invert w-full bg-surface-1 border-border rounded-lg">
        <h2 class=" text-lg font-semibold mb-2">Kết quả tóm tắt:</h2>
        {@html summary}
        dasdad
      </div>
    {/if}

    <div class="mt-4 p-4 prose dark:prose-invert w-full bg-surface-1 border border-border/25 border-t-border shadow-lg rounded-lg">
      <h2 class=" text-lg font-semibold mb-2">Kết quả tóm tắt:</h2>
      {@html summary}
      dasdad
    </div>
  </div>

  <!-- Settings Sidebar -->
  <Setting />
</div>
