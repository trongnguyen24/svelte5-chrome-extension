<script>
  import Icon from '@iconify/svelte'
  import Setting from './Setting.svelte'
  import { Dialog } from 'bits-ui'
  import { fade, fly } from 'svelte/transition'
  import { slideScaleFade } from '../lib/slideScaleFade'
  import '../app.css'
  import { onMount } from 'svelte'

  let currentLength = $state('')
  let currentFormat = $state('')
  let isOpen = $state(false)

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
      currentFormat = 'heading'
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
</script>

<div
  class="settingbar relative rounded-lg bg-surface-2/100 dark:bg-surface-1/50 border border-border dark:border-border/25 dark:border-t-border/100"
>
  <div class="flex text-muted">
    <div class="flex p-0.5 gap-0.5 border-r border-border/50">
      <button
        onclick={() => updateSetting('summaryLength', 'short')}
        class:active={currentLength === 'short'}
        title="Short summary"
      >
        <Icon width={16} icon="heroicons:minus-16-solid" />
      </button>
      <button
        onclick={() => updateSetting('summaryLength', 'medium')}
        class:active={currentLength === 'medium'}
        title="Medium summary"
      >
        <Icon width={16} icon="heroicons:bars-2-16-solid" />
      </button>
      <button
        onclick={() => updateSetting('summaryLength', 'long')}
        class:active={currentLength === 'long'}
        title="Long summary"
      >
        <Icon width={16} icon="heroicons:bars-3-16-solid" />
      </button>
    </div>
    <div class="flex p-0.5 gap-0.5 border-r border-border/50">
      <button
        onclick={() => updateSetting('summaryFormat', 'heading')}
        class:active={currentFormat === 'heading'}
        title="Heading format"
      >
        <Icon width={16} icon="heroicons:list-bullet-16-solid" />
      </button>
      <button
        onclick={() => updateSetting('summaryFormat', 'paragraph')}
        class:active={currentFormat === 'paragraph'}
        title="Paragraph format"
      >
        <Icon width={16} icon="heroicons:bars-4-16-solid" />
      </button>
    </div>
    <div class="flex p-0.5 gap-0.5">
      <button onclick={() => (isOpen = true)} title="Open settings">
        <Icon width={16} icon="heroicons:cog-6-tooth-16-solid" />
      </button>
    </div>
  </div>
</div>

<Dialog.Root bind:open={isOpen}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-40 bg-black/80" forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fade></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content
      forceMount
      class="outline-hidden fixed left-[50%] top-4 px-4 xs:px-8 max-w-2xl z-50 w-full translate-x-[-50%]"
    >
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:slideScaleFade>
            <div
              class="absolute z-50 right-7 xs:right-11 top-3 group flex gap-2"
            >
              <span class="block size-3 bg-surface-2 rounded-full"></span>
              <span class="block size-3 bg-surface-2 rounded-full"></span>
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button
                onclick={() => (isOpen = false)}
                class="block size-3 bg-error rounded-full"
              >
                <Icon
                  class="text-red-800 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  width={12}
                  icon="heroicons:x-mark-16-solid"
                />
              </button>
            </div>
            <Setting />
          </div>
        {/if}
      {/snippet}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
