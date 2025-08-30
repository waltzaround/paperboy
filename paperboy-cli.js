#!/usr/bin/env node

import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import AI providers dynamically for LangChain
let ChatOpenAI, ChatAnthropic, ChatGoogleGenerativeAI, ChatXAI;

try {
  const openai = await import('@langchain/openai');
  ChatOpenAI = openai.ChatOpenAI;
} catch (e) {
  console.warn('OpenAI not available:', e.message);
}

try {
  const anthropic = await import('@langchain/anthropic');
  ChatAnthropic = anthropic.ChatAnthropic;
} catch (e) {
  console.warn('Anthropic not available:', e.message);
}

try {
  const google = await import('@langchain/google-genai');
  ChatGoogleGenerativeAI = google.ChatGoogleGenerativeAI;
} catch (e) {
  console.warn('Google Generative AI not available:', e.message);
}

try {
  const xai = await import('@langchain/xai');
  ChatXAI = xai.ChatXAI;
} catch (e) {
  console.warn('xAI/Grok not available:', e.message);
}

// Function to get AI model based on provider
function getAIModel(provider = process.env.DEFAULT_AI_PROVIDER || 'google') {
  switch (provider.toLowerCase()) {
    case 'openai':
      if (!ChatOpenAI) throw new Error('OpenAI not installed or API key missing');
      return new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        temperature: 0.3,
      });
    case 'anthropic':
      if (!ChatAnthropic) throw new Error('Anthropic not installed or API key missing');
      return new ChatAnthropic({
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        modelName: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
        temperature: 0.3,
      });
    case 'google':
      if (!ChatGoogleGenerativeAI) throw new Error('Google Generative AI not installed or API key missing');
      return new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
        modelName: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
        temperature: 0.3,
      });
    case 'xai':
    case 'grok':
      if (!ChatXAI) throw new Error('xAI/Grok not installed or API key missing');
      return new ChatXAI({
        apiKey: process.env.XAI_API_KEY,
        model: process.env.XAI_MODEL || 'grok-beta',
        temperature: 0.3,
      });
    case 'openrouter':
      if (!ChatOpenAI) throw new Error('OpenAI client not available for OpenRouter');
      return new ChatOpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        modelName: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku',
        temperature: 0.3,
        configuration: {
          baseURL: 'https://openrouter.ai/api/v1',
        },
      });
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// Function to call AI API with LangChain
async function callAIAPI(prompt, provider = process.env.DEFAULT_AI_PROVIDER) {
  try {
    const model = getAIModel(provider);
    const response = await model.invoke(prompt);

    // Parse the JSON response
    try {
      const jsonMatch = response.content.trim().match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI JSON response:', response.content);
      throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
    }
  } catch (error) {
    console.error('AI API call failed:', error);
    throw error;
  }
}

// Function to prepare AI prompt with scraped data (using superior prompt from prepare-gemini-prompt.js)
function prepareAIPrompt(scrapedData, date) {
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

  return systemPrompt + '\n\n' + userPrompt;
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
async function scrapeHansard(startDate, endDate, provider = process.env.DEFAULT_AI_PROVIDER) {
  const outputDir = path.join(__dirname, 'public', 'news', 'raw');

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
          // Generate AI prompt from scraped data
          const prompt = prepareAIPrompt(articles, date);
          console.log(`Processing ${date} through AI API...`);

          // Call AI API to get structured news article
          const processedArticle = await callAIAPI(prompt, provider);

          // Save the processed article as a single-item array to match expected format
          const outputPath = path.join(outputDir, `${formattedDate}.json`);
          fs.writeFileSync(outputPath, JSON.stringify(processedArticle, null, 2));
          console.log(`Saved processed article to ${outputPath}`);

        } catch (error) {
          console.error(`Failed to process ${date} through AI API:`, error.message);

          // Fallback: save raw scraped data if AI processing fails
          const outputPath = path.join(outputDir, `${formattedDate}.json`);
          fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2));
          console.log(`Saved raw scraped data as fallback to ${outputPath}`);
        }
      } else {
        console.log(`No articles found for ${date}`);
      }
    }

    // Update index of available files by reading the directory
    updateNewsIndex();

  } finally {
    await browser.close();
  }
}

