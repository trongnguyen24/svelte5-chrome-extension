<script>
  import { onMount, onDestroy } from 'svelte'

  const { targetDivId } = $props()

  let headings = $state([])
  let observer

  const delay = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  function generateId(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  function updateTOC() {
    const targetDiv = document.getElementById(targetDivId)
    if (!targetDiv) {
      console.warn(`Target div with ID "${targetDivId}" not found.`)
      headings = []
      return
    }

    const foundHeadings = targetDiv.querySelectorAll('h3')
    headings = Array.from(foundHeadings).map((heading) => {
      let text = heading.innerText
      // Remove trailing colon if present
      if (text.endsWith(':')) {
        text = text.slice(0, -1)
      }
      const id = heading.id || generateId(text)
      heading.id = id // Ensure heading has an ID
      return { text, id, level: parseInt(heading.tagName.substring(1)) }
    })
  }

  function scrollToHeading(id) {
    const element = document.getElementById(id)
    if (element) {
      // element.scrollIntoView({ behavior: 'smooth' })
      // Add animate-pulse class and remove after 3 seconds
      element.classList.add('animate-pulse')
      setTimeout(() => {
        element.classList.remove('animate-pulse')
      }, 4000)
    }
  }

  onMount(async () => {
    // Thêm delay để đảm bảo DOM đã render
    await delay(500) // Có thể điều chỉnh thời gian delay nếu cần

    updateTOC()

    // Optional: Observe changes in the target div to update TOC dynamically
    const targetDiv = document.getElementById(targetDivId)
    if (targetDiv) {
      observer = new MutationObserver(updateTOC)
      observer.observe(targetDiv, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    }
  })
</script>

<div class="fixed z-20 right-3 top-40">
  <div class="flex hidden flex-col gap-2">
    {#each headings as heading}
      <span
        class="w-2 flex justify-center items-center h-0.5 bg-white rounded-2xl"
      >
        <span class="w-2 block blur-[1px] h-0.5 rounded-full bg-white"> </span>
      </span>
    {/each}
  </div>
  <nav
    class="p-4 w-64 shadow-2xl border border-border bg-surface-1/90 dark:bg-surface-1/90 backdrop-blur-2xl rounded-md"
  >
    <div class="flex flex-col divide-y divide-border">
      {#each headings as heading}
        <a
          href="#{heading.id}"
          onclick={() => scrollToHeading(heading.id)}
          class="text-text-secondary block py-2 font-mono text-xs/4 no-underline line-clamp-2 hover:text-text-primary transition-colors"
        >
          {heading.text}
        </a>
      {/each}
    </div>
  </nav>
</div>
