# Schema Pad

A modern, interactive, web-based database schema designer and SQL generator.

## Features

- **Visual schema design:** Create tables, define columns, and set data types on an intuitive canvas.
- **Interactive relationships:** Connect primary and foreign keys by drawing lines between columns.
- **AI assistant:** Chat that understands your current schema context and can help you optimize, normalize, or reason about your design. Supports multiple providers (OpenAI, Groq, OpenRouter, Vercel AI Gateway, and custom endpoints).
- **Instant SQL generation:** View generated SQL for your schema in real time.
- **Customizable workspace:** Group tables, toggle the grid, adjust zoom, and customize canvas background and fonts.
- **Dark mode:** System, light, and dark themes.
- **Keyboard navigation:** Command palette (press `/`) for quick actions.

## Tech stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Animation:** Framer Motion
- **UI:** Radix UI / shadcn-style components
- **Icons:** Phosphor Icons

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run the dev server**

   ```bash
   npm run dev
   ```

3. **Open in the browser**

   [http://localhost:3000](http://localhost:3000)

## Deployment

The project is set up for deployment on Vercel; see `vercel.json` in the repo root.

## License

MIT
