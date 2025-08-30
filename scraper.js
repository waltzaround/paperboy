import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to parse date from YYYY-MM-DD to YYYYMMDD
function formatDate(date) {
  return date.replace(/-/g, '');
}

// Function to get date range
function getDateRange(startDate, endDate) {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// Function to parse HTML and extract NewsArticle
function parseNewsArticle(html, date, hh = null) {
  const $ = cheerio.load(html);

  // Extract headline (assuming it's in h1 or title)
  const headline = $('h1').first().text().trim() || $('title').text().trim() || `Hansard Debate ${date}${hh ? ' ' + hh : ''}`;

  // Extract summary (first paragraph)
  const summary = $('p').first().text().trim();

  // Extract topic summaries (assuming sections with h2 or similar)
  const topicSummaries = [];
  $('h2, h3').each((i, elem) => {
    const topic = $(elem).text().trim();
    const content = $(elem).nextUntil('h2, h3').text().trim();
    const tags = []; // Could extract from meta keywords or something, for now empty
    if (topic && content) {
      topicSummaries.push({ topic, content, tags });
    }
  });

  // Extract conclusion (last paragraph or section)
  const conclusion = $('p').last().text().trim();

  // Extract tags (assuming from meta keywords)
  const tags = $('meta[name="keywords"]').attr('content') ? $('meta[name="keywords"]').attr('content').split(',').map(t => t.trim()) : [];

  // Extract content from speeches and interjections
  const content = [];
  $('p.Speech, p.Interjection, p.ContinueSpeech').each((i, elem) => {
    const text = $(elem).text().trim();
    const strongText = $(elem).find('strong').first().text().trim();
    if (strongText) {
      const speaker = strongText;
      const speechText = text.replace(strongText, '').trim();
      content.push({ speaker, text: speechText });
    } else {
      // If no strong, treat as continuation or general text
      content.push({ speaker: '', text });
    }
  });

  // Extract full content as concatenated text
  const fullContent = content.map(item => `${item.speaker}: ${item.text}`).join('\n\n');

  return {
    headline,
    publicationDate: date,
    summary,
    topicSummaries,
    conclusion,
    tags,
    content,
    fullContent
  };
}

// Main scraper function
async function scrapeHansard(startDate, endDate) {
  const dates = getDateRange(startDate, endDate);
  const outputDir = path.join(__dirname, 'public', 'news');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Launch browser with user-agent spoofing
  const browser = await chromium.launch({
    headless: true, // Set to false for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  const page = await context.newPage();

  // Fetch main page with date range filter to extract date links
  const mainUrl = `https://www.parliament.nz/en/pb/hansard-debates/rhr/?criteria.Timeframe=range&criteria.DateFrom=${startDate}&criteria.DateTo=${endDate}`;
  console.log("Checking ", mainUrl);
  await page.goto(mainUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const mainHtml = await page.content();
  const $main = cheerio.load(mainHtml);
  const dateLinks = {};

  $main('a[href]').each((i, elem) => {
    const href = $main(elem).attr('href');
    if (href && href.includes('HansD_')) {
      const match = href.match(/HansD_(\d{8})_(\d{8})/);
      if (match) {
        const dateStr = match[1];
        const linkDate = dateStr.slice(0, 4) + '-' + dateStr.slice(4, 6) + '-' + dateStr.slice(6, 8);
        const fullUrl = href.startsWith('http') ? href : 'https://www.parliament.nz' + href;
        if (!dateLinks[linkDate]) dateLinks[linkDate] = { hansD: null, hansDeb: [] };
        dateLinks[linkDate].hansD = fullUrl;
      }
    } else if (href && href.includes('HansDeb_')) {
      const match = href.match(/HansDeb_(\d{8})_(\d{8})/);
      if (match) {
        const dateStr = match[1];
        const linkDate = dateStr.slice(0, 4) + '-' + dateStr.slice(4, 6) + '-' + dateStr.slice(6, 8);
        const fullUrl = href.startsWith('http') ? href : 'https://www.parliament.nz' + href;
        if (!dateLinks[linkDate]) dateLinks[linkDate] = { hansD: null, hansDeb: [] };
        dateLinks[linkDate].hansDeb.push(fullUrl);
      }
    }
  });

  try {
    for (const date of Object.keys(dateLinks)) {
      const formattedDate = formatDate(date);
      const articles = [];

      console.log(`Scraping date: ${date}`);

      const dateData = dateLinks[date];
      let links = [];
      if (dateData.hansD) {
        links = [dateData.hansD];
      } else if (dateData.hansDeb.length > 0) {
        links = dateData.hansDeb;
      }

      if (links.length > 0) {
        for (const link of links) {
          try {
            // Navigate to the URL
            const response = await page.goto(link, { waitUntil: 'networkidle', timeout: 30000 });

            if (response && response.ok()) {
              // Wait for potential Radware challenge to resolve
              await page.waitForTimeout(2000); // Adjust as needed

              // Get page content
              const html = await page.content();
              const hhMatch = link.match(/_(\d{2})$/);
              const hh = hhMatch ? hhMatch[1] : null;
              const article = parseNewsArticle(html, date, hh);
              articles.push(article);
              console.log(`Fetched: ${link}`);
            } else {
              console.error(`Error fetching ${link}: Status ${response ? response.status() : 'unknown'}`);
            }
          } catch (error) {
            console.error(`Error fetching ${link}: ${error.message}`);
          }
        }
      } else {
        console.log(`No links found for ${date}`);
      }

      if (articles.length > 0) {
        const outputPath = path.join(outputDir, `${formattedDate}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2));
        console.log(`Saved ${articles.length} articles to ${outputPath}`);
      } else {
        console.log(`No articles found for ${date}`);
      }
    }
  } finally {
    await browser.close();
  }
}

// CLI arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: node scraper.js <start-date> <end-date> (YYYY-MM-DD)');
  process.exit(1);
}

const [startDate, endDate] = args;

// Validate dates
if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
  console.error('Dates must be in YYYY-MM-DD format');
  process.exit(1);
}

if (new Date(startDate) > new Date(endDate)) {
  console.error('Start date must be before or equal to end date');
  process.exit(1);
}

scrapeHansard(startDate, endDate).then(() => {
  console.log('Scraping completed');
}).catch(error => {
  console.error('Scraping failed:', error);
  process.exit(1);
});