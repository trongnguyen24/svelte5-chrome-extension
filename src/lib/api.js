import { getSummaryOptions, buildPrompt } from './utils.js' // Import cả hai hàm tĩnh

export async function getApiKey() {
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

export async function summarizeWithGemini(text, apiKey, isYouTube = false) {
  if (!apiKey) {
    throw new Error(
      'Gemini API key is not configured. Click the settings icon on the right to add your API key.'
    )
  }
  const options = await getSummaryOptions() // Sử dụng hàm đã import tĩnh
  const prompt = buildPrompt(text, options, isYouTube) // Truyền isYouTube
  const model = 'gemini-1.5-flash' // Use a recommended model
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
    apiKey
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }, // Adjusted temperature slightly
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
        throw new Error('Gemini API Error: ' + data.error.message)
      } else {
        throw new Error('Unknown error from Gemini API')
      }
    }
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text)
      throw new Error('Did not receive a valid summary result from the API.')
    return data.candidates[0].content.parts[0].text
  } catch (e) {
    console.error('Fetch error:', e)
    // Check if the error is a network error or CORS issue
    if (e instanceof TypeError && e.message.includes('NetworkError')) {
      throw new Error(
        'Network error calling Gemini API. Check connection and CORS settings.'
      )
    } else if (e.message.includes('API key')) {
      throw e // Re-throw API key specific errors
    } else {
      throw new Error('An error occurred while calling the Gemini API.')
    }
  }
}

/**
 * Tóm tắt nội dung video YouTube theo chapter sử dụng Google Gemini.
 * @param {string} timestampedTranscript - Transcript của video có kèm timestamp.
 * @param {string} apiKey - Google AI API Key.
 * @returns {Promise<string>} - Promise giải quyết với bản tóm tắt theo chapter dưới dạng Markdown.
 */
export async function summarizeChaptersWithGemini(
  timestampedTranscript,
  apiKey
) {
  if (!apiKey) {
    throw new Error(
      'Gemini API key is not configured. Click the settings icon on the right to add your API key.'
    )
  }

  const prompt = `
Bạn là một AI chuyên gia trong việc tóm tắt nội dung video YouTube. Nhiệm vụ của bạn là tạo ra bản tóm tắt chi tiết theo từng chapter của video, kèm theo thời gian bắt đầu của mỗi phần, dựa trên transcript có sẵn thời gian.

Khi tôi cung cấp transcript có thời gian của một video YouTube, hãy tạo tóm tắt theo hướng dẫn sau:

1.  **Phân tích transcript:** Tự động xác định các phần (chapters) logic dựa trên sự thay đổi chủ đề hoặc khoảng dừng trong transcript. Đặt tên phù hợp cho mỗi chapter.
2.  **Tạo tiêu đề chính:** Bắt đầu với "### Tóm tắt video theo chương:".
3.  **Với mỗi chapter bạn xác định được:**
    *   Tạo tiêu đề cấp 4 (####) với định dạng: "#### [Thời gian bắt đầu Ước lượng] - [Tên chapter bạn đặt]"
        Ví dụ: "#### 0:15 - Giới thiệu về Svelte 5"
    *   Dưới mỗi tiêu đề chapter, tóm tắt nội dung chính của chapter đó bằng 2-4 câu, dựa vào transcript.
    *   Nếu chapter có các điểm quan trọng cần nhấn mạnh, hãy sử dụng tiêu đề cấp 4 (####) và bullet points cho các điểm này.
        Ví dụ: "#### Runes là gì?" và sau đó giải thích điểm đó.
4.  **Đảm bảo bao gồm:**
    *   Các luận điểm chính.
    *   Thuật ngữ quan trọng được giải thích (nếu có trong transcript).
    *   Kết luận hoặc ý chính cuối cùng (nếu có). 
5.  **Sử dụng định dạng markdown:**
    *   #### cho tiêu đề chapter với thời gian.
    *   ##### cho các điểm quan trọng trong chapter.
    *   **In đậm** cho thuật ngữ/khái niệm quan trọng.
6.  **Kết thúc:** Bằng phần "### Kết luận chung" tóm tắt thông điệp tổng thể.

Transcript có thời gian:
\`\`\`
${timestampedTranscript}
\`\`\`

Hãy tạo bản tóm tắt theo chương từ transcript trên.
`

  const model = 'gemini-2.0-flash' // Or another suitable model
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
    apiKey
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    // Adjust generationConfig if needed, e.g., for longer/more detailed chapters
    generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (!res.ok) {
      console.error('Gemini API Error Response (Chapters):', data)
      if (data.error && data.error.message) {
        throw new Error('Gemini API Error (Chapters): ' + data.error.message)
      } else {
        throw new Error('Unknown error from Gemini API (Chapters)')
      }
    }
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text)
      throw new Error(
        'Did not receive a valid chapter summary result from the API.'
      )
    return data.candidates[0].content.parts[0].text
  } catch (e) {
    console.error('Fetch error (Chapters):', e)
    if (e instanceof TypeError && e.message.includes('NetworkError')) {
      throw new Error(
        'Network error calling Gemini API for chapters. Check connection and CORS settings.'
      )
    } else if (e.message.includes('API key')) {
      throw e // Re-throw API key specific errors
    } else {
      throw new Error(
        'An error occurred while calling the Gemini API for chapters.'
      )
    }
  }
}
