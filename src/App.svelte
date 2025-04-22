<script>
  import Settingbar from './components/Settingbar.svelte'
  import Icon from '@iconify/svelte'
  import { marked } from 'marked' // Import marked để render Markdown
  import { getApiKey, summarizeWithGemini } from './lib/api.js' // Import từ api.js
  import 'overlayscrollbars/overlayscrollbars.css' // Import CSS overlayscrollbars
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte' // Import primitive
  import { onMount, onDestroy } from 'svelte' // Import lifecycle functions
  import { slideScaleFade } from './lib/slideScaleFade.js'

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
    let isYouTubeVideo = false

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
      if (!tab || !tab.id || !tab.url) {
        throw new Error('Không tìm thấy tab đang hoạt động hoặc URL của tab.')
      }

      // Check if it's a YouTube video page
      isYouTubeVideo = tab.url.includes('youtube.com/watch')

      if (isYouTubeVideo) {
        // 2a. It's a YouTube video -> Get transcript from content script
        console.log('YouTube video detected. Requesting transcript...')
        try {
          const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'fetchTranscript',
            lang: 'en', // Hoặc lấy từ cài đặt nếu có
          })

          console.log('Response from content script:', response)

          if (response && response.success && response.transcript) {
            pageContent = response.transcript
            console.log(
              'Transcript received:',
              pageContent.substring(0, 100) + '...'
            )
          } else {
            throw new Error(
              response?.error || 'Không thể lấy transcript từ video YouTube.'
            )
          }
        } catch (err) {
          console.error(
            'Error sending/receiving message to content script:',
            err
          )
          // Kiểm tra xem lỗi có phải do content script không tồn tại/không phản hồi không
          if (
            err.message.includes('Could not establish connection') ||
            err.message.includes('Receiving end does not exist')
          ) {
            throw new Error(
              'Không thể kết nối với trang YouTube để lấy transcript. Hãy thử tải lại trang YouTube và tiện ích.'
            )
          } else {
            throw err // Ném lại lỗi gốc nếu không phải lỗi kết nối
          }
        }
      } else {
        // 2b. Not a YouTube video -> Execute script to get body text
        console.log('Not a YouTube video. Getting page content...')
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.body.innerText, // Function to extract text
        })

        // Check if script execution was successful and returned a result
        if (!results || results.length === 0 || !results[0].result) {
          // Try getting text content as a fallback
          console.log('innerText failed, trying textContent...')
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
          console.log('textContent successful.')
        } else {
          pageContent = results[0].result
          console.log('innerText successful.')
        }
      }

      if (!pageContent || pageContent.trim() === '') {
        throw new Error(
          isYouTubeVideo
            ? 'Video không có transcript hoặc không thể lấy transcript.'
            : 'Trang web không có nội dung văn bản để tóm tắt.'
        )
      }

      // 3. Get API key and summarize
      console.log('Getting API key and summarizing...')
      const apiKey = await getApiKey()
      const summarizedText = await summarizeWithGemini(
        pageContent,
        apiKey,
        isYouTubeVideo
      )
      summary = marked.parse(summarizedText) // Parse Markdown result
    } catch (e) {
      console.error('Summarization error:', e)
      error = e.message || 'Đã xảy ra lỗi không mong muốn.'
    } finally {
      isLoading = false
    }
  }

  // --- OverlayScrollbars Primitive Usage ---
  const options = {
    scrollbars: {
      autoHide: 'scroll',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  onMount(() => {
    // Initialize OverlayScrollbars on the body element
    initialize(document.body)
  })

  onDestroy(() => {
    // Destroy the instance when the component is unmounted
    instance()?.destroy()
  })
</script>

<div class="bg-background xs:px-8 xs:pb-32 pt-40">
  <!-- Main Content -->
  <div class="max-w-2xl mx-auto flex flex-col">
    <div
      class="px-4 py-16 fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl z-0 xs:px-8 flex items-center justify-between header-animation"
    >
      <div class="flex group relative size-12 rounded-full">
        <span
          class="absolute group-hover:-translate-y-0.5 transition-all duration-300 inset-0 z-0 animate-spin-slow-2"
        >
          <span
            class="absolute inset-0 rounded-full bg-conic from-border to-primary group-hover:brightness-150 transition-all duration-300 animate-spin-slow"
          ></span>
          <span
            class="absolute inset-0 rounded-full bg-conic from-transparent from-80% to-amber-400 group-hover:to-amber-50 transition-all duration-150 animate-spin-slow blur-[2px]"
          ></span>
        </span>
        <button
          onclick={handleSummarizeText}
          class="absolute z-10 inset-px text-primary bg-surface-1 group-hover:brightness-110 group-hover:shadow-md group-hover:shadow-primary/50 group-hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center rounded-full disabled:cursor-progress"
          disabled={isLoading}
        >
          <div class="relative size-6">
            {#if isLoading}
              <span transition:slideScaleFade>
                <Icon
                  width={24}
                  icon="svg-spinners:bouncing-ball"
                  class="absolute inset-0"
                />
              </span>
            {:else}
              <span transition:slideScaleFade>
                <Icon
                  class="translate-x-0.5 absolute inset-0"
                  width={24}
                  icon="heroicons:play-solid"
                />
              </span>
            {/if}
          </div>
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
        class="p-4 xs:p-8 pb-24 relative z-20 prose dark:prose-invert w-full max-w-2xl bg-surface-1 border border-border/25 border-t-border xs:shadow-lg xs:rounded-xl"
      >
        {@html summary}
      </div>
    {/if}
  </div>
  <div
    class=" fixed bg-linear-to-t from-background to-background/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-30"
  ></div>
  <div class="fixed z-50 top-0 right-0"></div>
</div>
