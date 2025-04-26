<script>
  import Icon from '@iconify/svelte'
  import { marked } from 'marked'

  // Props nhận từ App.svelte (hoặc trực tiếp từ summaryStore nếu muốn)
  let { summary, isLoading, error } = $props()
</script>

{#if isLoading}
  <div class="text-center p-4 text-text-secondary animate-pulse">
    Đang xử lý tóm tắt chính...
  </div>
{/if}

{#if error}
  <div
    class="flex gap-2 w-fit mx-auto text-red-400 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
  >
    <Icon
      class="mt-0.5 flex-shrink-0"
      width={16}
      icon="heroicons:exclamation-circle-16-solid"
    />
    <p class="text-sm">
      <span class="font-bold">Lỗi tóm tắt chính:</span>
      {error}
    </p>
  </div>
{/if}

{#if summary && !isLoading}
  <div class="prose-sm sm:prose-base max-w-none">
    {@html marked.parse(summary)}
  </div>
{:else if !isLoading && !error}
  <!-- Có thể thêm placeholder nếu không có summary và không lỗi -->
  <!-- <p class="text-text-secondary text-center italic">Chưa có tóm tắt.</p> -->
{/if}
