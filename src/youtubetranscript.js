/**
 * Lấy transcript (phụ đề) từ trang xem video YouTube hiện tại bằng cách
 * phân tích dữ liệu nhúng trong trang (ytInitialPlayerResponse) và sử dụng API json3.
 *
 * @param {string} [preferredLang='vi'] - Mã ngôn ngữ ưu tiên (ví dụ: 'vi', 'en').
 * @returns {Promise<string|null>} - Một Promise giải quyết với chuỗi transcript hoàn chỉnh
 *                                   hoặc null nếu không tìm thấy hoặc có lỗi.
 */
console.log('Content script youtubetranscript.js đã được tiêm vào tab.') // Xác nhận inject

async function getYouTubeTranscript(preferredLang = 'vi') {
  console.log(
    'Attempting to get transcript using json3 for language:',
    preferredLang
  )

  try {
    // --- Bước 1: Tìm và Parse ytInitialPlayerResponse ---
    let playerResponse
    try {
      // Cách lấy ytInitialPlayerResponse ngắn gọn hơn, nhưng có thể kém ổn định
      const responseText = await fetch(window.location.href).then((res) =>
        res.text()
      )
      const playerResponseText = responseText
        .split('ytInitialPlayerResponse = ')[1]
        ?.split(';var')[0]
      if (!playerResponseText) {
        console.error(
          'Could not extract ytInitialPlayerResponse string using split method.'
        )
        // Fallback về phương pháp tìm script tag (an toàn hơn)
        const scripts = document.querySelectorAll('script')
        const playerResponseScript = Array.from(scripts).find((script) =>
          script.textContent.includes('var ytInitialPlayerResponse = {')
        )
        if (!playerResponseScript) {
          console.error('Could not find ytInitialPlayerResponse script tag.')
          if (window.ytInitialPlayerResponse) {
            console.log('Found ytInitialPlayerResponse in window object.')
            playerResponse = window.ytInitialPlayerResponse
          } else {
            console.error('ytInitialPlayerResponse not found in window either.')
            return null
          }
        } else {
          const scriptContent = playerResponseScript.textContent
          const jsonStart = scriptContent.indexOf('ytInitialPlayerResponse = {')
          const objectStart = scriptContent.indexOf('{', jsonStart)
          let objectEnd = scriptContent.indexOf(';</script>', objectStart)
          if (objectEnd === -1) {
            const scriptEnd = scriptContent.indexOf('</script>', objectStart)
            objectEnd = scriptContent.lastIndexOf(
              ';',
              scriptEnd !== -1 ? scriptEnd : undefined
            )
          }
          if (objectEnd === -1) {
            objectEnd = scriptContent.lastIndexOf(
              '}',
              scriptContent.indexOf('</script>', objectStart)
            )
            if (objectEnd !== -1) objectEnd += 1
          }

          if (
            objectStart === -1 ||
            objectEnd === -1 ||
            objectEnd <= objectStart
          ) {
            console.error(
              'Could not accurately determine JSON boundaries from script tag.'
            )
            return null
          }
          const jsonString = scriptContent.substring(objectStart, objectEnd)
          playerResponse = JSON.parse(jsonString)
        }
      } else {
        playerResponse = JSON.parse(playerResponseText)
      }
    } catch (e) {
      console.error('Error finding or parsing ytInitialPlayerResponse:', e)
      return null
    }

    if (!playerResponse) {
      console.error('Failed to obtain playerResponse object.')
      return null
    }

    // --- Bước 2: Tìm captionTracks ---
    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks

    if (!captionTracks || captionTracks.length === 0) {
      console.log('No caption tracks found in playerResponse.')
      return null // Không có phụ đề nào
    }
    console.log(`Found ${captionTracks.length} caption tracks.`)

    // --- Bước 3: Chọn Track URL theo logic mới ---
    const findCaptionUrl = (vssIdPrefix) =>
      captionTracks.find((track) => track.vssId?.startsWith(vssIdPrefix))
        ?.baseUrl

    const langVssId = '.' + preferredLang // e.g., ".en", ".vi"
    const autoVssId = 'a.' + preferredLang // e.g., "a.en", "a.vi"

    let baseUrl = findCaptionUrl(langVssId) // Ưu tiên ngôn ngữ chỉ định (vd: .en)
    let needsTlang = false

    if (!baseUrl) {
      console.log(
        `No exact match for ${preferredLang} (${langVssId}). Trying fallbacks.`
      )
      baseUrl =
        findCaptionUrl('.') || // Thử bất kỳ ngôn ngữ nào không phải auto-gen (vd: .)
        findCaptionUrl(autoVssId) || // Thử auto-gen của ngôn ngữ chỉ định (vd: a.en)
        captionTracks[0]?.baseUrl // Lấy track đầu tiên nếu không có gì khác
      // Nếu dùng fallback mà không phải là auto-gen của ngôn ngữ mong muốn, cần thêm tlang
      if (baseUrl && !findCaptionUrl(autoVssId)) {
        needsTlang = true
      }
    }

    if (!baseUrl) {
      console.error('Could not find any suitable caption track baseUrl.')
      return null
    }

    const transcriptUrl =
      baseUrl + '&fmt=json3' + (needsTlang ? `&tlang=${preferredLang}` : '')

    // Ghi log track được chọn
    const selectedTrack = captionTracks.find(
      (track) => track.baseUrl === baseUrl.split('&fmt=json3')[0]
    ) // Tìm lại track từ baseUrl gốc
    console.log(
      `Selected track: ${
        selectedTrack?.name?.simpleText ||
        selectedTrack?.languageCode ||
        'Unknown'
      }${
        selectedTrack?.kind === 'asr' ? ' (auto-generated)' : ''
      }, URL: ${transcriptUrl}`
    )

    // --- Bước 4: Fetch và Parse JSON3 ---
    console.log('Fetching transcript from:', transcriptUrl)
    const response = await fetch(transcriptUrl)
    if (!response.ok) {
      console.error(
        `Failed to fetch transcript json3. Status: ${response.status}`
      )
      // Có thể thử fallback về XML ở đây nếu muốn, nhưng logic mới chỉ dùng json3
      return null
    }

    const transcriptData = await response.json()

    // --- Bước 5: Trích xuất và làm sạch Text ---
    if (!transcriptData || !transcriptData.events) {
      console.error('Invalid json3 format received or no events found.')
      return null
    }

    const fullTranscript = transcriptData.events
      .map((event) => {
        // event.segs là một mảng các đoạn text trong một khoảng thời gian
        // Nối các đoạn text lại (nếu có)
        return event.segs?.map((seg) => seg.utf8)?.join(' ') || ''
      })
      .join(' ') // Nối các dòng sự kiện lại với nhau bằng khoảng trắng
      // Làm sạch: loại bỏ newline, ký hiệu nhạc, dấu nháy, dấu chấm lặp lại, thẻ html/xml, nội dung trong {} hoặc []
      .replace(/\n/g, ' ') // Thay thế newline bằng khoảng trắng
      .replace(/♪|'|"|\.{2,}|\<[\s\S]*?\>|\{[\s\S]*?\}|\[[\s\S]*?\]/g, '') // Loại bỏ các ký tự/mẫu không mong muốn
      .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
      .trim() // Cắt khoảng trắng thừa ở đầu/cuối

    console.log('Transcript extracted and cleaned successfully via json3.')
    return fullTranscript // Đã trim và chuẩn hóa khoảng trắng
  } catch (error) {
    console.error(
      'An unexpected error occurred in getYouTubeTranscript:',
      error
    )
    return null // Trả về null nếu có lỗi không mong muốn
  }
}

/**
 * Định dạng milliseconds thành chuỗi thời gian MM:SS hoặc HH:MM:SS.
 * @param {number} ms - Thời gian tính bằng milliseconds.
 * @returns {string} - Chuỗi thời gian đã định dạng.
 */
function formatMilliseconds(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const paddedSeconds = String(seconds).padStart(2, '0')
  const paddedMinutes = String(minutes).padStart(2, '0')

  if (hours > 0) {
    const paddedHours = String(hours).padStart(2, '0')
    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`
  } else {
    return `${paddedMinutes}:${paddedSeconds}`
  }
}

/**
 * Lấy transcript KÈM THỜI GIAN từ trang xem video YouTube hiện tại
 * bằng cách sử dụng API nội bộ (không tương tác DOM).
 *
 * @param {string} [preferredLang='vi'] - Mã ngôn ngữ ưu tiên (ví dụ: 'vi', 'en').
 * @returns {Promise<string|null>} - Một Promise giải quyết với chuỗi transcript
 *                                   có thời gian hoặc null nếu có lỗi.
 */
async function getYouTubeTranscriptWithTimestampFromAPI(preferredLang = 'vi') {
  console.log(
    'Attempting to get timestamped transcript using API for language:',
    preferredLang
  )

  try {
    // --- Bước 1: Tìm và Parse ytInitialPlayerResponse (giống getYouTubeTranscript) ---
    let playerResponse
    try {
      const responseText = await fetch(window.location.href).then((res) =>
        res.text()
      )
      const playerResponseText = responseText
        .split('ytInitialPlayerResponse = ')[1]
        ?.split(';var')[0]
      if (!playerResponseText) {
        console.error(
          'Could not extract ytInitialPlayerResponse string using split method.'
        )
        const scripts = document.querySelectorAll('script')
        const playerResponseScript = Array.from(scripts).find((script) =>
          script.textContent.includes('var ytInitialPlayerResponse = {')
        )
        if (!playerResponseScript) {
          console.error('Could not find ytInitialPlayerResponse script tag.')
          if (window.ytInitialPlayerResponse) {
            console.log('Found ytInitialPlayerResponse in window object.')
            playerResponse = window.ytInitialPlayerResponse
          } else {
            console.error('ytInitialPlayerResponse not found in window either.')
            return null
          }
        } else {
          const scriptContent = playerResponseScript.textContent
          const jsonStart = scriptContent.indexOf('ytInitialPlayerResponse = {')
          const objectStart = scriptContent.indexOf('{', jsonStart)
          let objectEnd = scriptContent.indexOf(';</script>', objectStart)
          if (objectEnd === -1) {
            const scriptEnd = scriptContent.indexOf('</script>', objectStart)
            objectEnd = scriptContent.lastIndexOf(
              ';',
              scriptEnd !== -1 ? scriptEnd : undefined
            )
          }
          if (objectEnd === -1) {
            objectEnd = scriptContent.lastIndexOf(
              '}',
              scriptContent.indexOf('</script>', objectStart)
            )
            if (objectEnd !== -1) objectEnd += 1
          }
          if (
            objectStart === -1 ||
            objectEnd === -1 ||
            objectEnd <= objectStart
          ) {
            console.error(
              'Could not accurately determine JSON boundaries from script tag.'
            )
            return null
          }
          const jsonString = scriptContent.substring(objectStart, objectEnd)
          playerResponse = JSON.parse(jsonString)
        }
      } else {
        playerResponse = JSON.parse(playerResponseText)
      }
    } catch (e) {
      console.error('Error finding or parsing ytInitialPlayerResponse:', e)
      return null
    }

    if (!playerResponse) {
      console.error('Failed to obtain playerResponse object.')
      return null
    }

    // --- Bước 2: Tìm captionTracks (giống getYouTubeTranscript) ---
    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks

    if (!captionTracks || captionTracks.length === 0) {
      console.log('No caption tracks found in playerResponse.')
      return null
    }
    console.log(`Found ${captionTracks.length} caption tracks.`)

    // --- Bước 3: Chọn Track URL (giống getYouTubeTranscript) ---
    const findCaptionUrl = (vssIdPrefix) =>
      captionTracks.find((track) => track.vssId?.startsWith(vssIdPrefix))
        ?.baseUrl

    const langVssId = '.' + preferredLang
    const autoVssId = 'a.' + preferredLang

    let baseUrl = findCaptionUrl(langVssId)
    let needsTlang = false

    if (!baseUrl) {
      console.log(
        `No exact match for ${preferredLang} (${langVssId}). Trying fallbacks.`
      )
      baseUrl =
        findCaptionUrl('.') ||
        findCaptionUrl(autoVssId) ||
        captionTracks[0]?.baseUrl
      if (baseUrl && !findCaptionUrl(autoVssId)) {
        needsTlang = true
      }
    }

    if (!baseUrl) {
      console.error('Could not find any suitable caption track baseUrl.')
      return null
    }

    const transcriptUrl =
      baseUrl + '&fmt=json3' + (needsTlang ? `&tlang=${preferredLang}` : '')

    const selectedTrack = captionTracks.find(
      (track) => track.baseUrl === baseUrl.split('&fmt=json3')[0]
    )
    console.log(
      `Selected track: ${
        selectedTrack?.name?.simpleText ||
        selectedTrack?.languageCode ||
        'Unknown'
      }${
        selectedTrack?.kind === 'asr' ? ' (auto-generated)' : ''
      }, URL: ${transcriptUrl}`
    )

    // --- Bước 4: Fetch và Parse JSON3 (giống getYouTubeTranscript) ---
    console.log('Fetching timestamped transcript from:', transcriptUrl)
    const response = await fetch(transcriptUrl)
    if (!response.ok) {
      console.error(
        `Failed to fetch transcript json3. Status: ${response.status}`
      )
      return null
    }
    const transcriptData = await response.json()

    // --- Bước 5: Trích xuất THỜI GIAN và Text --- *KHÁC BIỆT Ở ĐÂY*
    if (!transcriptData || !transcriptData.events) {
      console.error('Invalid json3 format received or no events found.')
      return null
    }

    const transcriptLines = transcriptData.events
      .filter((event) => event.segs && event.tStartMs !== undefined) // Chỉ lấy event có text và thời gian bắt đầu
      .map((event) => {
        const startTime = formatMilliseconds(event.tStartMs) // Định dạng thời gian
        const text = event.segs
          .map((seg) => seg.utf8)
          .join(' ')
          .replace(/\n/g, ' ') // Thay thế newline bằng khoảng trắng trong một dòng
          .replace(/♪|'|"|\.{2,}|\<[\s\S]*?\>|\{[\s\S]*?\}|\[[\s\S]*?\]/g, '') // Loại bỏ ký tự không mong muốn
          .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
          .trim() // Cắt khoảng trắng thừa

        return text.length > 0 ? `[${startTime}] ${text}` : null // Chỉ trả về dòng nếu có text
      })
      .filter((line) => line !== null) // Loại bỏ các dòng null (không có text sau khi làm sạch)

    if (transcriptLines.length === 0) {
      console.log(
        'Transcript events found, but no valid text content could be extracted.'
      )
      return null // Không có nội dung hợp lệ
    }

    const fullTranscriptWithTime = transcriptLines.join('\n') // Nối các dòng bằng ký tự xuống dòng

    console.log(
      'Timestamped transcript extracted and formatted successfully via API.'
    )
    return fullTranscriptWithTime
  } catch (error) {
    console.error(
      'An unexpected error occurred in getYouTubeTranscriptWithTimestampFromAPI:',
      error
    )
    return null
  }
}

// Lắng nghe yêu cầu từ Popup (App.svelte)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchTranscript') {
    console.log('Content script received fetchTranscript request')
    // Gọi hàm getYouTubeTranscript gốc (chỉ lấy text)
    getYouTubeTranscript(request.lang || 'en')
      .then((transcript) => {
        if (transcript) {
          console.log(
            'Transcript fetched, sending response (first 100 chars):',
            transcript.substring(0, 100) + '...'
          )
          sendResponse({ success: true, transcript: transcript })
        } else {
          console.log('Failed to get transcript, sending error response')
          sendResponse({ success: false, error: 'Failed to get transcript.' })
        }
      })
      .catch((error) => {
        console.error('Error handling fetchTranscript message:', error)
        sendResponse({ success: false, error: error.message })
      })
    return true
  } else if (request.action === 'fetchTranscriptWithTimestamp') {
    console.log('Content script received fetchTranscriptWithTimestamp request')
    // Gọi hàm MỚI getYouTubeTranscriptWithTimestampFromAPI
    getYouTubeTranscriptWithTimestampFromAPI(request.lang || 'en') // Sử dụng ngôn ngữ nếu có, mặc định 'en'
      .then((transcript) => {
        if (transcript) {
          console.log(
            'Timestamped transcript fetched (API), sending response (first 100 chars):',
            transcript.substring(0, 100) + '...'
          )
          sendResponse({ success: true, transcript: transcript })
        } else {
          console.log(
            'Failed to get timestamped transcript (API), sending error response'
          )
          sendResponse({
            success: false,
            error: 'Failed to get timestamped transcript using API.', // Cập nhật thông báo lỗi
          })
        }
      })
      .catch((error) => {
        console.error(
          'Error handling fetchTranscriptWithTimestamp message (API):',
          error
        )
        sendResponse({ success: false, error: error.message })
      })
    return true // Giữ kênh message mở
  }
})

console.log('YouTube Transcript Content Script Loaded.') // Để xác nhận script đã load

// --- HÀM CŨ LẤY TỪ DOM (GIỮ LẠI NẾU CẦN THAM KHẢO HOẶC FALLBACK) ---
// export async function getTranscriptWithTimestamp() { ... }
export async function getTranscriptWithTimestamp() {
  // --- Cấu hình ---
  const maxRetries = 3 // Số lần thử lại tối đa
  const waitAfterClickMs = 1000 // Thời gian chờ (ms) sau khi nhấn nút transcript
  const waitBetweenRetriesMs = 1500 // Thời gian chờ (ms) giữa các lần thử lại

  console.warn(
    `[Transcript-DOM] Bắt đầu lấy transcript KÈM THỜI GIAN bằng DOM (Tối đa ${maxRetries} lần thử)...`
  )

  // --- Hàm phụ trợ ---
  /** Chờ một khoảng thời gian */
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /** Trích xuất THỜI GIAN và VĂN BẢN transcript */
  function extractTranscriptText() {
    // --- SELECTORS CÓ THỂ CẦN CẬP NHẬT ---
    const segmentContainerSelector = 'ytd-transcript-segment-renderer' // Selector cho toàn bộ dòng segment (chứa cả time và text)
    const timestampSelector = '.segment-timestamp, .timestamp' // Thử các class phổ biến cho timestamp bên TRONG segment container
    const textSelector = 'yt-formatted-string' // Selector cho phần text bên TRONG segment container

    const segmentElements = document.querySelectorAll(segmentContainerSelector)

    if (segmentElements && segmentElements.length > 0) {
      console.log(
        `[Transcript-DOM] Tìm thấy ${segmentElements.length} khối segment transcript.`
      )
      const transcriptLines = []

      for (const segmentElement of segmentElements) {
        // Tìm timestamp và text bên trong mỗi khối segment
        const timestampElement = segmentElement.querySelector(timestampSelector)
        const textElement = segmentElement.querySelector(textSelector)

        const timestamp = timestampElement
          ? timestampElement.textContent.trim()
          : '?:??' // Lấy text của timestamp, mặc định là '?:??' nếu không tìm thấy
        const text = textElement ? textElement.textContent.trim() : '' // Lấy text của nội dung, mặc định là rỗng

        // Chỉ thêm vào kết quả nếu có nội dung text thực sự
        if (text.length > 0) {
          transcriptLines.push(`[${timestamp}] ${text}`)
        } else if (timestamp !== '?:??') {
          // Nếu chỉ có timestamp mà không có text (ít xảy ra), có thể ghi nhận lại nếu muốn
          // console.log(`[Transcript] Segment chỉ có timestamp: ${timestamp}`);
        }
      }

      if (transcriptLines.length > 0) {
        const fullText = transcriptLines.join('\n') // Nối các dòng bằng ký tự xuống dòng
        return fullText
      } else {
        console.log(
          '[Transcript-DOM] Tìm thấy các khối segment, nhưng không trích xuất được cặp thời gian/văn bản hợp lệ.'
        )
        return null
      }
    }
    console.log(
      '[Transcript-DOM] Không tìm thấy khối segment transcript với selector:',
      segmentContainerSelector
    )
    return null
  }

  /** Cố gắng mở ô transcript bằng cách click nút trực tiếp */
  async function tryOpenTranscriptPane_DirectClick() {
    console.log(
      '[Transcript-DOM] Đang thử tìm và nhấp nút transcript trực tiếp...'
    )
    // --- SELECTOR CÓ THỂ CẦN CẬP NHẬT ---
    const directButtonSelector =
      'button[aria-label="Show transcript"], button[aria-label="Hiển thị bản ghi"]'

    const directButton = document.querySelector(directButtonSelector)
    if (directButton) {
      console.log(
        '[Transcript-DOM] Tìm thấy nút transcript trực tiếp. Đang nhấp...'
      )
      directButton.click()
      await delay(100) // Chờ một chút sau khi click
      return true
    } else {
      console.error(
        '[Transcript-DOM] Không tìm thấy nút transcript trực tiếp với selector:',
        directButtonSelector
      )
      return false
    }
  }

  // --- Logic chính với vòng lặp thử lại ---
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[Transcript-DOM] --- Lần thử ${attempt} / ${maxRetries} ---`)
    try {
      // 1. Kiểm tra xem transcript đã có sẵn chưa
      let transcriptText = extractTranscriptText()
      if (transcriptText) {
        console.log('[Transcript-DOM] Transcript (kèm thời gian) đã có sẵn.')
        return transcriptText // Trả về kết quả
      }

      // 2. Nếu chưa có, thử mở ô transcript
      const clickedSuccessfully = await tryOpenTranscriptPane_DirectClick()

      // Chỉ thử lại nếu click thành công, nếu không thì nút có thể không tồn tại
      if (clickedSuccessfully) {
        // 3. Chờ cho transcript tải
        console.log(
          `[Transcript-DOM] Chờ ${
            waitAfterClickMs / 1000
          } giây để transcript tải...`
        )
        await delay(waitAfterClickMs)

        // 4. Thử trích xuất lại sau khi chờ
        transcriptText = extractTranscriptText()
        if (transcriptText) {
          console.log(
            '[Transcript-DOM] Đã trích xuất transcript (kèm thời gian) thành công.'
          )
          return transcriptText // Trả về kết quả
        } else {
          console.log(
            `[Transcript-DOM] Lần thử ${attempt} thất bại: Không tìm thấy transcript (kèm thời gian) sau khi chờ.`
          )
        }
      } else {
        console.log(
          `[Transcript-DOM] Không thể nhấp nút mở transcript trong lần thử ${attempt}. Dừng thử.`
        )
        break // Thoát vòng lặp nếu không tìm thấy nút
      }
    } catch (error) {
      console.error(`[Transcript-DOM] Lỗi trong lần thử ${attempt}:`, error)
    }

    // Chờ trước khi thử lại (nếu chưa phải lần cuối và click thành công)
    if (attempt < maxRetries) {
      console.log(
        `[Transcript-DOM] Chờ ${
          waitBetweenRetriesMs / 1000
        } giây trước khi thử lại...`
      )
      await delay(waitBetweenRetriesMs)
    }
  }

  console.error(
    `[Transcript-DOM] Không thể lấy transcript (kèm thời gian) sau ${maxRetries} lần thử.`
  )
  return null // Trả về null nếu thất bại
}
