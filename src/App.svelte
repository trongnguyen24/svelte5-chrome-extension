<script>
  import Setting from './components/Setting.svelte'
  import { marked } from 'marked' // Import marked để render Markdown

  let textToSummarize = $state('')
  let summary = $state('')
  let isLoading = $state(false)
  let error = $state('')

  // --- Helper Functions ---

  async function getApiKey() {
    return new Promise((resolve) => {
      // Check if running in a Chrome extension context
      if (
        typeof chrome !== 'undefined' &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        chrome.storage.sync.get(['geminiApiKey'], (result) => {
          resolve(result.geminiApiKey || '')
        })
      } else {
        // Provide a default or handle the case where chrome.storage is not available
        console.warn(
          'chrome.storage.sync not available. Returning empty API key.'
        )
        resolve('') // Or perhaps load from localStorage or another source?
      }
    })
  }

  async function getSummaryOptions() {
    return new Promise((resolve) => {
      if (
        typeof chrome !== 'undefined' &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        chrome.storage.sync.get(
          ['summaryLength', 'summaryLang', 'summaryFormat'],
          (result) => {
            resolve({
              length: result.summaryLength || 'medium',
              lang: result.summaryLang || 'vi',
              format: result.summaryFormat || 'paragraph',
            })
          }
        )
      } else {
        console.warn(
          'chrome.storage.sync not available. Returning default options.'
        )
        resolve({ length: 'medium', lang: 'vi', format: 'paragraph' })
      }
    })
  }

  function buildPrompt(text, options) {
    const promptTemplate = `Bạn là một AI chuyên gia tóm tắt nội dung trang web một cách chính xác và hiệu quả. Nhiệm vụ của bạn là tóm tắt nội dung được cung cấp, tuân theo các tham số do người dùng chỉ định.

Khi nhận được nội dung, hãy phân tích và tóm tắt nội dung chính dựa trên các tham số sau:

1. Độ dài tóm tắt: ${options.length}
   - "short": 2-3 câu về ý chính
   - "medium": Nhiều đoạn bao gồm các điểm chính
   - "long": Tóm tắt chi tiết bao gồm tất cả các phần quan trọng

2. Ngôn ngữ: ${options.lang}
   - Tóm tắt sẽ được trả về bằng ngôn ngữ được chỉ định (ví dụ: "vi" cho tiếng Việt, "en" cho tiếng Anh)

3. Định dạng: ${options.format}
   - "paragraph": Tóm tắt dưới dạng văn bản liền mạch
   - "bullet": Liệt kê các điểm chính bằng dấu gạch đầu dòng

Trong tóm tắt của bạn:
- Nắm bắt thông tin quan trọng nhất trước
- Loại bỏ chi tiết không cần thiết và thông tin trùng lặp
- Giữ giọng điệu khách quan và chính xác
- Bảo toàn ý nghĩa và ngữ cảnh của nội dung gốc
- Xác định và trích dẫn nguồn nếu có thể

Nếu nội dung chứa thông tin đặc biệt như dữ liệu kỹ thuật, nghiên cứu, hoặc số liệu thống kê, hãy đảm bảo đưa những thông tin quan trọng này vào tóm tắt một cách chính xác.

Nội dung cần tóm tắt:
${text}

Lưu ý: Nếu bạn không thể tóm tắt vì bất kỳ lý do gì (ví dụ: nội dung không phù hợp), hãy thông báo cho người dùng.
`
    // Replace placeholders with actual option values. Note: The template already does this via template literals.
    // The 'text' is appended at the end.
    return promptTemplate
  }

  async function summarizeWithGemini(text, apiKey) {
    if (!apiKey) {
      throw new Error('Chưa cấu hình API key Gemini.')
    }
    const options = await getSummaryOptions()
    const prompt = buildPrompt(text, options)
    const model = 'gemini-1.5-flash' // Use a recommended model
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
      apiKey
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }, // Adjusted temperature slightly
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        console.error('Gemini API Error Response:', data)
        if (data.error && data.error.message) {
          throw new Error('Gemini API: ' + data.error.message)
        } else {
          throw new Error('Lỗi không xác định từ Gemini API')
        }
      }
      if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text)
        throw new Error('Không nhận được kết quả tóm tắt hợp lệ từ API.')
      return data.candidates[0].content.parts[0].text
    } catch (e) {
      console.error('Fetch error:', e)
      // Check if the error is a network error or CORS issue
      if (e instanceof TypeError && e.message.includes('NetworkError')) {
        throw new Error(
          'Lỗi mạng khi gọi Gemini API. Kiểm tra kết nối và cài đặt CORS.'
        )
      } else if (e.message.includes('API key')) {
        throw e // Re-throw API key specific errors
      } else {
        throw new Error('Đã xảy ra lỗi khi gọi Gemini API.')
      }
    }
  }

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

<div class="h-screen flex">
  <!-- Main Content -->
  <div class="flex-grow flex flex-col items-center p-4">
    <h1 class="mb-4 text-xl">SuperSummary</h1>

    <div class="text-center mb-4">
      <button
        onclick={handleSummarizeText}
        class="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
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
      <div class="mt-4 p-4 prose w-full">
        <h2 class=" text-lg font-semibold mb-2">Kết quả tóm tắt:</h2>
        {@html summary}
      </div>
    {/if}
  </div>

  <!-- Settings Sidebar -->
  <Setting />
</div>
