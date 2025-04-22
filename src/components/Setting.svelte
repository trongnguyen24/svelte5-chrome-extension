<script>
  import { onMount } from 'svelte'
  import Icon from '@iconify/svelte' // Import Icon

  let apiKey = $state('')
  let summaryLength = $state('medium')
  let summaryLang = $state('vi') // Changed default to 'vi' to match options
  let summaryFormat = $state('paragraph') // Changed default to 'paragraph' to match options
  let saveStatus = $state('')

  // --- Refactored Button Classes ---
  // Base classes common to all buttons (excluding padding and hover background)
  const buttonBase =
    'rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors'
  // Classes for active buttons
  const activeBtnClasses = 'bg-blue-500 text-white hover:bg-blue-600'
  // Classes for inactive buttons (including hover)
  const inactiveBtnClasses = 'hover:bg-surface-2'
  // Helper function to get conditional classes
  function getButtonClasses(isActive) {
    return isActive ? activeBtnClasses : inactiveBtnClasses
  }
  // --- End Refactored Button Classes ---

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
          // Ensure defaults are set if nothing is in storage yet
          summaryLength = result.summaryLength || 'medium'
          summaryLang = result.summaryLang || 'vi'
          summaryFormat = result.summaryFormat || 'paragraph'
        }
      )
    } else {
      console.warn('Chrome storage API không khả dụng.')
      // Set defaults for dev environment
      summaryLength = 'medium'
      summaryLang = 'vi'
      summaryFormat = 'paragraph'
    }
  })

  function updateSetting(key, value) {
    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      chrome.storage.sync.set({ [key]: value }, () => {
        // Update local state immediately for reactivity
        if (key === 'summaryLength') summaryLength = value
        if (key === 'summaryLang') summaryLang = value
        if (key === 'summaryFormat') summaryFormat = value
        // Optionally show a temporary confirmation, similar to saveStatus
        // saveStatus = `Đã cập nhật ${key}!`;
        // setTimeout(() => saveStatus = '', 1500);
        console.log(`Đã cập nhật ${key} thành ${value}`)
      })
    } else {
      console.warn('Chrome storage API không khả dụng. Mô phỏng cập nhật.')
      if (key === 'summaryLength') summaryLength = value
      if (key === 'summaryLang') summaryLang = value
      if (key === 'summaryFormat') summaryFormat = value
    }
  }

  function saveApiKey() {
    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      chrome.storage.sync.set({ geminiApiKey: apiKey.trim() }, () => {
        saveStatus = 'Đã lưu API Key!'
        setTimeout(() => (saveStatus = ''), 2000)
      })
    } else {
      saveStatus = 'Lưu API Key thành công (giả lập)!'
      console.log('Lưu API Key:', apiKey.trim())
      setTimeout(() => (saveStatus = ''), 2000)
    }
  }
</script>

<!-- Apply Tailwind classes for overall layout and styling -->
<div
  class="p-4 bg-surface-1 border-t border-border/50 rounded-2xl w-full flex-shrink-0 flex flex-col gap-5"
>
  <h2 class="text-lg font-semibold text-text-base">Cài đặt</h2>

  <!-- API Key Section -->
  <div class="flex flex-col gap-1">
    <label for="api-key" class="block text-sm font-medium text-text-muted"
      >Gemini API Key</label
    >
    <input
      type="password"
      id="api-key"
      bind:value={apiKey}
      class="w-full px-3 py-1.5 bg-surface-input border border-border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-text-base placeholder:text-text-muted"
      placeholder="Nhập API Key của bạn"
    />
    <button
      type="button"
      onclick={saveApiKey}
      class="mt-1 w-full bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-surface-1 focus:ring-blue-500 text-sm"
    >
      Lưu API Key
    </button>
  </div>

  <!-- Summary Length Section -->
  <div class="flex flex-col gap-1">
    <label class="block text-sm font-medium text-text-muted"
      >Độ dài tóm tắt</label
    >
    <div
      class="flex p-0.5 gap-1 bg-surface-2 border border-border/50 rounded-md w-fit"
    >
      <button
        onclick={() => updateSetting('summaryLength', 'short')}
        class="p-1.5 {buttonBase} {getButtonClasses(summaryLength === 'short')}"
        title="Ngắn"
      >
        <Icon width={18} icon="heroicons:minus" />
      </button>
      <button
        onclick={() => updateSetting('summaryLength', 'medium')}
        class="p-1.5 {buttonBase} {getButtonClasses(
          summaryLength === 'medium'
        )}"
        title="Trung bình"
      >
        <Icon width={18} icon="heroicons:bars-2" />
      </button>
      <button
        onclick={() => updateSetting('summaryLength', 'long')}
        class="p-1.5 {buttonBase} {getButtonClasses(summaryLength === 'long')}"
        title="Dài"
      >
        <Icon width={18} icon="heroicons:bars-3" />
      </button>
    </div>
  </div>

  <!-- Summary Language Section -->
  <div class="flex flex-col gap-1">
    <label class="block text-sm font-medium text-text-muted"
      >Ngôn ngữ tóm tắt</label
    >
    <div
      class="flex p-0.5 gap-1 bg-surface-2 border border-border/50 rounded-md w-fit"
    >
      <button
        onclick={() => updateSetting('summaryLang', 'vi')}
        class="px-2.5 py-1.5 {buttonBase} {getButtonClasses(
          summaryLang === 'vi'
        )}"
        title="Tiếng Việt"
      >
        VI
      </button>
      <button
        onclick={() => updateSetting('summaryLang', 'en')}
        class="px-2.5 py-1.5 {buttonBase} {getButtonClasses(
          summaryLang === 'en'
        )}"
        title="Tiếng Anh"
      >
        EN
      </button>
      <!-- Thêm nút cho ngôn ngữ khác nếu cần -->
    </div>
  </div>

  <!-- Summary Format Section -->
  <div class="flex flex-col gap-1">
    <label class="block text-sm font-medium text-text-muted"
      >Định dạng tóm tắt</label
    >
    <div
      class="flex p-0.5 gap-1 bg-surface-2 border border-border/50 rounded-md w-fit"
    >
      <button
        onclick={() => updateSetting('summaryFormat', 'paragraph')}
        class="p-1.5 {buttonBase} {getButtonClasses(
          summaryFormat === 'paragraph'
        )}"
        title="Đoạn văn"
      >
        <Icon width={18} icon="heroicons:bars-4" />
      </button>
      <button
        onclick={() => updateSetting('summaryFormat', 'heading')}
        class="p-1.5 {buttonBase} {getButtonClasses(
          summaryFormat === 'heading'
        )}"
        title="Cấp tiêu đề"
      >
        <Icon width={18} icon="mdi:format-header-pound" />
      </button>
    </div>
  </div>

  {#if saveStatus}
    <p id="save-status" class="mt-auto text-sm text-green-600 text-center">
      {saveStatus}
    </p>
  {/if}
</div>

<style>
  /* Remove unused .active class if present */
  /* Tailwind handles the active state visually now */
</style>
