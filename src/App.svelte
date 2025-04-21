<script>
  import Setting from './components/Setting.svelte'
  import Settingbar from './components/Settingbar.svelte'
  import Icon from '@iconify/svelte'
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

<div class="bg-background xs:px-8 xs:pb-32">
  <!-- Main Content -->
  <div class="flex-grow max-w-2xl mx-auto flex flex-col">
    <div class="p-4 xs:px-0 flex items-center justify-between">
      <div class="flex relative size-12 rounded-full">
        <span class="absolute inset-0 z-0 animate-spin-slow-2">
          <span
            class="absolute inset-0 bg-primary rounded-full bg-conic from-border to-primary animate-spin-slow"
          ></span>
          <span
            class="absolute inset-0 bg-primary rounded-full bg-conic from-transparent from-80% to-amber-400 animate-spin-slow blur-[2px]"
          ></span>
        </span>
        <button
          onclick={handleSummarizeText}
          class="absolute z-10 inset-px text-primary bg-surface-1 flex items-center justify-center rounded-full disabled:opacity-100"
          disabled={isLoading}
        >
          {#if isLoading}
            <Icon
              width={24}
              icon="mingcute:loading-3-fill"
              class="animate-spin"
            />
          {:else}
            <Icon
              class="translate-x-0.5"
              width={24}
              icon="heroicons:play-solid"
            />
          {/if}
        </button>
      </div>
      <div class="flex"><Settingbar /></div>
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
      <div
        class="p-4 xs:p-8 pb-24 prose dark:prose-invert w-full max-w-2xl bg-surface-1 border border-border/25 border-t-border xs:shadow-lg xs:rounded-xl"
      >
        {@html summary}
      </div>
    {/if}
  </div>
  <div
    class=" fixed bg-linear-to-t from-background to-background/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-10"
  ></div>
  <!-- Settings Sidebar -->
</div>
