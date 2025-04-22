<script>
  import Icon from '@iconify/svelte'
  import Settingpopup from './Settingpopup.svelte'
  import '../app.css'
  import { onMount } from 'svelte'

  let currentLength = $state('')
  let currentFormat = $state('')
  let isSettingPopupOpen = $state(false)

  onMount(() => {
    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      chrome.storage.sync.get(['summaryLength', 'summaryFormat'], (result) => {
        if (result.summaryLength) currentLength = result.summaryLength
        if (result.summaryFormat) currentFormat = result.summaryFormat
      })

      // Lắng nghe sự thay đổi từ storage để cập nhật UI nếu cần
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
          if (changes.summaryLength) {
            currentLength = changes.summaryLength.newValue
          }
          if (changes.summaryFormat) {
            currentFormat = changes.summaryFormat.newValue
          }
        }
      })
    } else {
      console.warn('Chrome storage API không khả dụng.')
      // Có thể set giá trị mặc định ở đây nếu cần cho môi trường dev
      currentLength = 'medium'
      currentFormat = 'bullet'
    }
  })

  function updateSetting(key, value) {
    if (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync
    ) {
      chrome.storage.sync.set({ [key]: value }, () => {
        // console.log(`Đã cập nhật ${key} thành ${value}`);
        // State sẽ tự cập nhật nhờ listener ở onMount
      })
    } else {
      console.warn('Chrome storage API không khả dụng. Mô phỏng cập nhật.')
      if (key === 'summaryLength') currentLength = value
      if (key === 'summaryFormat') currentFormat = value
    }
  }

  function openSettings() {
    isSettingPopupOpen = true
  }
</script>

<div
  class="settingbar relative rounded-lg bg-surface-1/50 border border-border/25 border-t-border/70"
>
  <div class="flex text-muted">
    <div class="flex p-0.5 gap-0.5 border-r border-border/50">
      <button
        onclick={() => updateSetting('summaryLength', 'short')}
        class:active={currentLength === 'short'}
        title="Tóm tắt ngắn"
      >
        <Icon width={16} icon="heroicons:minus-16-solid" />
      </button>
      <button
        onclick={() => updateSetting('summaryLength', 'medium')}
        class:active={currentLength === 'medium'}
        title="Tóm tắt trung bình"
      >
        <Icon width={16} icon="heroicons:bars-2-16-solid" />
      </button>
      <button
        onclick={() => updateSetting('summaryLength', 'long')}
        class:active={currentLength === 'long'}
        title="Tóm tắt dài"
      >
        <Icon width={16} icon="heroicons:bars-3-16-solid" />
      </button>
    </div>
    <div class="flex p-0.5 gap-0.5 border-r border-border/50">
      <button
        onclick={() => updateSetting('summaryFormat', 'heading')}
        class:active={currentFormat === 'heading'}
        title="Định dạng tiêu đề cấp độ"
      >
        <Icon width={16} icon="heroicons:list-bullet-16-solid" />
      </button>
      <button
        onclick={() => updateSetting('summaryFormat', 'paragraph')}
        class:active={currentFormat === 'paragraph'}
        title="Định dạng đoạn văn"
      >
        <Icon width={16} icon="heroicons:bars-4-16-solid" />
      </button>
    </div>
    <div class="flex p-0.5 gap-0.5">
      <button onclick={openSettings} title="Mở cài đặt">
        <Icon width={16} icon="heroicons:cog-6-tooth-16-solid" />
      </button>
    </div>
  </div>
  <Settingpopup bind:open={isSettingPopupOpen} />
</div>

<style>
</style>