// Function to summarize text using LangChain
async function summarizeText(text, provider = process.env.DEFAULT_AI_PROVIDER) {
  try {
    const model = getAIModel(provider);
    const prompt = `
You are an expert news journalist writing for a mainstream audience.
Your task is to transform the provided source material into a comprehensive, succinct summary of the day's key parliamentary activities,
formatted as a single JSON object.
The JSON object must follow this exact structure.
Do not add any text outside of the JSON object.
JSON Structure:
{
  "headline": "A compelling, SEO-friendly headline for the article.",
  "publicationDate": "YYYY-MM-DD",
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

1. Core Task: Identifying Topics
Your primary goal is to avoid missing key discussions or bills.
Analyze the entire source material to identify all distinct and significant parliamentary activities.
Pay close attention to:
  Bills: Note their name and their legislative stage (e.g., First Reading, Committee Stage, Third Reading).
  Ministerial Statements: Official announcements from government ministers.
  Urgent Debates or Questions: Topics of immediate national importance.
  Major Debates: Substantial discussions on motions or policy.
  Question Time: Focus only on the most contentious or newsworthy exchanges, not every single question.

2. Populating the JSON Fields
headline: Write a compelling, SEO-friendly headline that captures the most important event of the day.
publicationDate: Use the date of the original event in YYYY-MM-DD format.
summary: Write a brief (2-4 sentence) narrative introduction that gives a high-level overview of the day in Parliament.
topicSummaries: This is the most critical part. Create one object for each significant event you identified. The number of objects in this array must match the number of key events in the transcript.
  Order the objects from most to least significant based on journalistic news value.
  Prioritize major economic news, significant government spending, major policy shifts, progress on important legislation, and highly contentious debates.
topic (within each summary object): Write a concise, headline-style title for the specific event.
  Incorporate key data like monetary values or statistics directly into the title (e.g., "Major $2.7 Billion Defence Upgrade Announced").
  Do not use redundant prefixes like "Debate on:" or "Question Time:".
content (within each summary object): In a short paragraph, neutrally synthesize the discussion. Clearly explain what the issue is, who the key speakers or parties were (e.g., Government vs. Opposition), their main arguments, and the outcome or next steps.
  This paragraph provides the essential context for the keyExchanges.
keyExchanges (within each summary object): From the debate on this topic, select the single most compelling, sharp, or revealing back-and-forth exchange (typically two quotes).
  The quotes should capture the core conflict or emotion of the debate.
  Capture the text verbatim. Do not paraphrase.
  For the speaker field, use the format: "Full Name (Party)".
  This field is optional. If a topic (like a procedural announcement) has no noteworthy verbal exchanges, you may omit the entire keyExchanges array for that object.
tags (within each summary object): Provide an array of 2-4 specific keywords relevant only to that topic.
conclusion: Write a single, powerful sentence that summarizes the overall outcome of the day or highlights the core tension that remains.

3. Tone and Style
Maintain a neutral, objective, and accessible tone throughout.
The language should be simple and clear, suitable for a general reader who is not an expert in parliamentary procedure.

Transcript:
${text}`;

    const response = await model.invoke(prompt);
    // Parse the JSON response
    try {
      const jsonResponse = JSON.parse(response.content.trim());
      return jsonResponse;
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError.message);
      console.error('AI Response:', response.content);
      throw new Error('AI response is not valid JSON');
    }
  } catch (error) {
    console.error(`Error summarizing with ${provider}:`, error.message);
    throw error;
  }
}

// Main summarization function
async function summarizeArticles(specificFile = null, provider = process.env.DEFAULT_AI_PROVIDER) {
  const rawDir = path.join(__dirname, 'public', 'news', 'raw');
  const processedDir = path.join(__dirname, 'public', 'news');

  // Ensure directories exist
  if (!fs.existsSync(rawDir)) {
    console.error('Raw directory does not exist:', rawDir);
    return;
  }

  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
  }

  // Get all JSON files
  const files = fs.readdirSync(rawDir).filter(file => file.endsWith('.json'));

  if (files.length === 0) {
    console.log('No JSON files found in raw directory');
    return;
  }

  let filesToProcess = files;
  if (specificFile) {
    if (files.includes(specificFile)) {
      filesToProcess = [specificFile];
    } else {
      console.error(`File ${specificFile} not found in raw directory`);
      return;
    }
  }

  console.log(`Processing ${filesToProcess.length} file(s) with provider: ${provider}`);

  for (const file of filesToProcess) {
    try {
      const filePath = path.join(rawDir, file);
      console.log(`Processing ${file}...`);

      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Process the data
      if (Array.isArray(data)) {
        // Handle array of articles
        console.warn(`File ${file} contains an array, processing each item...`);
        let processedCount = 0;

        for (let i = 0; i < data.length; i++) {
          const article = data[i];
          if (article.fullContent) {
            try {
              console.log(`Summarizing article ${i + 1}/${data.length} in ${file}...`);
              const aiSummary = await summarizeText(article.fullContent, provider);
              // Replace the article with AI-generated summary
              data[i] = { ...aiSummary };
              console.log(`✓ Summarized article ${i + 1}`);
              processedCount++;
            } catch (error) {
              console.error(`✗ Failed to summarize article ${i + 1} in ${file}:`, error.message);
              // Remove failed article from array
              data.splice(i, 1);
              i--; // Adjust index after removal
            }
          } else {
            console.warn(`No fullContent found for article ${i + 1} in ${file}, removing from array`);
            // Remove article without fullContent
            data.splice(i, 1);
            i--; // Adjust index after removal
          }
        }

        if (processedCount > 0) {
          // Save the modified array only if at least one article was processed
          const processedPath = path.join(processedDir, file);
          fs.writeFileSync(processedPath, JSON.stringify(data, null, 2));
          console.log(`✓ Saved processed file: ${processedPath} (${processedCount} articles)`);
        } else {
          console.log(`⏭️ Skipped ${file} - no articles could be processed`);
        }
      } else {
        // Single article object
        if (data.fullContent) {
          try {
            console.log(`Summarizing ${file}...`);
            const aiSummary = await summarizeText(data.fullContent, provider);
            // Create processed data with AI summary
            const processedData = {
              ...aiSummary
            };
            const processedPath = path.join(processedDir, file);
            fs.writeFileSync(processedPath, JSON.stringify(processedData, null, 2));
            console.log(`✓ Saved processed file: ${processedPath}`);
          } catch (error) {
            console.error(`✗ Failed to summarize ${file}:`, error.message);
            console.log(`⏭️ Skipped ${file} - summarization failed`);
          }
        } else {
          console.log(`⏭️ Skipped ${file} - no fullContent found`);
        }
      }

    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
      console.log(`⏭️ Skipped ${file} - processing failed`);
    }
  }

  // Update the news index after processing
  updateNewsIndex();

  console.log('Summarization completed');
}

