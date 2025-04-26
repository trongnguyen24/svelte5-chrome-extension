<script>
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '../lib/slideScaleFade.js' // Assuming path is correct

  // Props nhận từ App.svelte (hoặc trực tiếp từ summaryStore nếu muốn)
  let { isLoading, isChapterLoading } = $props()

  // Event dispatcher để thông báo khi nút được click
  const dispatch = () => {
    const customEvent = new CustomEvent('summarizeClick')
    document.dispatchEvent(customEvent) // Dispatch to document or a specific element
  }
</script>

<div class="flex group relative size-12 rounded-full">
  <span
    class="absolute group-hover:-translate-y-0.5 transition-all duration-300 inset-0 z-0 animate-spin-slow-2"
  >
    <span
      class="absolute inset-0 rounded-full bg-conic from-border to-primary group-hover:brightness-150 transition-all duration-300 animate-spin-slow"
    ></span>
    <span
      class="absolute inset-0 rounded-full bg-conic from-transparent from-80% to-amber-400 group-hover:to-amber-50 transition-all duration-150 animate-spin-slow blur-[2px]"
    ></span>
  </span>
  <button
    onclick={dispatch}
    class="absolute z-10 inset-px text-primary bg-surface-1 group-hover:brightness-110 group-hover:shadow-lg group-hover:shadow-primary/30 group-hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center rounded-full disabled:cursor-progress"
    disabled={isLoading || isChapterLoading}
    title="Tóm tắt trang hiện tại"
  >
    <div class="relative size-6">
      {#if isLoading || isChapterLoading}
        <span transition:slideScaleFade>
          <Icon
            width={24}
            icon="svg-spinners:bouncing-ball"
            class="absolute inset-0"
          />
        </span>
      {:else}
        <span transition:slideScaleFade>
          <Icon
            class="translate-x-0.5 absolute inset-0"
            width={24}
            icon="heroicons:play-solid"
          />
        </span>
      {/if}
    </div>
  </button>
</div>
