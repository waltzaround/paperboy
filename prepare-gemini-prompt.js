import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

**publicationDate**: Use the provided date in YYYY-MM-DD format.

**summary**: Write a brief (2-4 sentence) narrative introduction that gives a high-level overview of the day in Parliament.

**topicSummaries**: This is the most critical part.
- Create one object for each significant event you identified. The number of objects in this array must match the number of key events in the transcript.
- Order the objects from most to least significant based on journalistic news value. Prioritize major economic news, significant government spending, major policy shifts, progress on important legislation, and highly contentious debates.

**topic** (within each summary object):
- Write a concise, headline-style title for the specific event.
- Incorporate key data like monetary values or statistics directly into the title (e.g., "Major $2.7 Billion Defence Upgrade Announced").
- Do not use redundant prefixes like "Debate on:" or "Question Time:".

**content** (within each summary object):
- In a short paragraph, neutrally synthesize the discussion. Clearly explain what the issue is, who the key speakers or parties were (e.g., Government vs. Opposition), their main arguments, and the outcome or next steps. This paragraph provides the essential context for the keyExchanges.

**keyExchanges** (within each summary object):
- From the debate on this topic, select the single most compelling, sharp, or revealing back-and-forth exchange (typically two quotes).
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

  return {
    systemPrompt,
    userPrompt,
    fullPrompt: systemPrompt + '\n\n' + userPrompt
  };
}

// Function to process scraped files and prepare them for Gemini
function processScrapedFiles(inputDir = null) {
  const scrapedDir = inputDir || path.join(__dirname, 'scraped-data');
  const outputDir = path.join(__dirname, 'gemini-prompts');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Check if scraped directory exists
  if (!fs.existsSync(scrapedDir)) {
    console.error(`Scraped data directory not found: ${scrapedDir}`);
    console.log('Please run the scraper first or specify the correct input directory.');
    return;
  }

  const files = fs.readdirSync(scrapedDir).filter(file => file.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('No JSON files found in scraped data directory.');
    return;
  }

  console.log(`Processing ${files.length} scraped files...`);

  files.forEach(file => {
    try {
      const filePath = path.join(scrapedDir, file);
      const scrapedData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Extract date from filename (assuming format YYYYMMDD.json)
      const dateMatch = file.match(/(\d{8})\.json/);
      const date = dateMatch ? 
        `${dateMatch[1].slice(0,4)}-${dateMatch[1].slice(4,6)}-${dateMatch[1].slice(6,8)}` : 
        scrapedData.publicationDate || new Date().toISOString().split('T')[0];

      const prompt = prepareGeminiPrompt(scrapedData, date);
      
      // Save the prepared prompt
      const outputFile = path.join(outputDir, `prompt-${file}`);
      fs.writeFileSync(outputFile, JSON.stringify({
        date,
        originalFile: file,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        fullPrompt: prompt.fullPrompt,
        metadata: {
          originalHeadline: scrapedData.headline,
          contentLength: scrapedData.fullContent?.length || 0,
          speechCount: scrapedData.content?.length || 0
        }
      }, null, 2));

      console.log(`✓ Prepared prompt for ${file} -> prompt-${file}`);
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  });

  console.log(`\nPrompts saved to: ${outputDir}`);
  console.log('\nTo use with Gemini Pro:');
  console.log('1. Load the JSON file');
  console.log('2. Use the "fullPrompt" field as your complete prompt');
  console.log('3. Or use "systemPrompt" and "userPrompt" separately if your API supports system messages');
}

// Function to prepare a single scraped data object
function prepareSinglePrompt(scrapedData, date) {
  return prepareGeminiPrompt(scrapedData, date);
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const inputDir = args[0] || null;
  
  console.log('Preparing Gemini Pro prompts from scraped parliamentary data...\n');
  processScrapedFiles(inputDir);
}

export { prepareGeminiPrompt, processScrapedFiles, prepareSinglePrompt };
