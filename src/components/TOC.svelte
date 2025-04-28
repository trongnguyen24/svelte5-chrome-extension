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

    const foundHeadings = targetDiv.querySelectorAll('h1, h2, h3, h4, h5, h6')
    headings = Array.from(foundHeadings).map((heading) => {
      const text = heading.innerText
      const id = heading.id || generateId(text)
      heading.id = id // Ensure heading has an ID
      return { text, id, level: parseInt(heading.tagName.substring(1)) }
    })
  }

  function scrollToHeading(id) {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
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

  onDestroy(() => {
    if (observer) {
      observer.disconnect()
    }
  })
</script>

<nav class="p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
  <h2 class="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
    Mục lục
  </h2>
  <ul>
    {#each headings as heading}
      <li class="mb-1" style="margin-left: {(heading.level - 1) * 1}rem;">
        <a
          href="#{heading.id}"
          class="text-blue-600 hover:underline dark:text-blue-400"
        >
          {heading.text}
        </a>
      </li>
    {/each}
  </ul>
</nav>
