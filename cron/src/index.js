// Paperboy cron Worker: the morning after the House sits (per Parliament's
// official sitting calendar), find recent sitting days that have no article
// yet, summarise them with OpenAI, and commit the raw + processed JSON (and the
// updated index) to GitHub. The site's git-connected build then redeploys with
// the new articles.
//
// hansard.parliament.nz and www.parliament.nz sit behind Radware bot
// protection, so transcripts and the calendar are fetched from inside a
// Browser Rendering session that has passed the challenge.
import puppeteer from '@cloudflare/puppeteer';
import { HANSARD_ORIGIN, transcriptApiPath, parseNewsArticle } from '../../lib/hansard.js';
import { buildPrompt, parseArticleJson } from '../../lib/prompt.js';
import { generateWithOpenAI, OPENAI_MODEL } from '../../lib/ai-model.js';
import { readRepoFile, commitFiles } from '../../lib/github.js';
import { sendDiscordWebhook } from '../../lib/discord.js';

// How far back to look for sitting days that are missing an article
const LOOKBACK_DAYS = 14;
// Each summary is a long OpenAI call; cap per run to stay well inside the
// 15 minute cron limit. Anything left over is picked up by the next run.
const MAX_ARTICLES_PER_RUN = 3;
// Transcripts are published progressively. Only summarise a day once the
// "House adjourned" line is present, unless it is old enough to be final.
const ADJOURNED_PATTERN = /The House adjourned at/i;
const ASSUME_COMPLETE_AFTER_DAYS = 3;
// The scheduled run only does work if the House sat within this many days,
// which gives incomplete transcripts until ASSUME_COMPLETE_AFTER_DAYS to finish
const RECENT_SITTING_DAYS = 3;

// Parliament's open data sitting calendar (the source of its .ics export),
// cached in KV and refreshed when older than CALENDAR_MAX_AGE_DAYS
const SITTING_CALENDAR_URL = 'https://www.parliament.nz/api/opendata/calendar/housesitting';
const CALENDAR_KEY = 'sitting-calendar';
const CALENDAR_MAX_AGE_DAYS = 6;

const NEWS_DIR = 'public/news';
const INDEX_PATH = `${NEWS_DIR}/index.json`;
// Upcoming sittings for the site's countdown
const SITE_CALENDAR_PATH = 'public/sitting-calendar.json';

// Today's date in New Zealand as YYYY-MM-DD
function nzToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(new Date());
}

function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function daysBetween(from, to) {
  return Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000);
}

function getDatesInRange(start, end) {
  const dates = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    dates.push(d);
  }
  return dates;
}

function formatDate(date) {
  return date.replace(/-/g, '');
}

function truncate(text, length = 300) {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

async function withBrowser(env, fn) {
  const browser = await puppeteer.launch(env.BROWSER);
  try {
    return await fn(await browser.newPage());
  } finally {
    await browser.close();
  }
}

// Navigate and wait for the Radware challenge page to solve itself and load
// the real content, as judged by isReady(page)
async function gotoPastChallenge(page, url, isReady) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (await isReady(page).catch(() => false)) return;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  const title = await page.title().catch(() => '');
  throw new Error(`Radware challenge did not clear for ${url} (page title: "${title}")`);
}

// Call the transcript API from inside a hansard.parliament.nz page for each
// date. Returns Map<date, html|null>.
async function fetchTranscripts(page, dates) {
  await gotoPastChallenge(page, `${HANSARD_ORIGIN}/`, async p => {
    const title = await p.title();
    return Boolean(title) && !/radware/i.test(title);
  });

  const transcripts = new Map();
  for (const date of dates) {
    const result = await page.evaluate(async (apiPath) => {
      const response = await fetch(apiPath, { headers: { Accept: 'application/json' } });
      return {
        status: response.status,
        contentType: response.headers.get('content-type') || '',
        body: await response.text()
      };
    }, transcriptApiPath(date));

    if (result.status !== 200 || !result.contentType.includes('application/json')) {
      throw new Error(`Hansard API returned ${result.status} ${result.contentType} for ${date} (blocked?)`);
    }

    // The endpoint returns the transcript HTML as a JSON-encoded string,
    // or the literal `null` for non-sitting days.
    const html = JSON.parse(result.body);
    transcripts.set(date, typeof html === 'string' && html.trim() ? html : null);
  }
  return transcripts;
}

// Convert a New Zealand wall-clock date + time to a UTC ISO string
function nzTimeToIso(date, time) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wallClockAsUtc = Date.UTC(y, m - 1, d, hh, mm);
  const offsetAt = (instant) => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: 'Pacific/Auckland', hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'
    }).formatToParts(new Date(instant)).map(part => [part.type, Number(part.value)]));
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - instant;
  };
  // Two passes settle the offset either side of a daylight saving change
  let instant = wallClockAsUtc - offsetAt(wallClockAsUtc);
  instant = wallClockAsUtc - offsetAt(instant);
  return new Date(instant).toISOString();
}

