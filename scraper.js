import axios from 'axios';
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
function parseNewsArticle(html, date, hh) {
  const $ = cheerio.load(html);

  // Extract headline (assuming it's in h1 or title)
  const headline = $('h1').first().text().trim() || $('title').text().trim() || `Hansard Debate ${date} ${hh}`;

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

  return {
    headline,
    publicationDate: date,
    summary,
    topicSummaries,
    conclusion,
    tags
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

  for (const date of dates) {
    const formattedDate = formatDate(date);
    const articles = [];

    console.log(`Scraping date: ${date}`);

    for (let hh = 1; hh <= 24; hh++) {
      const hhStr = hh.toString().padStart(2, '0');
      const url = `https://www.parliament.nz/en/pb/hansard-debates/rhr/combined/HansDeb_${formattedDate}_${formattedDate}_${hhStr}`;

      try {
        const response = await axios.get(url);
        if (response.status === 200) {
          const article = parseNewsArticle(response.data, date, hhStr);
          articles.push(article);
          console.log(`Fetched: ${url}`);
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log(`Skipped 404: ${url}`);
        } else {
          console.error(`Error fetching ${url}: ${error.message}`);
        }
      }
    }

    if (articles.length > 0) {
      const outputPath = path.join(outputDir, `${formattedDate}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2));
      console.log(`Saved ${articles.length} articles to ${outputPath}`);
    } else {
      console.log(`No articles found for ${date}`);
    }
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