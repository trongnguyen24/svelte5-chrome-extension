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
            format: result.summaryFormat || 'heading',
          })
        }
      )
    } else {
      console.warn(
        'chrome.storage.sync not available. Returning default options.'
      )
      resolve({ length: 'medium', lang: 'vi', format: 'heading' })
    }
  })
}

export function buildPrompt(text, options, isYouTube = false) {
  let promptTemplate = ''

  if (isYouTube) {
    promptTemplate = `Bạn là trợ lý AI chuyên tóm tắt nội dung video YouTube dựa trên transcript. Nhiệm vụ của bạn là tạo ra bản tóm tắt rõ ràng, súc tích và chính xác về nội dung video.

Khi tôi cung cấp transcript từ một video YouTube, hãy phân tích và tóm tắt theo các tham số sau:

1. Độ dài tóm tắt: ${options.length}
   - "short": 2-3 câu về ý chính
   - "medium": Nhiều đoạn bao gồm các điểm chính
   - "long": Tóm tắt chi tiết bao gồm tất cả các phần quan trọng

2. Ngôn ngữ: ${options.lang}
   - Tóm tắt sẽ được trả về bằng ngôn ngữ được chỉ định (ví dụ: "vi" cho tiếng Việt, "en" cho tiếng Anh)

3. Định dạng: ${options.format}
   - "paragraph": Tóm tắt dưới dạng văn bản liền mạch
   - "heading": Tóm tắt dưới dạng tiêu đề cấp độ tiêu đề sử dụng ### và ####

Hướng dẫn tóm tắt:
- Xác định chủ đề chính, điểm quan trọng và kết luận của video
- Loại bỏ chi tiết không cần thiết và thông tin trùng lặp
- Giữ giọng điệu khách quan và chính xác
- Nếu video chứa thuật ngữ chuyên ngành, số liệu thống kê, hoặc nghiên cứu, đảm bảo bao gồm thông tin này một cách chính xác
- Nếu người nói chia sẻ quan điểm cá nhân hoặc ý kiến, nêu rõ đây là quan điểm từ video
- Nếu có phần thảo luận về các bước cụ thể hoặc hướng dẫn, tóm tắt các bước chính một cách ngắn gọn
- Nếu transcript chứa lỗi hoặc không rõ ràng ở một số phần, đánh dấu những phần này

Nếu định dạng là "paragraph":
- Bắt đầu với giới thiệu ngắn về chủ đề video
- Trình bày các điểm chính trong các đoạn văn liền mạch
- Kết thúc bằng kết luận hoặc ý nghĩa của video

Nếu định dạng là "heading":
- Sử dụng ### cho tiêu đề chính (chủ đề video)
- Sử dụng #### cho các tiêu đề phụ (điểm chính)
- Dưới mỗi tiêu đề, cung cấp nội dung tóm tắt liên quan

Transcript video:
${text}`
  } else {
    promptTemplate = `Bạn là một AI chuyên gia tóm tắt nội dung trang web một cách chính xác và hiệu quả. Nhiệm vụ của bạn là tóm tắt nội dung được cung cấp, tuân theo các tham số do người dùng chỉ định.

Khi nhận được nội dung, hãy phân tích và tóm tắt nội dung chính dựa trên các tham số sau:

1. Độ dài tóm tắt: ${options.length}
   - "short": 2-3 câu về ý chính
   - "medium": Nhiều đoạn bao gồm các điểm chính
   - "long": Tóm tắt chi tiết bao gồm tất cả các phần quan trọng

2. Ngôn ngữ: ${options.lang}
   - Tóm tắt sẽ được trả về bằng ngôn ngữ được chỉ định (ví dụ: "vi" cho tiếng Việt, "en" cho tiếng Anh)

3. Định dạng: ${options.format}
   - "paragraph": Tóm tắt dưới dạng văn bản liền mạch
   - "heading": Tóm tắt dưới dạng tiêu đề cấp độ tiêu đề sử dụng ### và ####

Trong tóm tắt của bạn:
- Nắm bắt thông tin quan trọng nhất trước
- Loại bỏ chi tiết không cần thiết và thông tin trùng lặp
- Giữ giọng điệu khách quan và chính xác
- Bảo toàn ý nghĩa và ngữ cảnh của nội dung gốc

Nếu nội dung chứa thông tin đặc biệt như dữ liệu kỹ thuật, nghiên cứu, hoặc số liệu thống kê, hãy đảm bảo đưa những thông tin quan trọng này vào tóm tắt một cách chính xác.

Nội dung cần tóm tắt:
${text}

Lưu ý: Nếu bạn không thể tóm tắt vì bất kỳ lý do gì (ví dụ: nội dung không phù hợp), hãy thông báo cho người dùng.`
  }

  return promptTemplate
}
