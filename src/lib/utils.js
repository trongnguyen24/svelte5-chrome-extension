export async function getSummaryOptions() {
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

export function buildPrompt(text, options) {
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
   - "heading": Tóm tắt dưới dạng tiêu đề cấp độ tiêu đề sử dụng ### và ####

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