// Fetch the official House sittings from a month ago to a year ahead.
// Returns sittings sorted by start, [{ date, start, end, title }] with start
// and end as UTC ISO strings. A day with extended hours or urgency can have
// more than one sitting.
async function fetchSittingCalendar(page) {
  const today = nzToday();
  const url = `${SITTING_CALENDAR_URL}?startDate=${addDays(today, -31)}&endDate=${addDays(today, 365)}`;
  const readJson = () => page.evaluate(() => document.body?.innerText?.trim() || '');
  await gotoPastChallenge(page, url, async () => (await readJson()).startsWith('['));

  const entries = JSON.parse(await readJson());
  return entries
    .map(entry => {
      const date = entry.date.slice(0, 10);
      return {
        date,
        start: nzTimeToIso(date, entry.start),
        end: nzTimeToIso(date, entry.end),
        title: entry.title
      };
    })
    .sort((x, y) => x.start.localeCompare(y.start));
}

// Commit the sittings for the site's countdown, only when they have changed
async function publishSittingCalendar(env, sittings) {
  const github = { token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO };
  const content = JSON.stringify({ sittings }, null, 2);
  if ((await readRepoFile(github, SITE_CALENDAR_PATH)) === content) return;
  await commitFiles(github, [{ path: SITE_CALENDAR_PATH, content }], 'Update Parliament sitting calendar');
}

// The cached calendar, refreshed from parliament.nz when missing or stale
async function getSittingCalendar(env, { refresh = false } = {}) {
  const cached = await env.CACHE.get(CALENDAR_KEY, 'json');
  const ageDays = cached ? (Date.now() - Date.parse(cached.fetchedAt)) / 86400000 : Infinity;
  if (!refresh && cached?.sittings && ageDays <= CALENDAR_MAX_AGE_DAYS) {
    return cached;
  }

  const sittings = await withBrowser(env, fetchSittingCalendar);
  const calendar = {
    fetchedAt: new Date().toISOString(),
    dates: [...new Set(sittings.map(sitting => sitting.date))],
    sittings
  };
  await env.CACHE.put(CALENDAR_KEY, JSON.stringify(calendar));

  try {
    await publishSittingCalendar(env, sittings);
  } catch (error) {
    // The scrape does not depend on this; the next refresh will retry
    console.error('Publishing sitting calendar failed:', error.message);
  }
  return calendar;
}

// Scrape, summarise, and commit the given dates. With dryRun, stops after
// parsing and reports what would be summarised.
async function run(env, dates, { dryRun = false, force = false, limit = MAX_ARTICLES_PER_RUN } = {}) {
  const github = { token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO };
  const today = nzToday();
  const report = {
    dateRange: dates.length === 1 ? dates[0] : `${dates[0]} to ${dates[dates.length - 1]}`,
    model: OPENAI_MODEL,
    dryRun,
    successfulDates: [],
    failedDates: [],
    skipped: [],
    errors: [],
    articlesProcessed: 0,
    totalFiles: 0
  };

  const index = JSON.parse((await readRepoFile(github, INDEX_PATH)) || '[]');
  const pending = dates.filter(date => force || !index.includes(`${formatDate(date)}.json`));
  report.totalFiles = index.length;

  if (pending.length === 0) {
    report.skipped.push('All dates already have articles');
    return report;
  }

  const transcripts = await withBrowser(env, page => fetchTranscripts(page, pending));
  const files = [];
  const newIndexEntries = [];

  for (const date of pending) {
    const html = transcripts.get(date);
    if (!html) continue; // not a sitting day, or not published yet

    if (!ADJOURNED_PATTERN.test(html) && daysBetween(date, today) < ASSUME_COMPLETE_AFTER_DAYS) {
      report.skipped.push(`${date}: transcript not complete yet`);
      continue;
    }

    if (report.successfulDates.length >= limit) {
      report.skipped.push(`${date}: deferred to next run`);
      continue;
    }

    try {
      const article = parseNewsArticle(html, date);
      if (article.content.length === 0) {
        throw new Error('transcript had no parseable content');
      }

      if (dryRun) {
        report.successfulDates.push(date);
        report.skipped.push(`${date}: dry run — ${article.content.length} items, ${article.topicSummaries.length} topics, ${article.fullContent.length} chars`);
        continue;
      }

      const responseText = await generateWithOpenAI(buildPrompt(article, date), env.OPENAI_API_KEY);
      const processedArticle = parseArticleJson(responseText);

      const fileName = `${formatDate(date)}.json`;
      files.push({ path: `${NEWS_DIR}/raw/${fileName}`, content: JSON.stringify([article], null, 2) });
      files.push({ path: `${NEWS_DIR}/${fileName}`, content: JSON.stringify(processedArticle, null, 2) });
      newIndexEntries.push(fileName);

      report.successfulDates.push(date);
      report.articlesProcessed++;
    } catch (error) {
      console.error(`Error processing ${date}:`, error.message);
      report.failedDates.push(date);
      report.errors.push(truncate(`${date}: ${error.message}`));
    }
  }

  if (files.length > 0) {
    const newIndex = [...new Set([...index, ...newIndexEntries])].sort().reverse();
    files.push({ path: INDEX_PATH, content: JSON.stringify(newIndex, null, 2) });
    report.totalFiles = newIndex.length;

    try {
      const commitMessage = `Add Hansard articles for ${report.successfulDates.join(', ')} - ${report.articlesProcessed} articles processed`;
      const sha = await commitFiles(github, files, commitMessage);
      report.githubPushed = true;
      report.commit = sha;
    } catch (error) {
      report.githubPushed = false;
      report.errors.push(truncate(`GitHub push: ${error.message}`));
    }
  }

  return report;
}

