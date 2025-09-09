import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateWithGemini } from './ai-model.js';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to generate AI summary with scraped data
async function preparePrompt(scrapedData, date) {
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

**publicationDate**: Use the provided date in YYYY-MM-DD format.

**summary**: Write a brief (2-4 sentence) narrative introduction that gives a high-level overview of the day in Parliament.

**topicSummaries**: This is the most critical part.
- Create one object for each significant event you identified. The number of objects in this array must match the number of key events in the transcript.
- Order the objects from most to least significant based on journalistic news value. Prioritize major economic news, significant government spending, major policy shifts, progress on important legislation, and highly contentious debates.

**topic** (within each summary object):
- Write a concise, headline-style title for the specific event.
- Incorporate key data like monetary values or statistics directly into the title. This is important! (e.g., "Major $2.7 Billion Defence Upgrade Announced").
- Do not use redundant prefixes like "Debate on:" or "Question Time:".

**content** (within each summary object):
- In a short paragraph, neutrally synthesize the discussion. Clearly explain what the issue is, who the key speakers or parties were (e.g., Government vs. Opposition), their main arguments, and the outcome or next steps. This paragraph provides the essential context for the keyExchanges.

**keyExchanges** (within each summary object):
- From the debate on this topic, select the single most controversial, sharp, witty, funny, or revealing back-and-forth exchange.
- The quotes should capture the core conflict or emotion of the debate.
- Capture the text verbatim. Do not paraphrase.
- For the speaker field, use the format: "Full Name (Party)".
- This field is optional. If a topic (like a procedural announcement) has no noteworthy verbal exchanges, you may omit the entire keyExchanges array for that object.

**tags** (within each summary object):
- Provide an array of 2-4 specific keywords relevant only to that topic.

**conclusion**: Write a single, powerful sentence that summarizes the overall outcome of the day or highlights the core tension that remains.

### 3. Tone and Style
Maintain a neutral, objective, and accessible tone throughout. The language should be simple and clear, suitable for a general reader who is not an expert in parliamentary procedure.`;

  const userPrompt = `
## PARLIAMENTARY PROCEEDINGS DATA

**Date:** ${date}
**Source:** New Zealand Parliament Hansard

### Raw Content:
${scrapedData.fullContent || 'No content available'}

### Extracted Speeches:
${scrapedData.content ? scrapedData.content.map(item =>
  `**${item.speaker}:** ${item.text}`
).join('\n\n') : 'No speeches extracted'}

### Initial Summary:
${scrapedData.summary || 'No summary available'}

### Detected Topics:
${scrapedData.topicSummaries ? scrapedData.topicSummaries.map(topic =>
  `- ${topic.topic}: ${topic.content}`
).join('\n') : 'No topics detected'}

Please analyze this parliamentary data and create a comprehensive news article following the structure and guidelines provided above.`;
  const fullPrompt = systemPrompt + '\n\n' + userPrompt;

  try {
    const responseText = await generateWithGemini(fullPrompt);
    
    // Strip markdown code blocks if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Parse the JSON response
    const jsonResponse = JSON.parse(cleanedResponse.trim());
    return jsonResponse;
  } catch (error) {
    console.error(`Error generating summary with Gemini 2.5 Pro:`, error.message);
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
  console.log(`Processing files from ${startDate} to ${endDate} with Gemini 2.5 Pro...`);

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
  console.log(`\nUsed AI provider: Gemini 2.5 Pro`);
}

function formatDate(date) {
  return date.replace(/-/g, "");
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