// CLI argument parsing
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node paperboy-cli.js <mode> [options]');
    console.error('Modes:');
    console.error('  scrape <start-date> <end-date> [provider]');
    console.error('  summarize [file] [provider]');
    console.error('  both <start-date> <end-date> [provider]');
    console.error('Dates must be in YYYY-MM-DD format');
    process.exit(1);
  }

  const mode = args[0].toLowerCase();

  switch (mode) {
    case 'scrape':
      if (args.length < 3) {
        console.error('Usage: node paperboy-cli.js scrape <start-date> <end-date> [provider]');
        process.exit(1);
      }
      const startDate = args[1];
      const endDate = args[2];
      const scrapeProvider = args[3] || process.env.DEFAULT_AI_PROVIDER;

      // Validate dates
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        console.error('Dates must be in YYYY-MM-DD format');
        process.exit(1);
      }
      if (new Date(startDate) > new Date(endDate)) {
        console.error('Start date must be before or equal to end date');
        process.exit(1);
      }

      return { mode, startDate, endDate, provider: scrapeProvider };

    case 'summarize':
      const summarizeFile = args[1] && args[1].endsWith('.json') ? args[1] : null;
      const summarizeProvider = (args[1] && !args[1].endsWith('.json')) ? args[1] : (args[2] || process.env.DEFAULT_AI_PROVIDER);
      return { mode, file: summarizeFile, provider: summarizeProvider };

    case 'both':
      if (args.length < 3) {
        console.error('Usage: node paperboy-cli.js both <start-date> <end-date> [provider]');
        process.exit(1);
      }
      const bothStartDate = args[1];
      const bothEndDate = args[2];
      const bothProvider = args[3] || process.env.DEFAULT_AI_PROVIDER;

      // Validate dates
      if (!/^\d{4}-\d{2}-\d{2}$/.test(bothStartDate) || !/^\d{4}-\d{2}-\d{2}$/.test(bothEndDate)) {
        console.error('Dates must be in YYYY-MM-DD format');
        process.exit(1);
      }
      if (new Date(bothStartDate) > new Date(bothEndDate)) {
        console.error('Start date must be before or equal to end date');
        process.exit(1);
      }

      return { mode, startDate: bothStartDate, endDate: bothEndDate, provider: bothProvider };

    default:
      console.error(`Unknown mode: ${mode}`);
      console.error('Available modes: scrape, summarize, both');
      process.exit(1);
  }
}

// Main execution
async function main() {
  const options = parseArgs();

  console.log(`Paperboy CLI - Mode: ${options.mode}`);
  console.log(`Using AI provider: ${options.provider || 'default'}`);

  try {
    switch (options.mode) {
      case 'scrape':
        console.log(`Scraping from ${options.startDate} to ${options.endDate}`);
        await scrapeHansard(options.startDate, options.endDate, options.provider);
        break;

      case 'summarize':
        console.log(`Summarizing ${options.file || 'all files'}`);
        await summarizeArticles(options.file, options.provider);
        break;

      case 'both':
        console.log(`Scraping and summarizing from ${options.startDate} to ${options.endDate}`);
        await scrapeHansard(options.startDate, options.endDate, options.provider);
        await summarizeArticles(null, options.provider);
        break;
    }

    console.log('Operation completed successfully');
  } catch (error) {
    console.error('Operation failed:', error.message);
    process.exit(1);
  }
}

// Run the CLI
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});