function overallStatus(report) {
  if (report.errors.length > 0 && report.articlesProcessed === 0) return 'failed';
  if (report.errors.length > 0) return 'partial';
  return 'success';
}

// Only notify Discord when something happened, so quiet days stay quiet
async function notify(env, report) {
  if (report.dryRun || (report.articlesProcessed === 0 && report.errors.length === 0)) return;
  await sendDiscordWebhook(env.DISCORD_ENDPOINT, overallStatus(report), report);
}

async function runAndNotify(env, dates, options) {
  let report;
  try {
    report = await run(env, dates, options);
  } catch (error) {
    report = {
      dateRange: `${dates[0]} to ${dates[dates.length - 1]}`,
      dryRun: options?.dryRun,
      errors: [truncate(error.message)],
      failedDates: [],
      articlesProcessed: 0
    };
  }
  console.log(JSON.stringify(report));
  await notify(env, report);
  return report;
}

export default {
  // Daily, but only does real work the morning(s) after the House sits: the
  // cached official calendar decides, then only sitting days are fetched.
  async scheduled(controller, env, ctx) {
    const today = nzToday();

    let calendar;
    try {
      calendar = await getSittingCalendar(env);
    } catch (error) {
      // Keep going on a stale calendar rather than missing a sitting day
      calendar = await env.CACHE.get(CALENDAR_KEY, 'json');
      console.error('Sitting calendar refresh failed:', error.message);
      if (!calendar) {
        await notify(env, {
          dateRange: today,
          errors: [truncate(`Sitting calendar: ${error.message}`)],
          failedDates: [],
          articlesProcessed: 0
        });
        return;
      }
    }

    const recentSittings = calendar.dates.filter(date =>
      date < today && date >= addDays(today, -RECENT_SITTING_DAYS));
    if (recentSittings.length === 0) {
      console.log(`No House sitting in the last ${RECENT_SITTING_DAYS} days, nothing to do`);
      return;
    }

    const sittingDates = calendar.dates.filter(date =>
      date < today && date >= addDays(today, -LOOKBACK_DAYS));
    await runAndNotify(env, sittingDates);
  },

  // Authenticated manual endpoints (Authorization: Bearer <RUN_SECRET>):
  //   GET /run?start=YYYY-MM-DD[&end=YYYY-MM-DD][&dry=1][&force=1][&limit=N]
  //     Scrape and summarise a date range, for backfills and testing.
  //     limit (max 10) overrides the per-run article cap.
  //   GET /calendar[?refresh=1]
  //     Show the cached sitting calendar, optionally refetching it
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!env.RUN_SECRET || request.headers.get('Authorization') !== `Bearer ${env.RUN_SECRET}`) {
      return new Response('Not found', { status: 404 });
    }

    if (url.pathname === '/calendar') {
      const calendar = await getSittingCalendar(env, { refresh: url.searchParams.get('refresh') === '1' });
      return Response.json(calendar);
    }

    if (url.pathname !== '/run') {
      return new Response('Not found', { status: 404 });
    }

    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end') || start;
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(start || '') || !datePattern.test(end) || start > end) {
      return new Response('Usage: /run?start=YYYY-MM-DD[&end=YYYY-MM-DD][&dry=1][&force=1]', { status: 400 });
    }
    if (daysBetween(start, end) > 31) {
      return new Response('Date range is limited to 31 days per request', { status: 400 });
    }

    const report = await runAndNotify(env, getDatesInRange(start, end), {
      dryRun: url.searchParams.get('dry') === '1',
      force: url.searchParams.get('force') === '1',
      limit: Math.min(Number(url.searchParams.get('limit')) || MAX_ARTICLES_PER_RUN, 10)
    });
    return Response.json(report);
  }
};
