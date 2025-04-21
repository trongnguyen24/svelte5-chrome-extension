<script>
  import { onMount } from 'svelte'

  let apiKey = $state('')
  let summaryLength = $state('medium') // Giá trị mặc định
  let summaryLang = $state('vietnamese') // Giá trị mặc định
  let summaryFormat = $state('bulletpoints') // Giá trị mặc định
  let saveStatus = $state('')

  onMount(() => {
    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      chrome.storage.sync.get(
        ['geminiApiKey', 'summaryLength', 'summaryLang', 'summaryFormat'],
        (result) => {
          if (result.geminiApiKey) apiKey = result.geminiApiKey
          if (result.summaryLength) summaryLength = result.summaryLength
          if (result.summaryLang) summaryLang = result.summaryLang
          if (result.summaryFormat) summaryFormat = result.summaryFormat
        }
      )
    }
  })

  function saveSettings() {
    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      chrome.storage.sync.set(
        {
          geminiApiKey: apiKey.trim(),
          summaryLength: summaryLength,
          summaryLang: summaryLang,
          summaryFormat: summaryFormat,
        },
        () => {
          saveStatus = 'Đã lưu cài đặt!'
          setTimeout(() => (saveStatus = ''), 2000)
        }
      )
    } else {
      // Xử lý khi không có chrome.storage (ví dụ: môi trường dev)
      saveStatus = 'Lưu cài đặt thành công (giả lập)!'
      console.log('Lưu cài đặt:', {
        geminiApiKey: apiKey.trim(),
        summaryLength: summaryLength,
        summaryLang: summaryLang,
        summaryFormat: summaryFormat,
      })
      setTimeout(() => (saveStatus = ''), 2000)
    }
  }
</script>

<div class="p-4 border-l border-gray-200 h-full bg-gray-50 w-64 flex-shrink-0">
  <h2 class="text-lg font-semibold mb-4">Cài đặt</h2>
  <form>
    <div class="mb-4">
      <label for="api-key" class="block text-sm font-medium text-gray-700 mb-1"
        >Gemini API Key</label
      >
      <input
        type="password"
        id="api-key"
        bind:value={apiKey}
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        placeholder="Nhập API Key của bạn"
      />
    </div>

    <div class="mb-4">
      <label
        for="summary-length"
        class="block text-sm font-medium text-gray-700 mb-1"
        >Độ dài tóm tắt</label
      >
      <select
        id="summary-length"
        bind:value={summaryLength}
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        <option value="short">Ngắn</option>
        <option value="medium">Trung bình</option>
        <option value="long">Dài</option>
      </select>
    </div>

    <div class="mb-4">
      <label
        for="summary-lang"
        class="block text-sm font-medium text-gray-700 mb-1"
        >Ngôn ngữ tóm tắt</label
      >
      <select
        id="summary-lang"
        bind:value={summaryLang}
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        <option value="vi">Tiếng Việt</option>
        <option value="en">Tiếng Anh</option>
        <!-- Thêm các ngôn ngữ khác nếu cần -->
      </select>
    </div>

    <div class="mb-4">
      <label
        for="summary-format"
        class="block text-sm font-medium text-gray-700 mb-1"
        >Định dạng tóm tắt</label
      >
      <select
        id="summary-format"
        bind:value={summaryFormat}
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        <option value="paragraph">Đoạn văn</option>
        <option value="bullet">Gạch đầu dòng</option>
        <option value="heading">Cấp tiêu đề</option>
      </select>
    </div>

    <button
      type="button"
      onclick={saveSettings}
      class="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      Lưu cài đặt
    </button>

    {#if saveStatus}
      <p id="save-status" class="mt-3 text-sm text-green-600">{saveStatus}</p>
    {/if}
  </form>
</div>
