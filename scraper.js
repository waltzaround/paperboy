import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to call Gemini API with the prepared prompt
async function callGeminiAPI(promptData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  
  const requestBody = {
    contents: [
      {
        parts: [
          { text: promptData.systemPrompt },
          { text: promptData.userPrompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      topK: 1,
      topP: 1,
      maxOutputTokens: 4096,
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Parse the JSON response from Gemini
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Gemini JSON response:', generatedText);
      throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}`);
    }
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}

// Function to prepare Gemini Pro prompt with scraped data
function prepareGeminiPrompt(scrapedData, date) {
  const systemPrompt = `You are an expert news journalist writing for a mainstream audience. Your task is to transform the provided source material into a comprehensive, succinct summary of the day's key parliamentary activities, formatted as a single JSON object.

The JSON object must follow this exact structure. Do not add any text outside of the JSON object.

{
  "headline": "A compelling, SEO-friendly headline for the article.",
  "publicationDate": "${date}",
  "summary": "A brief, one-paragraph narrative introduction (2-4 sentences) that frames the day's key events for a general reader.",
  "topicSummaries": [
    {
      "topic": "Headline-style title for the most significant event (e.g., '$500M Health Bill Passes First Reading').",
      "content": "A neutral, synthesized paragraph explaining the event. What is the bill/issue about? Who are the key proponents and opponents? What were the main arguments? What is the outcome or next step? This provides the context for the quotes below.",
      "keyExchanges": [
        {
          "speaker": "Name of First MP (Party)",
          "quote": "The direct, verbatim quote from the first speaker in the exchange."
        },
        {
          "speaker": "Name of Second MP (Party)",
          "quote": "The direct, verbatim quote from the second speaker, often as a retort or response."
        }
      ],
      "tags": ["specific", "keywords", "for", "this-topic"]
    }
  ],
  "conclusion": "A single, powerful sentence summarizing the day's outcome or the core ongoing tension."
}

## Content and Logic Instructions

### 1. Core Task: Identifying Topics
Your primary goal is to avoid missing key discussions or bills. Analyze the entire source material to identify all distinct and significant parliamentary activities. Pay close attention to:

- **Bills**: Note their name and their legislative stage (e.g., First Reading, Committee Stage, Third Reading).
- **Ministerial Statements**: Official announcements from government ministers.
- **Urgent Debates or Questions**: Topics of immediate national importance.
- **Major Debates**: Substantial discussions on motions or policy.
- **Question Time**: Focus only on the most contentious or newsworthy exchanges, not every single question.

### 2. Populating the JSON Fields

**headline**: Write a compelling, SEO-friendly headline that captures the most important event of the day.

**summary**: A brief, one-paragraph narrative introduction (2-4 sentences) that frames the day's key events for a general reader.

**topicSummaries**: Array of the most significant topics from the day. Each topic should have:
- **topic**: A headline-style title for the event
- **content**: A neutral, synthesized paragraph explaining the event
- **keyExchanges**: Array of direct quotes showing the key back-and-forth between MPs
- **tags**: Relevant keywords for the topic

**conclusion**: A single, powerful sentence summarizing the day's outcome or core tension.

### 3. Writing Style Guidelines

- **Accessible Language**: Write for a general audience, not parliamentary insiders.
- **Neutral Tone**: Present all sides fairly without editorial bias.
- **Compelling Structure**: Lead with the most newsworthy items.
- **Direct Quotes**: Use verbatim quotes to show the actual exchanges between MPs.
- **Context**: Always explain what bills/issues are about before diving into the politics.

### 4. Quality Standards

- Ensure all quotes are verbatim from the source material
- Include party affiliations for all speakers
- Focus on substantive policy discussions over procedural matters
- Prioritize topics that affect the general public
- Maintain journalistic objectivity throughout`;

  const userPrompt = `Please analyze the following parliamentary data from ${date} and create a comprehensive news summary following the JSON structure provided in the system prompt:

${JSON.stringify(scrapedData, null, 2)}`;

  return {
    systemPrompt,
    userPrompt,
    date
  };
}

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
        try {
          // Generate Gemini prompt from scraped data
          const promptData = prepareGeminiPrompt(articles, date);
          console.log(`Processing ${date} through Gemini API...`);
          
          // Call Gemini API to get structured news article
          const processedArticle = await callGeminiAPI(promptData);
          
          // Save the processed article as a single-item array to match expected format
          const outputPath = path.join(outputDir, `${formattedDate}.json`);
          fs.writeFileSync(outputPath, JSON.stringify([processedArticle], null, 2));
          console.log(`Saved processed article to ${outputPath}`);
          
        } catch (error) {
          console.error(`Failed to process ${date} through Gemini API:`, error.message);
          
          // Fallback: save raw scraped data if Gemini processing fails
          const outputPath = path.join(outputDir, `${formattedDate}.json`);
          fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2));
          console.log(`Saved raw scraped data as fallback to ${outputPath}`);
        }
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