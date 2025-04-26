<script>
  import Icon from '@iconify/svelte'
  import { marked } from 'marked'

  // Props nhận từ App.svelte (hoặc trực tiếp từ summaryStore nếu muốn)
  let { chapterSummary, isChapterLoading, chapterError } = $props()
</script>

{#if isChapterLoading}
  <div class="text-center p-4 text-text-secondary animate-pulse">
    Đang tạo tóm tắt theo chapter...
  </div>
{/if}

{#if chapterError}
  <div
    class="flex gap-2 w-fit mx-auto text-orange-400 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg"
  >
    <Icon
      class="mt-0.5 flex-shrink-0"
      width={16}
      icon="heroicons:exclamation-triangle-16-solid"
    />
    <p class="text-sm">
      <span class="font-bold">Lỗi tóm tắt chapter:</span>
      {chapterError}
    </p>
  </div>
{/if}

{#if chapterSummary && !isChapterLoading}
  <div class="prose-sm sm:prose-base max-w-none">
    {@html marked.parse(chapterSummary)}
  </div>
{:else if !isChapterLoading && !chapterError}
  <!-- Có thể thêm placeholder nếu không có chapter summary và không lỗi -->
  <!-- <p class="text-text-secondary text-center italic">Chưa có tóm tắt chapter.</p> -->
{/if}
