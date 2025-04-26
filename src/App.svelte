<script>
  import Settingbar from './components/Settingbar.svelte'
  import Icon from '@iconify/svelte'
  import { marked } from 'marked' // Import marked để render Markdown
  import {
    getApiKey,
    summarizeWithGemini,
    summarizeChaptersWithGemini,
  } from './lib/api.js' // Import từ api.js
  import 'overlayscrollbars/overlayscrollbars.css' // Import CSS overlayscrollbars
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte' // Import primitive
  import { onMount, onDestroy } from 'svelte' // Import lifecycle functions
  import { slideScaleFade } from './lib/slideScaleFade.js'

  let textToSummarize = $state('')
  let summary = $state('')
  let isLoading = $state(false)
  let error = $state('')

  // State cho tóm tắt chapter
  let chapterSummary = $state('')
  let isChapterLoading = $state(false)
  let chapterError = $state('')

  // --- State cho Tabs ---
  let activeTab = $state('summary')
  let isYouTubeVideoActive = $state(false) // Để ẩn/hiện tab Chapters
  // --- End State ---

  // Thêm các biến cho theme
  let systemThemeMediaQuery
  let systemThemeListener

  // --- Refactored Script Injection Logic ---
  async function ensureContentScriptInjected(tabId) {
    try {
      // Ping script với action cụ thể để tránh xung đột
      await chrome.tabs.sendMessage(tabId, { action: 'pingYouTubeScript' })
      console.log('Content script is already loaded.')
      return true // Script đã có
    } catch (pingError) {
      if (
        pingError.message.includes('Could not establish connection') ||
        pingError.message.includes('Receiving end does not exist')
      ) {
        console.log('Content script not found. Injecting...')
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['assets/youtubetranscript.js'],
          })
          console.log('Content script injected successfully.')
          // Chờ một chút để script khởi tạo
          await new Promise((resolve) => setTimeout(resolve, 250)) // Tăng nhẹ thời gian chờ
          return true // Inject thành công
        } catch (injectionError) {
          console.error('Failed to inject content script:', injectionError)
          throw new Error(
            `Không thể tiêm script vào trang YouTube. Lỗi: ${injectionError.message}`
          )
        }
      } else {
        // Lỗi khác khi ping (vd: script bị lỗi, trang đang unload...)
        console.error('Error pinging content script:', pingError)
        throw new Error(
          `Không thể kết nối với script trên trang YouTube. Lỗi: ${pingError.message}`
        )
      }
    }
  }

  // --- Main Handler (Modified for Parallel Execution) ---
  async function handleSummarizeText() {
    // Reset tất cả state trước khi bắt đầu
    error = ''
    summary = ''
    isLoading = true // Bắt đầu loading cho tóm tắt chính
    chapterError = ''
    chapterSummary = ''
    isChapterLoading = false // Sẽ set true khi tiến trình chapter bắt đầu
    activeTab = 'summary' // Luôn quay về tab summary khi bắt đầu
    isYouTubeVideoActive = false // Reset trạng thái YT

    let pageContent = ''
    let isYouTubeVideo = false
    let activeTabId = null // Lưu tab ID

    try {
      // 1. Lấy tab hiện tại (chung cho cả 2 quy trình)
      if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
        throw new Error(
          'Không thể truy cập Chrome API. Đảm bảo đang chạy trong môi trường extension.'
        )
      }
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (!tab || !tab.id || !tab.url) {
        throw new Error('Không thể tìm thấy tab hiện tại hoặc URL của nó.')
      }
      activeTabId = tab.id // Lưu ID để dùng sau
      isYouTubeVideo = tab.url.includes('youtube.com/watch')
      isYouTubeVideoActive = isYouTubeVideo // Cập nhật state để template sử dụng

      // --- Bắt đầu Quy trình Tóm tắt Chapter (KHÔNG await) ---
      if (isYouTubeVideo) {
        // Dùng IIAFE (Immediately Invoked Async Function Expression) để chạy ngầm
        ;(async () => {
          chapterError = '' // Reset lỗi chapter
          isChapterLoading = true // Bật loading chapter
          let timestampedTranscript = ''
          try {
            console.log('[Chapter] Đảm bảo content script đã được tiêm...')
            const scriptReady = await ensureContentScriptInjected(activeTabId)
            if (!scriptReady) {
              throw new Error('[Chapter] Không thể chuẩn bị script.')
            }

            console.log('[Chapter] Yêu cầu transcript có timestamp...')
            const responseTs = await chrome.tabs.sendMessage(activeTabId, {
              action: 'fetchTranscriptWithTimestamp',
            })
            console.log('[Chapter] Phản hồi timestamp:', responseTs)

            if (responseTs && responseTs.success && responseTs.transcript) {
              timestampedTranscript = responseTs.transcript
              console.log(
                '[Chapter] Đã nhận transcript có timestamp:',
                timestampedTranscript.substring(0, 100) + '...'
              )

              console.log('[Chapter] Lấy API key và tóm tắt chapters...')
              const apiKey = await getApiKey() // Lấy key lại hoặc dùng key đã lấy trước đó
              if (!apiKey) throw new Error('Chưa cấu hình API Key.')

              // Lấy cài đặt ngôn ngữ và độ dài cho chapters
              const { lang: chapterLang, length: chapterLength } =
                await new Promise((resolve) => {
                  chrome.storage.sync.get(
                    ['summaryLang', 'summaryLength'],
                    (result) => {
                      resolve({
                        lang: result.summaryLang || 'vi', // Mặc định 'vi' nếu không có
                        length: result.summaryLength || 'medium', // Mặc định 'medium' nếu không có
                      })
                    }
                  )
                })

              const chapterSummarizedText = await summarizeChaptersWithGemini(
                timestampedTranscript,
                apiKey,
                chapterLang, // Truyền ngôn ngữ
                chapterLength // Truyền độ dài
              )
              // Kiểm tra nếu kết quả trả về là chuỗi rỗng hoặc chỉ có khoảng trắng
              if (
                !chapterSummarizedText ||
                chapterSummarizedText.trim() === ''
              ) {
                console.warn(
                  '[Chapter] Gemini trả về kết quả rỗng cho tóm tắt chapter.'
                )
                chapterSummary =
                  '<p><i>Không thể tạo tóm tắt chapter từ nội dung này.</i></p>' // Thông báo nhẹ nhàng
              } else {
                chapterSummary = marked.parse(chapterSummarizedText) // Parse kết quả Markdown
              }
              console.log('[Chapter] Đã nhận và xử lý tóm tắt chapter.')
            } else {
              throw new Error(
                responseTs?.error ||
                  '[Chapter] Không thể lấy transcript có timestamp từ content script.'
              )
            }
          } catch (e) {
            console.error('[Chapter] Lỗi tóm tắt chapter:', e)
            chapterError =
              e.message || 'Đã xảy ra lỗi không mong muốn khi tóm tắt chapter.'
          } finally {
            isChapterLoading = false // Tắt loading chapter dù thành công hay thất bại
          }
        })() // Gọi ngay hàm async này
      } else {
        // Không phải video YouTube, không cần chạy tóm tắt chapter
        chapterSummary = '' // Đảm bảo trống
        chapterError = ''
        isChapterLoading = false
      }

      // --- Tiếp tục Quy trình Tóm tắt Chính (CÓ await) ---
      console.log('[Main] Bắt đầu lấy nội dung chính...')
      if (isYouTubeVideo) {
        console.log('[Main] Đảm bảo content script đã được tiêm...')
        // Gọi lại ensureContentScriptInjected vì quy trình chapter có thể chưa hoàn thành việc inject
        // Hoặc đã inject nhưng cần đảm bảo nó sẵn sàng cho lần gọi thứ 2
        const scriptReady = await ensureContentScriptInjected(activeTabId)
        if (!scriptReady) throw new Error('[Main] Không thể chuẩn bị script.')

        console.log('[Main] Yêu cầu transcript chính...')
        const response = await chrome.tabs.sendMessage(activeTabId, {
          action: 'fetchTranscript',
          lang: 'en', // Hoặc ngôn ngữ khác
        })
        console.log('[Main] Phản hồi transcript chính:', response)
        if (response && response.success && response.transcript) {
          pageContent = response.transcript
          console.log(
            '[Main] Đã nhận transcript chính:',
            pageContent.substring(0, 100) + '...'
          )
        } else {
          throw new Error(
            response?.error ||
              '[Main] Không thể lấy transcript chính từ content script.'
          )
        }
      } else {
        // Không phải YouTube, lấy nội dung trang web
        console.log('[Main] Lấy nội dung trang web...')
        let results
        try {
          results = await chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            func: () => document.body.innerText,
          })
        } catch (scriptError) {
          console.warn('[Main] Lỗi khi lấy innerText:', scriptError)
          results = null // Đánh dấu là lỗi để thử fallback
        }

        if (
          results &&
          results[0] &&
          results[0].result &&
          results[0].result.trim().length > 10
        ) {
          // Thêm kiểm tra độ dài và trim
          pageContent = results[0].result.trim()
        } else {
          // Fallback nếu innerText rỗng, lỗi hoặc quá ngắn
          console.log(
            '[Main] innerText thất bại hoặc quá ngắn, thử textContent...'
          )
          let fallbackResults
          try {
            fallbackResults = await chrome.scripting.executeScript({
              target: { tabId: activeTabId },
              func: () => document.body.textContent,
            })
          } catch (scriptError) {
            console.warn('[Main] Lỗi khi lấy textContent:', scriptError)
            fallbackResults = null
          }

          if (
            fallbackResults &&
            fallbackResults[0] &&
            fallbackResults[0].result &&
            fallbackResults[0].result.trim().length > 10
          ) {
            pageContent = fallbackResults[0].result.trim()
          } else {
            throw new Error(
              '[Main] Không thể lấy nội dung text đủ dài từ trang web.'
            )
          }
        }
        console.log('[Main] Đã lấy nội dung trang web.')
      }

      // Kiểm tra lại pageContent trước khi gọi API chính
      if (!pageContent || pageContent.trim().length < 50) {
        // Thêm kiểm tra độ dài tối thiểu
        throw new Error(
          isYouTubeVideo
            ? '[Main] Transcript không có nội dung hoặc quá ngắn để tóm tắt.'
            : '[Main] Trang web không có đủ nội dung text để tóm tắt.'
        )
      }

      console.log('[Main] Lấy API key và tóm tắt chính...')
      const apiKey = await getApiKey() // Lấy key lại hoặc dùng key đã lấy trước đó
      if (!apiKey) throw new Error('Chưa cấu hình API Key.')

      const summarizedText = await summarizeWithGemini(
        pageContent,
        apiKey,
        isYouTubeVideo
      )
      summary = marked.parse(summarizedText) // Parse Markdown
      console.log('[Main] Đã nhận và xử lý tóm tắt chính.')
    } catch (e) {
      // Bắt lỗi của quy trình chính
      console.error('[Main] Lỗi tóm tắt chính:', e)
      error = e.message || 'Đã xảy ra lỗi không mong muốn.'
      // Không cần reset chapter state ở đây vì nó chạy độc lập
    } finally {
      // Kết thúc loading cho quy trình chính
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
      class="px-4 py-16 fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl z-10 xs:px-8 flex items-center justify-between header-animation"
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
          disabled={isLoading || isChapterLoading}
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

    <div
      class="relative z-10 flex flex-col gap-6 pt-4"
      class:mt-[-4rem]={!summary &&
        !error &&
        !chapterSummary &&
        !chapterError &&
        !isLoading &&
        !isChapterLoading}
    >
      {#if isLoading || isChapterLoading || summary || chapterSummary || error || chapterError}
        <div
          class="px-4 xs:px-0 flex justify-center mb-[-1.5rem] relative z-10"
        >
          <div class="flex w-fit gap-2 p-0.5 mb-4 bg-surface-1 rounded-full">
            {#if isYouTubeVideoActive}
              <button
                class="px-4 py-1 rounded-full text-sm transition-colors duration-150"
                class:bg-background={activeTab === 'summary'}
                class:text-text-primary={activeTab === 'summary'}
                class:text-text-secondary={activeTab !== 'summary'}
                class:hover:bg-surface-1={activeTab !== 'summary'}
                onclick={() => (activeTab = 'summary')}
              >
                Tóm tắt
              </button>

              <button
                class="px-4 py-1 rounded-full text-sm transition-colors duration-150"
                class:bg-background={activeTab === 'chapters'}
                class:text-text-primary={activeTab === 'chapters'}
                class:text-text-secondary={activeTab !== 'chapters'}
                class:hover:bg-surface-1={activeTab !== 'chapters'}
                onclick={() => (activeTab = 'chapters')}
                disabled={!chapterSummary && !isChapterLoading && !chapterError}
                title={!chapterSummary && !isChapterLoading && !chapterError
                  ? 'Đang chờ xử lý chapter...'
                  : 'Xem tóm tắt theo chapter'}
              >
                Chapters
              </button>
            {/if}
          </div>
        </div>

        <div
          class="p-4 xs:p-8 pb-20 prose w-full max-w-2xl bg-surface-1 border border-border/25 border-t-white dark:border-t-neutral-600 xs:shadow-lg xs:rounded-xl min-h-[10rem]"
        >
          {#if activeTab === 'summary'}
            {#if isLoading}
              <div class="text-center p-4 text-text-secondary animate-pulse">
                Đang xử lý tóm tắt chính...
              </div>
            {/if}
            {#if error}
              <div
                class="flex gap-2 w-fit mx-auto text-red-400 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <Icon
                  class="mt-0.5 flex-shrink-0"
                  width={16}
                  icon="heroicons:exclamation-circle-16-solid"
                />
                <p class="text-sm">
                  <span class="font-bold">Lỗi tóm tắt chính:</span>
                  {error}
                </p>
              </div>
            {/if}
            {#if summary && !isLoading}
              <div class="prose-sm sm:prose-base max-w-none">
                {@html summary}
              </div>
            {:else if !isLoading && !error}
              <!-- Có thể thêm placeholder nếu không có summary và không lỗi -->
              <!-- <p class="text-text-secondary text-center italic">Chưa có tóm tắt.</p> -->
            {/if}
          {:else if activeTab === 'chapters'}
            {#if isChapterLoading}
              <div class="text-center p-4 text-text-secondary animate-pulse">
                Đang tạo tóm tắt theo chapter...
              </div>
            {/if}
            {#if chapterError}
              <div
                class="flex gap-2 w-fit mx-auto text-orange-400 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg"
              >
                <Icon
                  class="mt-0.5 flex-shrink-0"
                  width={16}
                  icon="heroicons:exclamation-triangle-16-solid"
                />
                <p class="text-sm">
                  <span class="font-bold">Lỗi tóm tắt chapter:</span>
                  {chapterError}
                </p>
              </div>
            {/if}
            {#if chapterSummary && !isChapterLoading}
              <div class="prose-sm sm:prose-base max-w-none">
                {@html chapterSummary}
              </div>
            {:else if !isChapterLoading && !chapterError}
              <!-- Có thể thêm placeholder nếu không có chapter summary và không lỗi -->
              <!-- <p class="text-text-secondary text-center italic">Chưa có tóm tắt chapter.</p> -->
            {/if}
          {/if}
        </div>
      {/if}
    </div>
  </div>
  <div
    class="fixed bg-linear-to-t from-background to-background/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-30 pointer-events-none"
  ></div>
  <div class="fixed z-50 top-0 right-0"></div>
</div>
