# SQL Coder

A modern, interactive, web-based database schema designer and SQL generator. 

## Features

- **Visual Schema Design:** Create tables, define columns, and set data types using an intuitive drag-and-drop canvas.
- **Interactive Relationships:** Easily connect primary and foreign keys by dragging lines between columns.
- **AI Assistant:** Built-in AI chat that understands your current schema context and can help you optimize, normalize, or generate complex queries. Supports multiple providers (OpenAI, Anthropic, Groq, OpenRouter, Vercel AI Gateway).
- **Instant SQL Generation:** View the generated SQL for your schema in real-time.
- **Customizable Workspace:** Group tables, toggle grid views, adjust zoom levels, and customize the canvas background and fonts.
- **Dark Mode:** Full support for system, light, and dark themes.
- **Keyboard Navigation:** Command palette (press `/`) for quick actions.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS v4
- **State Management:** Zustand
- **Animations:** Framer Motion
- **UI Components:** Radix UI / shadcn/ui
- **Icons:** Phosphor Icons

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Deployment

This project is configured to be easily deployed on Vercel. 
A `vercel.json` file is included in the root directory to ensure smooth deployment.

## License

MIT
