import { getSummaryOptions, buildPrompt } from './utils.js'; // Import cả hai hàm tĩnh

export async function getApiKey() {
  return new Promise((resolve) => {
    // Check if running in a Chrome extension context
    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      chrome.storage.sync.get(['geminiApiKey'], (result) => {
        resolve(result.geminiApiKey || '');
      });
    } else {
      // Provide a default or handle the case where chrome.storage is not available
      console.warn(
        'chrome.storage.sync not available. Returning empty API key.'
      );
      resolve(''); // Or perhaps load from localStorage or another source?
    }
  });
}

export async function summarizeWithGemini(text, apiKey) {
  if (!apiKey) {
    throw new Error('Chưa cấu hình API key Gemini.');
  }
  const options = await getSummaryOptions(); // Sử dụng hàm đã import tĩnh
  const prompt = buildPrompt(text, options); // Sử dụng hàm đã import tĩnh
  const model = 'gemini-1.5-flash'; // Use a recommended model
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
    apiKey;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }, // Adjusted temperature slightly
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      console.error('Gemini API Error Response:', data);
      if (data.error && data.error.message) {
        throw new Error('Gemini API: ' + data.error.message);
      } else {
        throw new Error('Lỗi không xác định từ Gemini API');
      }
    }
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text)
      throw new Error('Không nhận được kết quả tóm tắt hợp lệ từ API.');
    return data.candidates[0].content.parts[0].text;
  } catch (e) {
    console.error('Fetch error:', e);
    // Check if the error is a network error or CORS issue
    if (e instanceof TypeError && e.message.includes('NetworkError')) {
      throw new Error(
        'Lỗi mạng khi gọi Gemini API. Kiểm tra kết nối và cài đặt CORS.'
      );
    } else if (e.message.includes('API key')) {
      throw e; // Re-throw API key specific errors
    } else {
      throw new Error('Đã xảy ra lỗi khi gọi Gemini API.');
    }
  }
} 