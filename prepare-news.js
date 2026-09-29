import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateWithOpenAI, OPENAI_MODEL } from './lib/ai-model.js';
import { buildPrompt, parseArticleJson } from './lib/prompt.js';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to generate AI summary with scraped data
async function preparePrompt(scrapedData, date) {
  const fullPrompt = buildPrompt(scrapedData, date);

  try {
    const responseText = await generateWithOpenAI(fullPrompt, process.env.OPENAI_API_KEY);
    return parseArticleJson(responseText);
  } catch (error) {
    console.error(`Error generating summary with ${OPENAI_MODEL}:`, error.message);
    throw error;
  }
}

// Function to get dates in range
function getDatesInRange(start, end) {
  const dates = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// Function to process scraped files and generate AI summaries
async function processScrapedFiles(startDate, endDate) {
  const scrapedDir = path.join(__dirname, 'public', 'news', 'raw');
  const outputDir = path.join(__dirname, 'public', 'news');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Check if scraped directory exists
  if (!fs.existsSync(scrapedDir)) {
    console.error(`Scraped data directory not found: ${scrapedDir}`);
    console.log('Please run the scraper first.');
    return;
  }

  const dates = getDatesInRange(startDate, endDate);
  console.log(`Processing files from ${startDate} to ${endDate} with ${OPENAI_MODEL}...`);

  for (const date of dates) {
    // Construct file name from date (YYYYMMDD.json)
    const fileName = date.replace(/-/g, '') + '.json';
    const filePath = path.join(scrapedDir, fileName);

    // Check if the specific file exists
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath} - skipping`);
      continue;
    }

    try {
      const scrapedData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      await createSummaries(scrapedData, date)
        
      console.log(`✓ Generated summary for ${fileName}`);
    } catch (error) {
      console.error(`✗ Error processing ${fileName}:`, error.message);
    }
  }

  console.log(`\nSummaries saved to: ${outputDir}`);
  console.log(`\nUsed AI provider: OpenAI ${OPENAI_MODEL}`);
}

function formatDate(date) {
  return date.replace(/-/g, "");
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
    .reverse(); // Most recent first

  const indexPath = path.join(newsDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(files, null, 2));
  console.log(`Updated index with ${files.length} files: ${indexPath}`);
}

export async function createSummaries(articles, date) {
  if (articles.length > 0) {
    console.log(`Processing ${date} through AI...`);
    // Save to main news dir
    const mainOutputDir = path.join(__dirname, "public", "news");
    if (!fs.existsSync(mainOutputDir)) {
      fs.mkdirSync(mainOutputDir, { recursive: true });
    }
    let count = 0;
    for (const article of articles) {
      count++;
      try {
        const i = articles.length > 1 ? "_" + count : "";
        const outPath = path.join(mainOutputDir, `${formatDate(date)}${i}.json`);

        // Check if file already exists
        if (fs.existsSync(outPath)) {
          console.log(`File ${outPath} already exists, skipping...`);
          continue;
        }

        // Generate AI summary from scraped data
        const processedArticle = await preparePrompt(article, date);
        fs.writeFileSync(outPath, JSON.stringify(processedArticle, null, 2));
        console.log(`Saved processed article to ${outPath}`);
        
        // Update index.json to include the new file
        updateNewsIndex();
      } catch (error) {
        console.error(`Failed to process ${date} through AI:`, error.message);
      }
    }
  } else {
    console.log(`No articles found for ${date}`);
  }
}

// Function to prepare a single scraped data object
async function prepareSinglePrompt(scrapedData, date) {
  return await preparePrompt(scrapedData, date);
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const startDate = args[0];
  const endDate = args[1] || startDate;

  if (!startDate) {
    console.error('Please provide a start date in YYYY-MM-DD format as the first argument.');
    process.exit(1);
  }

  console.log(`Generating AI summaries from ${startDate} to ${endDate} from scraped parliamentary data...\n`);
  processScrapedFiles(startDate, endDate).catch(error => {
    console.error('Summarization failed:', error);
    process.exit(1);
  });
}

export { preparePrompt, processScrapedFiles, prepareSinglePrompt };
