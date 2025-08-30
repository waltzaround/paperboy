import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import AI providers dynamically
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

// Function to get AI model based on provider
function getAIModel(provider = process.env.DEFAULT_AI_PROVIDER || 'openai') {
  switch (provider.toLowerCase()) {
    case 'openai':
      if (!ChatOpenAI) throw new Error('OpenAI not installed or API key missing');
      return new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'gpt-3.5-turbo',
        temperature: 0.3,
      });
    case 'anthropic':
      if (!ChatAnthropic) throw new Error('Anthropic not installed or API key missing');
      return new ChatAnthropic({
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        modelName: 'claude-3-sonnet-20240229',
        temperature: 0.3,
      });
    case 'google':
      if (!ChatGoogleGenerativeAI) throw new Error('Google Generative AI not installed or API key missing');
      return new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: 'gemini-pro',
        temperature: 0.3,
      });
    case 'xai':
    case 'grok':
      if (!ChatXAI) throw new Error('xAI/Grok not installed or API key missing');
      return new ChatXAI({
        apiKey: process.env.XAI_API_KEY,
        model: 'grok-beta',
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

// Function to summarize text
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
async function summarizeArticles(specificFile = null) {
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

  console.log(`Processing ${filesToProcess.length} file(s)`);

  for (const file of filesToProcess) {
    let fileProcessed = false;

    try {
      const filePath = path.join(rawDir, file);
      console.log(`Processing ${file}...`);

      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Process the data
      let fileProcessed = false;

      if (Array.isArray(data)) {
        // Handle array of articles (not typical for this use case)
        console.warn(`File ${file} contains an array, processing each item...`);
        let processedCount = 0;

        for (let i = 0; i < data.length; i++) {
          const article = data[i];
          if (article.fullContent) {
            try {
              console.log(`Summarizing article ${i + 1}/${data.length} in ${file}...`);
              const aiSummary = await summarizeText(article.fullContent);
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
          fileProcessed = true;
        } else {
          console.log(`⏭️ Skipped ${file} - no articles could be processed`);
        }
      } else {
        // Single article object
        if (data.fullContent) {
          try {
            console.log(`Summarizing ${file}...`);
            const aiSummary = await summarizeText(data.fullContent);
            // Create processed data with AI summary and original data
            const processedData = {
              ...aiSummary
            };
            const processedPath = path.join(processedDir, file);
            fs.writeFileSync(processedPath, JSON.stringify(processedData, null, 2));
            console.log(`✓ Saved processed file: ${processedPath}`);
            fileProcessed = true;
          } catch (error) {
            console.error(`✗ Failed to summarize ${file}:`, error.message);
            console.log(`⏭️ Skipped ${file} - summarization failed`);
          }
        } else {
          console.log(`⏭️ Skipped ${file} - no fullContent found`);
        }
      }

      if (!fileProcessed) {
        console.log(`⏭️ File ${file} was not processed and will not be saved`);
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

// CLI arguments for provider override and specific file
const args = process.argv.slice(2);
let specificFile = null;
let provider = process.env.DEFAULT_AI_PROVIDER;

if (args.length > 0) {
  if (args[0].endsWith('.json')) {
    specificFile = args[0];
    provider = args[1] || provider;
  } else {
    provider = args[0];
    specificFile = args[1];
  }
}

console.log(`Using AI provider: ${provider}`);
if (specificFile) {
  console.log(`Processing specific file: ${specificFile}`);
}

summarizeArticles(specificFile).catch(error => {
  console.error('Summarization failed:', error);
  process.exit(1);
});
