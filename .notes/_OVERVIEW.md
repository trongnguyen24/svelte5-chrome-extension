```js
{
  name: "Homie"
  description: "Homie is a Chrome Extension enabling local-first AI agents for knowledge management."
  tags: ["Chrome Extension", "AI", "AI Agents", "Local-first", "Web Scraping", "Notes", "Knowledge Management", "Embeddings"],
  core_features: [
    {
      name: "Notes & Notebooks",
      description: "Homie allows you to take notes on any webpage, and it automatically saves them to your local storage. Organize your notes into notebooks, allowing you to group them by topic, project, or any other criteria.",
    },
    {
      name: "Writing Tools",
      description: "Homie provides a rich text editor that allows you to format your notes, add images, links, and more. It also provides a markdown editor for those who prefer to write in markdown.",
    },
    {
      name: "Integrations",
      description: "Homie can integrate with your favorite tools, such as Google Calendar, Google Drive, Slack, Notion, and more. This allows you to easily import data from these tools into Homie, and export data from Homie to these tools.",
    },
    {
      name: "Workflows",
      description: "Homie provides a spatial node-based interface for orchestrating how data moves between your notes, bookmarks, projects, people, places, events, and more. This allows you to create workflows that automate repetitive tasks and ensure that your data is always up-to-date.",
    },
    {
      name: "Chat",
      description: "Homie provides a chat interface that allows you to interact with your notes, trigger actions, and ask questions.",
    },
    {
      name: "Memory",
      description: "Homie uses AI to generate embeddings for your notes, which allows you to search them, retrieve them to ensure relevance and context.",
    },
    {
      name: "Web Scraping",
      description: "Homie provides a web scraping tool that allows you to extract structured data from web pages. Homie can visualize this data, and the user can export it as CSV/JSON/etc.",
    },
    {
      name: "Knowledge Graph",
      description: "Homie uses the extracted data to build a knowledge graph that helps you visualize the relationships between your notes, bookmarks, projects, people, places, events, and more. This personal database is highly configurable through a simple interface. It can be managed either manually by the user, or automatically in the chat interface.",
    },
    {
      name: "Privacy",
      description: "Homie is a local-first application, which means that your data never leaves your device.",
    },
  ],
  stack: {
    frontend: [
      "Svelte5",
      "TypeScript",
      "TailwindCSS",
      "DaisyUI",
    ],
      backend: [
        "Gemini Nano"
      ],
    chromePermissions: [
    "ttsEngine",
    "history",
    "tabs",
    "activeTab",
    "storage",
    "bookmarks",
    "aiLanguageModelOriginTrial",
    "sidePanel"
    ],
  }
}
```
