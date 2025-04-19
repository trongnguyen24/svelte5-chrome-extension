<script>
  let name = 'world'
  let count = $state(0)
</script>

<div class="h-screen">
  <div class="flex h-full">
    <h1 class=" mx-auto text-xl">SuperSumaryyy</h1>
    <div class="mx-auto">
      <h1 class="text-3xl font-bold">Hello {name}!</h1>
      <button
        onclick={() => count++}
        class="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Click me
      </button>
      <p class="mt-4">You have clicked the button {count} times.</p>
      <p class="mt-4">This is a simple Svelte app.</p>
    </div>
  </div>
</div>
