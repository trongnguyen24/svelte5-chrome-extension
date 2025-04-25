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

  // Thêm các biến cho theme
  let systemThemeMediaQuery
  let systemThemeListener

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
          'Cannot access Chrome API. Ensure you are running in an extension environment.'
        )
      }

      // 1. Get the active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (!tab || !tab.id || !tab.url) {
        throw new Error('Could not find the active tab or its URL.')
      }

      // Check if it's a YouTube video page
      isYouTubeVideo = tab.url.includes('youtube.com/watch')

      if (isYouTubeVideo) {
        // 2a. It's a YouTube video -> Get transcript from content script
        console.log('YouTube video detected. Checking for content script...')
        try {
          // Attempt to ping the content script to see if it's loaded
          // Use a specific action that the content script listens for to confirm its presence
          await chrome.tabs.sendMessage(tab.id, { action: 'pingYouTubeScript' })
          console.log('Content script already loaded.')
        } catch (pingError) {
          // If ping fails, assume content script is not injected or not responding
          if (
            pingError.message.includes('Could not establish connection') ||
            pingError.message.includes('Receiving end does not exist')
          ) {
            console.log('Content script not found. Injecting...')
            try {
              // Ensure the file path matches the one declared in manifest.json's web_accessible_resources
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['assets/youtubetranscript.js'], // Updated path
              })
              console.log('Content script injected successfully.')
              // Add a small delay to allow the script to load and initialize
              await new Promise((resolve) => setTimeout(resolve, 200)) // Wait 200ms
            } catch (injectionError) {
              console.error('Failed to inject content script:', injectionError)
              throw new Error(
                `Failed to inject the script into the YouTube page. Please try reloading the page and the extension. Details: ${injectionError.message}`
              )
            }
          } else {
            // Re-throw other errors encountered during ping
            console.error('Error pinging content script:', pingError)
            // It's possible the page is still loading or the script is temporarily unresponsive
            throw new Error(
              `Could not communicate with the YouTube page's script. It might be loading or unresponsive. Details: ${pingError.message}`
            )
          }
        }

        // Now, try to fetch the transcript
        console.log('Requesting transcript...')
        try {
          const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'fetchTranscript',
            lang: 'en', // Hoặc lấy từ cài đặt nếu có
          })

          const response2 = await chrome.tabs.sendMessage(tab.id, {
            action: 'fetchTranscriptWithTimestamp',
          })

          console.log('Response from content script:', response)
          console.log('Response from content script:', response2)
          if (response && response.success && response.transcript) {
            pageContent = response.transcript
            console.log(
              'Transcript received:',
              pageContent.substring(0, 100) + '...'
            )
          } else {
            // Handle cases where the script runs but can't find the transcript or errors internally
            throw new Error(
              response?.error ||
                'Could not retrieve transcript from YouTube video. The content script might not have found the transcript panel or encountered an issue.'
            )
          }
        } catch (err) {
          console.error(
            'Error sending/receiving transcript request message:',
            err
          )
          // Provide a more specific error if connection failed after injection attempt
          if (
            err.message.includes('Could not establish connection') ||
            err.message.includes('Receiving end does not exist')
          ) {
            throw new Error(
              'Could not connect to the YouTube page to get the transcript, even after attempting to load the necessary script. Please try reloading the YouTube page and the extension.'
            )
          } else {
            throw err // Re-throw other errors, potentially from the content script itself
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
            throw new Error(
              'Could not retrieve text content from the web page.'
            )
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
            ? 'Video has no transcript or transcript could not be retrieved.'
            : 'The web page has no text content to summarize.'
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
      error = e.message || 'An unexpected error occurred.'
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

  function updateTheme(isDark) {
    if (isDark) {
      document.documentElement.classList.add('dark')
      document.documentElement.style.colorScheme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
    }
  }

  function setupSystemThemeListener() {
    // Đảm bảo listener không bị thêm nhiều lần
    if (systemThemeMediaQuery) {
      systemThemeMediaQuery.removeEventListener('change', systemThemeListener)
    }

    systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    // Listener mới: chỉ áp dụng theme hệ thống nếu không có lựa chọn cụ thể trong localStorage
    systemThemeListener = (e) => {
      const currentStoredTheme = localStorage.getItem('theme')
      // Chỉ áp dụng thay đổi theme hệ thống nếu người dùng không chọn light/dark cụ thể
      if (!currentStoredTheme) {
        // Không có 'theme' trong localStorage nghĩa là 'system' đang hoạt động
        updateTheme(e.matches) // updateTheme thêm/xóa class 'dark'
      }
    }

    // Đăng ký listener
    systemThemeMediaQuery.addEventListener('change', systemThemeListener)

    // Kiểm tra và áp dụng theme ban đầu khi thiết lập listener
    const currentStoredTheme = localStorage.getItem('theme')
    if (!currentStoredTheme) {
      // Không có lựa chọn -> dùng theme hệ thống
      updateTheme(systemThemeMediaQuery.matches)
    } else if (currentStoredTheme === 'dark') {
      // Lựa chọn là dark
      updateTheme(true)
    } else {
      // Lựa chọn là light
      updateTheme(false)
    }
  }

  onMount(() => {
    // Initialize OverlayScrollbars on the body element
    initialize(document.body)
    setupSystemThemeListener() // Gọi hàm thiết lập listener (hàm này giờ cũng áp dụng theme ban đầu)
  })

  onDestroy(() => {
    // Destroy the instance when the component is unmounted
    instance()?.destroy()
    // Dọn dẹp listener
    if (systemThemeMediaQuery && systemThemeListener) {
      systemThemeMediaQuery.removeEventListener('change', systemThemeListener)
    }
  })
</script>

<div class="bg-background min-h-screen xs:px-8 xs:pb-32 pt-40">
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
          class="absolute z-10 inset-px text-primary bg-surface-1 group-hover:brightness-110 group-hover:shadow-lg group-hover:shadow-primary/30 group-hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center rounded-full disabled:cursor-progress"
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
      <div class="text-center">Processing...</div>
    {/if}

    <!-- Error Message -->
    {#if error}
      <div class="flex gap-2 w-fit mx-auto text-red-400 mt-4">
        <Icon
          class="mt-0.5"
          width={16}
          icon="heroicons:exclamation-circle-16-solid"
        />
        <p class="text-sm">
          <span class="font-bold">Error:</span> <br />
          {error}
        </p>
      </div>
    {/if}

    <!-- Summary Result -->
    {#if summary}
      <div
        class="p-4 xs:p-8 pb-24 relative z-20 prose w-full max-w-2xl bg-surface-1 border border-border/25 border-t-white dark:border-t-neutral-600 xs:shadow-lg xs:rounded-xl"
      >
        <div
          class="flex w-fit gap-2 border border-border p-0.5 bg-background rounded-full mb-4"
        >
          <button class="text-text-primary px-4 py-1"> Summarize </button>
          <button class="text-text-primary px-4 py-1 bg-surface-2 rounded-full">
            Chapters
          </button>
        </div>
        <div class="prose-sm sm:prose-base">{@html summary}</div>
      </div>
    {/if}
  </div>
  <div
    class=" fixed bg-linear-to-t from-background to-background/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-30"
  ></div>
  <div class="fixed z-50 top-0 right-0"></div>
</div>
