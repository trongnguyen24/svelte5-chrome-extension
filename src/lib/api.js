import { getSummaryOptions, buildPrompt, buildChapterPrompt } from './utils.js' // Import các hàm tĩnh cần thiết

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
 * @param {string} language - Ngôn ngữ mong muốn cho tóm tắt chapter.
 * @param {string} length - Độ dài mong muốn cho tóm tắt chapter ('short', 'medium', 'long').
 * @returns {Promise<string>} - Promise giải quyết với bản tóm tắt theo chapter dưới dạng Markdown.
 */
export async function summarizeChaptersWithGemini(
  timestampedTranscript,
  apiKey,
  language,
  length
) {
  if (!apiKey) {
    throw new Error(
      'Gemini API key is not configured. Click the settings icon on the right to add your API key.'
    )
  }

  const options = await getSummaryOptions() // Lấy options
  const prompt = buildChapterPrompt(
    timestampedTranscript,
    options,
    language,
    length
  ) // Sử dụng hàm mới

  const model = 'gemini-1.5-flash' // Cập nhật model nếu cần, ví dụ gemini-1.5-flash
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
