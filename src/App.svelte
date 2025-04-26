<script>
  import Settingbar from './components/Settingbar.svelte'
  import SummarizeButton from './components/SummarizeButton.svelte' // Import new component
  import TabNavigation from './components/TabNavigation.svelte' // Import new component
  import SummaryDisplay from './components/SummaryDisplay.svelte' // Import new component
  import ChapterDisplay from './components/ChapterDisplay.svelte' // Import new component

  import { summaryStore } from './stores/summaryStore.svelte.js' // Import the summaryStore object

  // State for UI tabs
  let activeTab = $state('summary')

  // Handle tab change event from TabNavigation
  document.addEventListener('summarizeClick', summaryStore.fetchAndSummarize) // Listen for click event from SummarizeButton
  document.addEventListener('tabChange', (event) => {
    activeTab = event.detail
  })

  // Removed: textToSummarize, local summary/loading/error states, theme logic,
  // ensureContentScriptInjected, handleSummarizeText, OverlayScrollbars, onMount/onDestroy related to them.

  // Removed: textToSummarize, local summary/loading/error states, theme logic,
  // ensureContentScriptInjected, handleSummarizeText, OverlayScrollbars, onMount/onDestroy related to them.
</script>

<div class="bg-background min-h-screen xs:px-8 xs:pb-32 pt-40">
  <!-- Main Content -->
  <div class="max-w-2xl mx-auto flex flex-col">
    <div
      class="px-4 py-16 fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl z-10 xs:px-8 flex items-center justify-between header-animation"
    >
      <!-- Use SummarizeButton component -->
      <SummarizeButton
        isLoading={summaryStore.isLoading}
        isChapterLoading={summaryStore.isChapterLoading}
      />
      <div class="flex"><Settingbar /></div>
    </div>

    <div
      class="relative z-10 flex flex-col gap-6 pt-4"
      class:mt-[-4rem]={!summaryStore.summary &&
        !summaryStore.error &&
        !summaryStore.chapterSummary &&
        !summaryStore.chapterError &&
        !summaryStore.isLoading &&
        !summaryStore.isChapterLoading}
    >
      {#if summaryStore.isLoading || summaryStore.isChapterLoading || summaryStore.summary || summaryStore.chapterSummary || summaryStore.error || summaryStore.chapterError}
        <div
          class="px-4 xs:px-0 flex justify-center mb-[-1.5rem] relative z-10"
        >
          <!-- Use TabNavigation component -->
          <TabNavigation
            {activeTab}
            isYouTubeVideoActive={summaryStore.isYouTubeVideoActive}
            chapterSummary={summaryStore.chapterSummary}
            isChapterLoading={summaryStore.isChapterLoading}
            chapterError={summaryStore.chapterError}
          />
        </div>

        <div
          class="p-4 xs:p-8 pb-20 prose w-full max-w-2xl bg-surface-1 border border-border/25 border-t-white dark:border-t-neutral-600 xs:shadow-lg xs:rounded-xl min-h-[10rem]"
        >
          {#if activeTab === 'summary'}
            <!-- Use SummaryDisplay component -->
            <SummaryDisplay
              summary={summaryStore.summary}
              isLoading={summaryStore.isLoading}
              error={summaryStore.error}
            />
          {:else if activeTab === 'chapters'}
            <!-- Use ChapterDisplay component -->
            <ChapterDisplay
              chapterSummary={summaryStore.chapterSummary}
              isChapterLoading={summaryStore.isChapterLoading}
              chapterError={summaryStore.chapterError}
            />
          {/if}
        </div>
      {/if}
    </div>
  </div>
  <div
    class="fixed bg-linear-to-t from-background to-background/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-30 pointer-events-none"
  ></div>
  <div class="fixed z-50 top-0 right-0"></div>
</div>
