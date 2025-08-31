# Paperboy

The latest political news from New Zealand, freshly squeezed from parliament.

Paperboy automatically scrapes and analyzes New Zealand parliamentary transcripts using AI to generate digestible news summaries, providing people with insights into what's happening with government.

## Features

- **Automated News Generation**: Scrapes parliamentary transcripts and generates news articles using AI
- **Real-time Updates**: Displays the latest political developments as they happen
- **Topic Categorization**: Organizes news by political topics and themes
- **Responsive Design**: Modern, mobile-first interface with WebGL plasma background
- **Parliament Countdown**: Live countdown to when Parliament resumes sessions

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Graphics**: WebGL (OGL) for animated backgrounds
- **AI**: LangChain with multiple AI providers (OpenAI, Anthropic, Google, xAI)
- **Scraping**: Cheerio + Playwright for web scraping
- **Deployment**: Cloudflare Workers

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```
4. Open your browser at http://localhost:5173

## Scripts

- `pnpm dev` - Start the development server
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm preview` - Preview the production build
- `node scraper.js` - Run the parliamentary transcript scraper
- `node prepare-news.js` - Generate news articles from scraped data

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── Home.tsx        # Main homepage with news feed
│   ├── ArticleDetail.tsx # Individual article view
│   ├── Plasma.tsx      # WebGL background component
│   └── ...
├── lib/                # Utility functions
└── App.tsx            # Main app component

public/
├── news/              # Generated news articles (JSON)
└── fonts/             # Custom fonts

paperboy-worker/       # Cloudflare Worker for backend
scraper.js            # Parliamentary transcript scraper
prepare-news.js       # AI news generation script
```

## Contributing

This project was created by [Walter Lim](https://walt.online) and [Jonas Kuhn](https://www.linkedin.com/in/jonas-kuhn-99526350/).

## License

MIT
