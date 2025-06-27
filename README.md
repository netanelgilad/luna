# AI Task Manager

A modern web application for managing AI-based tasks with an integrated chat interface. Built with Astro, React, and Tailwind CSS v4.

## Features

- 🤖 **AI Task Management**: Track tasks assigned to different AI assistants
- 💬 **Integrated Chat**: Converse with AI about each task directly in the UI
- 🔗 **Pull Request Integration**: View associated PRs with status indicators
- 🔍 **Search & Filter**: Find tasks quickly with search and status filters
- 📊 **Task Statistics**: Dashboard view of task statuses
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS v4

## Tech Stack

- **Framework**: [Astro](https://astro.build/) v5.x
- **UI Components**: React 18 with TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Alpha)
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Deployment**: Cloudflare Workers

## Tailwind CSS v4 Setup

This project uses Tailwind CSS v4 (alpha), which introduces a new architecture:

- No `tailwind.config.js` file needed
- Configuration via CSS using `@theme` directive
- Import syntax: `@import "tailwindcss"`
- Custom utilities defined with `@utility` directive

See `src/styles/tailwind-v4-theme.css` for theme customization examples.

## Getting Started

1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:4321](http://localhost:4321) in your browser

## Project Structure

```
src/
├── components/     # React components
│   ├── TaskManager.tsx
│   ├── TaskItem.tsx
│   └── ChatInterface.tsx
├── data/          # Mock data
│   └── mockData.ts
├── pages/         # Astro pages
│   └── index.astro
├── styles/        # Global styles
│   ├── global.css
│   └── tailwind-v4-theme.css
└── types/         # TypeScript types
    └── index.ts
```

## Development

The project includes a `.cursorrules` file with AI coding assistant guidelines specific to this Astro + Tailwind v4 setup.

## Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

For preview deployments:

```bash
npm run deploy:preview
```

```sh
npm create astro@latest -- --template minimal
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/minimal)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/minimal)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/minimal/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
