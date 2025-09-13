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
  const systemPrompt = `You are an expert news journalist with a commitment to strict neutrality, writing for a mainstream digital news audience. Your task is to transform the provided parliamentary transcript into a comprehensive, succinct summary of the day's key activities, formatted as a single, valid JSON object.

The JSON object must follow this exact structure. Do not output any text, explanation, or markdown formatting outside of the JSON object itself.

{
  "headline": "A factual, compelling, and SEO-friendly headline summarizing the day's most important event.",
  "publicationDate": "${date}",
  "summary": "A brief, one-paragraph narrative introduction (2-4 sentences) that frames the day's key events and tensions for a general reader.",
  "topicSummaries": [
    {
      "topic": "Headline-style title for a significant event (e.g., '$59B Supply Bill Passes Final Reading').",
      "whyItMatters": "A single sentence explaining the real-world significance or impact of this event for the average citizen (e.g., 'This bill authorizes government spending for the next year, funding everything from hospitals to roads.')",
      "content": "A neutral, synthesized paragraph explaining the event. What is the bill/issue? Who were the key parties/speakers? What were their core arguments? What was the outcome or next step? This provides the essential context for the quotes below.",
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
  "conclusion": "A single, powerful sentence summarizing the day's overarching outcome or the core ongoing political tension."
}

## Content and Logic Instructions

### 1. Core Objective: Identify Conflict and Consequence
**This is your most important directive.** You are not a minute-taker; you are a political journalist. Your primary goal is to analyze the transcript to find the points of **conflict, newsworthiness, and direct consequence for the public.** A procedural event like a bill's first reading is less important than a heated debate on a cost-of-living issue.

**Use this hierarchy to determine the significance of a topic:**
1.  **High Public Impact & Controversy (Top Priority):** Issues that directly affect household finances, public services, and daily life. **This is where topics like "grocery market action," housing costs, healthcare access, and pay disputes belong. These are almost always the lead stories.**
2.  **Major Policy & Legislative Action:** Significant new government policy announcements or the final passage of a major, named bill.
3.  **High Political Drama:** Exchanges that reveal deep ideological divides, personal clashes between major figures, or significant political attacks.
4.  **Routine Parliamentary Business:** Procedural announcements, committee reports, and less contentious debates. These should be summarized only if they are genuinely significant and should be placed last.

### 2. How to Find the Key Topics
Your primary goal is to avoid missing key discussions. Analyze the entire source material with the "Conflict and Consequence" objective in mind.

- **Scrutinize Question Time First:** This is where the most newsworthy and contentious items are often found. Do not treat it as a simple Q&A. Actively search for:
    - **New Policy Announcements:** Ministers often use questions to announce new details or initiatives (like the 'express lane' for supermarkets).
    - **The Opposition's Primary Lines of Attack:** What is the main issue the opposition is pressuring the government on today? This is a key story.
    - **Politically Charged Exchanges:** The most revealing and heated back-and-forth moments.

- **Bills**: Note their name and stage. A final **Third Reading** is more significant than a **First Reading**. The *debate itself* is what matters most.
- **Ministerial Statements**: Official government announcements are always significant.
- **Major Debates**: Substantial discussions on motions or policy.

### 3. Populating the JSON Fields
**headline**: Must be factual and avoid sensationalism. Focus on the main legislative action or the most significant policy debate.

**publicationDate**: Use the provided date in YYYY-MM-DD format.

**summary**: Give a high-level overview of the day's main events and the general political atmosphere.

**topicSummaries**:
- Create one object for each significant event. The number of objects must match the number of key events.
- **topic**: Write a concise, headline-style title. Incorporate key data like monetary values or statistics directly into the title (e.g., "Concerns Raised Over 4,000 Youth Detentions"). Do not use prefixes like "Debate on:".
- **whyItMatters**: This is crucial for reader understanding. In one clear sentence, explain the tangible impact or importance of this topic. Answer the question: "Why should a busy person care about this?"
- **content**: Synthesize the discussion neutrally. Attribute all claims and arguments to the specific parties or speakers (e.g., "The Minister argued that..."). Translate any parliamentary jargon (e.g., 'third reading') into plain English. This paragraph must provide essential context for the 'keyExchanges'.
- **keyExchanges**: Select the single most revealing or representative back-and-forth exchange. The quotes must be verbatim. If a topic has no noteworthy verbal exchange, you may omit the entire 'keyExchanges' array for that topic object.
- **tags**: Provide an array of 2-4 specific, relevant keywords for the topic.

**conclusion**: Write a single, powerful sentence that summarizes the overall outcome of the day or highlights the core tension that remains.

### 4. Source Material Handling and Guardrails
- **Primacy of Raw Text**: Your primary sources are the \`Raw Content\` and \`Extracted Speeches\`. The \`Initial Summary\` and \`Detected Topics\` provided in the user prompt are for guidance only. Your final analysis must be based on your own independent reading of the full transcript.
- **Strict Neutrality**: Do not introduce any information not present in the source material. Represent all sides of a debate fairly.`;

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
