import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createSummaries } from './prepare-news.js';

// Load environment variables from .env file
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to parse date from YYYY-MM-DD to YYYYMMDD
function formatDate(date) {
  return date.replace(/-/g, '');
}

// Function to update the news index
function updateNewsIndex() {
  const newsDir = path.join(__dirname, 'public', 'news');
  if (!fs.existsSync(newsDir)) {
    console.log('News directory does not exist, skipping index update');
    return;
  }

  const files = fs.readdirSync(newsDir)
    .filter(file => file.endsWith('.json') && file !== 'index.json')
    .sort()
    .reverse();

  const indexPath = path.join(newsDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(files, null, 2));
  console.log(`Updated index with ${files.length} files: ${indexPath}`);
}

// Function to parse HTML and extract NewsArticle
function parseNewsArticle(html, date, hh = null) {
  const $ = cheerio.load(html);

  // Extract headline (assuming it's in h1 or title)
  const headline = $('h1').first().text().trim() || $('title').text().trim() || `Hansard Debate ${date}${hh ? ' ' + hh : ''}`;

  // Extract all parliamentary content from the hansard structure
  const content = [];
  const allText = [];

  // Look for the main hansard content structure
  $('ul.hansard__level li div.body-text div.section').each((i, section) => {
    const sectionText = $(section).text().trim();
    if (sectionText) {
      allText.push(sectionText);
    }

    // Extract structured content from various paragraph types
    $(section).find('p').each((j, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      const className = $elem.attr('class') || '';
      
      if (text) {
        // Extract speaker information from strong tags
        const strongText = $elem.find('strong').first().text().trim();
        
        if (strongText && (className.includes('Speech') || className.includes('Question') || className.includes('Answer'))) {
          const speaker = strongText;
          const speechText = text.replace(strongText, '').trim().replace(/^:\s*/, '');
          content.push({ 
            speaker, 
            text: speechText, 
            type: className,
            timestamp: $elem.find('a[name*="time_"]').attr('name') || null
          });
        } else if (className.includes('Debate') || className.includes('Subject')) {
          // Handle debate headings and subject headings
          content.push({ 
            speaker: '', 
            text: text, 
            type: className,
            isHeading: true
          });
        } else if (text.length > 10) {
          // Capture other significant text content
          content.push({ 
            speaker: '', 
            text: text, 
            type: className || 'general'
          });
        }
      }
    });
  });

  // Fallback: if no hansard structure found, try the original approach
  if (content.length === 0) {
    $('p.Speech, p.Interjection, p.ContinueSpeech, p.SubsQuestion, p.SubsAnswer, p.SupQuestion, p.SupAnswer').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      const strongText = $elem.find('strong').first().text().trim();
      const className = $elem.attr('class') || '';
      
      if (strongText) {
        const speaker = strongText;
        const speechText = text.replace(strongText, '').trim().replace(/^:\s*/, '');
        content.push({ 
          speaker, 
          text: speechText, 
          type: className,
          timestamp: $elem.find('a[name*="time_"]').attr('name') || null
        });
      } else if (text.length > 10) {
        content.push({ speaker: '', text, type: className });
      }
    });
  }

  // Extract summary from first meaningful paragraph
  const summary = content.find(item => item.text && item.text.length > 50)?.text?.substring(0, 200) + '...' || '';

  // Extract topic summaries based on debate headings
  const topicSummaries = [];
  let currentTopic = null;
  let currentContent = [];

  content.forEach(item => {
    if (item.isHeading || item.type?.includes('Debate') || item.type?.includes('Subject')) {
      // Save previous topic if exists
      if (currentTopic && currentContent.length > 0) {
        topicSummaries.push({
          topic: currentTopic,
          content: currentContent.map(c => `${c.speaker}: ${c.text}`).join('\n'),
          tags: []
        });
      }
      // Start new topic
      currentTopic = item.text;
      currentContent = [];
    } else if (currentTopic && item.text) {
      currentContent.push(item);
    }
  });

  // Add final topic
  if (currentTopic && currentContent.length > 0) {
    topicSummaries.push({
      topic: currentTopic,
      content: currentContent.map(c => `${c.speaker}: ${c.text}`).join('\n'),
      tags: []
    });
  }

  // Extract conclusion from last meaningful content
  const conclusion = content.slice(-3).find(item => item.text && item.text.length > 20)?.text || '';

  // Extract tags from meta keywords
  const tags = $('meta[name="keywords"]').attr('content') ? $('meta[name="keywords"]').attr('content').split(',').map(t => t.trim()) : [];

  // Create full content text
  const fullContent = allText.join('\n\n') || content.map(item => `${item.speaker}: ${item.text}`).join('\n\n');

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
        // Save the raw articles
        const outputDir = path.join(__dirname, "public", "news", "raw");

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, `${formattedDate}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2));
        console.log(`Saved raw article to ${outputPath}`);
      } else {
        console.log(`No links found for ${date}`);
      }

      await createSummaries(articles, date);
    }

    // Update index of available files by reading the directory
    updateNewsIndex();

  } finally {
    await browser.close();
  }
}

// CLI arguments
const args = process.argv.slice(2);
let startDate, endDate;

if (args.length === 1) {
  startDate = args[0];
  endDate = args[0];
} else if (args.length === 2) {
  startDate = args[0];
  endDate = args[1];
} else {
  console.error('Usage: node scraper.js <start-date> <end-date> (YYYY-MM-DD)');
  process.exit(1);
}

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