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
- **AI**: OpenAI (`gpt-6-luna`)
- **Scraping**: Cheerio, via Cloudflare Browser Rendering (Hansard sits behind Radware bot protection)
- **Deployment**: Cloudflare Workers (site + daily cron Worker)

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
- `pnpm cron:deploy` - Deploy the scraper cron Worker
- `pnpm cron:logs` - Tail the cron Worker's logs
- `node prepare-news.js <start> [end]` - Re-generate articles locally from files in `public/news/raw`

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

cron/                 # Cloudflare cron Worker: scrape → summarise → commit
lib/                  # Shared by the cron Worker and prepare-news.js
prepare-news.js       # Local AI news generation from raw transcripts
```

## Scraper (cron Worker)

`cron/` is a separate Worker (`paperboy-cron`) driven by Parliament's official [sitting calendar](https://www.parliament.nz/en/calendar/) (the open data feed behind its `.ics` export, cached in KV and refreshed weekly). Its cron fires at 20:00 UTC (8–9am NZ), but unless the House sat in the last 3 days it exits after a single KV read. On the mornings after a sitting it fetches each recent sitting day's transcript through Browser Rendering, summarises it with OpenAI, and commits the raw + processed JSON and `public/news/index.json` to `main`. The site's git-connected build then redeploys.

Secrets (`wrangler secret put <NAME> --config cron/wrangler.jsonc`): `OPENAI_API_KEY`, `GITHUB_TOKEN`, `DISCORD_ENDPOINT`, `RUN_SECRET`.

Manual runs and backfills (up to 3 articles per request, 31-day ranges):

```bash
curl -H "Authorization: Bearer $RUN_SECRET" "https://paperboy-cron.waltissomewhere.workers.dev/run?start=2026-09-01&end=2026-09-30"
```

Add `&dry=1` to fetch and parse without summarising or committing, or `&force=1` to regenerate dates that already have articles. `GET /calendar` shows the cached sitting calendar (`?refresh=1` refetches it).

## Contributing

This project was created by [Walter Lim](https://walt.online) and [Jonas Kuhn](https://www.linkedin.com/in/jonas-kuhn-99526350/).

## License

MIT
