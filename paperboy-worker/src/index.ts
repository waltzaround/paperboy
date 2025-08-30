/**
 * Paperboy Worker - Parliament Hansard Scraper
 * 
 * Scheduled worker that scrapes NZ Parliament Hansard debates every weekday at 11PM NZT
 * using Cloudflare Browser automation.
 */

// Cloudflare Worker environment types
interface Env {
	BROWSER: Fetcher;
	GEMINI_API_KEY: string;
	GITHUB_TOKEN: string;
	GITHUB_REPO: string; // Format: "owner/repo"
}

function formatDateForUrl(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}${month}${day}`;
}

function getNZTDate(): Date {
	// Get current UTC time and convert to NZST/NZDT
	const now = new Date();
	const nztOffset = 12; // NZST is UTC+12, NZDT is UTC+13 (handled automatically)
	const nztTime = new Date(now.getTime() + (nztOffset * 60 * 60 * 1000));
	return nztTime;
}

interface KeyExchange {
	speaker: string;
	quote: string;
}

interface NewsArticle {
	headline: string;
	publicationDate: string;
	summary: string;
	topicSummaries: Array<{
		topic: string;
		content: string;
		keyExchanges?: KeyExchange[];
		tags: string[];
	}>;
	conclusion: string;
	tags: string[];
}

interface ParsedContent {
	speaker: string;
	text: string;
	type: string;
	timestamp?: string | null;
	isHeading?: boolean;
}

interface ScrapeResult {
	content: string | null;
	parsedData?: {
		headline: string;
		publicationDate: string;
		summary: string;
		topicSummaries: Array<{
			topic: string;
			content: string;
			tags: string[];
		}>;
		conclusion: string;
		tags: string[];
		content: ParsedContent[];
		fullContent: string;
	};
	debug: {
		url: string;
		dateString: string;
		fetchStatus?: number;
		fetchHeaders?: Record<string, string>;
		htmlLength?: number;
		htmlPreview?: string;
		usedStrategy?: number;
		strategiesAttempted?: number;
		cleanContentLength?: number;
		fallbackContentLength?: number;
		error?: string;
	};
}

// HTML parsing functions adapted from cheerio-based scraper
function parseHtmlContent(html: string, date: string): ScrapeResult['parsedData'] {
	const content: ParsedContent[] = [];
	const allText: string[] = [];

	// Extract headline from title or h1
	const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
	const headline = (h1Match?.[1] || titleMatch?.[1] || `Hansard Debate ${date}`).trim();

	// Extract parliamentary content using regex patterns
	const speechPatterns = [
		/<p[^>]*class="[^"]*Speech[^"]*"[^>]*>(.*?)<\/p>/gs,
		/<p[^>]*class="[^"]*Question[^"]*"[^>]*>(.*?)<\/p>/gs,
		/<p[^>]*class="[^"]*Answer[^"]*"[^>]*>(.*?)<\/p>/gs,
		/<p[^>]*class="[^"]*Interjection[^"]*"[^>]*>(.*?)<\/p>/gs,
		/<p[^>]*class="[^"]*Continue[^"]*"[^>]*>(.*?)<\/p>/gs
	];

	speechPatterns.forEach(pattern => {
		let match;
		while ((match = pattern.exec(html)) !== null) {
			const fullText = match[1];
			const cleanText = fullText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
			
			if (cleanText) {
				// Extract speaker from strong tags
				const strongMatch = fullText.match(/<strong[^>]*>([^<]+)<\/strong>/);
				const speaker = strongMatch ? strongMatch[1].trim() : '';
				const speechText = cleanText.replace(speaker, '').replace(/^:\s*/, '').trim();
				
				if (speechText.length > 10) {
					content.push({
						speaker,
						text: speechText,
						type: 'speech'
					});
					allText.push(cleanText);
				}
			}
		}
	});

	// Extract debate headings
	const headingPatterns = [
		/<p[^>]*class="[^"]*Debate[^"]*"[^>]*>(.*?)<\/p>/gs,
		/<p[^>]*class="[^"]*Subject[^"]*"[^>]*>(.*?)<\/p>/gs,
		/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gs
	];

	headingPatterns.forEach(pattern => {
		let match;
		while ((match = pattern.exec(html)) !== null) {
			const cleanText = match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
			if (cleanText.length > 5) {
				content.push({
					speaker: '',
					text: cleanText,
					type: 'heading',
					isHeading: true
				});
			}
		}
	});

	// Generate summary from first meaningful content
	const summary = content.find(item => item.text && item.text.length > 50)?.text?.substring(0, 200) + '...' || '';

	// Generate topic summaries based on headings
	const topicSummaries: Array<{
		topic: string;
		content: string;
		tags: string[];
	}> = [];
	let currentTopic: string | null = null;
	let currentContent: ParsedContent[] = [];

	content.forEach(item => {
		if (item.isHeading || item.type?.includes('heading')) {
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

	// Generate conclusion from last meaningful content
	const conclusion = content.slice(-3).find(item => item.text && item.text.length > 20)?.text || '';

	// Extract meta keywords for tags
	const keywordsMatch = html.match(/<meta[^>]*name="keywords"[^>]*content="([^"]+)"/i);
	const tags = keywordsMatch ? keywordsMatch[1].split(',').map(t => t.trim()) : [];

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

// Gemini API integration
async function callGeminiAPI(promptData: { systemPrompt: string; userPrompt: string }, apiKey: string): Promise<NewsArticle> {
	try {
		const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-goog-api-key': apiKey
			},
			body: JSON.stringify({
				contents: [{
					parts: [{
						text: `${promptData.systemPrompt}\n\n${promptData.userPrompt}`
					}]
				}]
			})
		});

		if (!response.ok) {
			throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json() as {
			candidates?: Array<{
				content?: {
					parts?: Array<{ text?: string }>;
				};
			}>;
		};
		const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
		
		if (!generatedText) {
			throw new Error('No text generated by Gemini API');
		}

		// Parse JSON response from Gemini
		const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error('No JSON found in Gemini response');
		}
		
		return JSON.parse(jsonMatch[0]);
	} catch (error) {
		console.error('Gemini API call failed:', error);
		throw error;
	}
}

// GitHub API functions
async function pushToGitHub(content: unknown, filename: string, env: Env): Promise<void> {
	const [owner, repo] = env.GITHUB_REPO.split('/');
	const path = `public/news/${filename}`;
	const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
	
	try {
		// Check if file exists to get SHA for update
		let sha: string | undefined;
		try {
			const existingResponse = await fetch(apiUrl, {
				headers: {
					'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
					'Accept': 'application/vnd.github.v3+json',
					'User-Agent': 'Paperboy-Worker'
				}
			});
			
			if (existingResponse.ok) {
				const existingData = await existingResponse.json() as { sha: string };
				sha = existingData.sha;
				console.log(`File ${filename} exists, will update with SHA: ${sha}`);
			}
		} catch {
			console.log(`File ${filename} doesn't exist, will create new`);
		}
		
		// Prepare content
		const contentBase64 = btoa(JSON.stringify(content, null, 2));
		const commitMessage = `Add/update news for ${filename.replace('.json', '')}`;
		
		// Create or update file
		const payload: {
			message: string;
			content: string;
			branch: string;
			sha?: string;
		} = {
			message: commitMessage,
			content: contentBase64,
			branch: 'main'
		};
		
		if (sha) {
			payload.sha = sha;
		}
		
		const response = await fetch(apiUrl, {
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
				'Accept': 'application/vnd.github.v3+json',
				'Content-Type': 'application/json',
				'User-Agent': 'Paperboy-Worker'
			},
			body: JSON.stringify(payload)
		});
		
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
		}
		
		const result = await response.json() as { commit: { sha: string } };
		console.log(`Successfully pushed ${filename} to GitHub. Commit SHA: ${result.commit.sha}`);
		
	} catch (error) {
		console.error(`Failed to push ${filename} to GitHub:`, error);
		throw error;
	}
}

async function checkFileExists(filename: string, env: Env): Promise<boolean> {
	const [owner, repo] = env.GITHUB_REPO.split('/');
	const path = `public/news/${filename}`;
	const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
	
	try {
		const response = await fetch(apiUrl, {
			headers: {
				'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
				'Accept': 'application/vnd.github.v3+json',
				'User-Agent': 'Paperboy-Worker'
			}
		});
		
		return response.ok;
	} catch (error) {
		console.error(`Error checking if ${filename} exists:`, error);
		return false;
	}
}

// Prepare Gemini prompt with scraped data
function prepareGeminiPrompt(scrapedData: ScrapeResult['parsedData'], date: string) {
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

	const userPrompt = `Please analyze the following parliamentary data from ${date} and create a comprehensive news summary following the JSON structure provided in the system prompt:

${JSON.stringify(scrapedData, null, 2)}`;

	return {
		systemPrompt,
		userPrompt,
		date
	};
}

async function scrapeHansardContent(browser: Fetcher, dateString: string, parseContent = true): Promise<ScrapeResult> {
	const url = `https://www.parliament.nz/en/pb/hansard-debates/rhr/combined/HansD_${dateString}_${dateString}`;
	const debug: ScrapeResult['debug'] = { url, dateString };
	
	try {
		console.log(`Attempting to scrape: ${url}`);
		
		// Use Cloudflare Browser API for fetching
		let html = '';
		try {
			const browserResponse = await browser.fetch(url, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
				}
			});
			debug.fetchStatus = browserResponse.status;
			debug.fetchHeaders = Object.fromEntries(browserResponse.headers.entries());
			
			if (browserResponse.ok) {
				html = await browserResponse.text();
				console.log(`Used browser fetch successfully`);
			} else {
				console.log(`Browser fetch failed with ${browserResponse.status}, falling back to direct fetch`);
			}
		} catch (browserError) {
			console.log(`Browser fetch failed, falling back to direct fetch:`, browserError);
		}
		
		// Fallback to direct fetch if browser automation failed
		if (!html) {
			const directResponse = await fetch(url);
			debug.fetchStatus = directResponse.status;
			debug.fetchHeaders = Object.fromEntries(directResponse.headers.entries());
			
			if (!directResponse.ok) {
				console.error(`Direct fetch failed: ${directResponse.status}`);
				debug.error = `Direct fetch HTTP ${directResponse.status}`;
				return { content: null, debug };
			}
			
			html = await directResponse.text();
			console.log(`Used direct fetch as fallback`);
		}
		
		debug.htmlLength = html.length;
		debug.htmlPreview = html.substring(0, 500);
		
		console.log(`Fetched HTML (${html.length} chars)`);
		
		if (!html) {
			debug.error = 'No HTML content returned';
			return { content: null, debug };
		}

		// Parse HTML content if requested
		let parsedData: ScrapeResult['parsedData'] | undefined;
		if (parseContent) {
			try {
				const dateFormatted = `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`;
				parsedData = parseHtmlContent(html, dateFormatted);
				if (parsedData) {
					console.log(`Parsed content: ${parsedData.content.length} items, ${parsedData.topicSummaries.length} topics`);
				}
			} catch (parseError) {
				console.error('Error parsing HTML content:', parseError);
			}
		}
		
		// Try multiple content extraction strategies for Parliament website
		const strategies = [
			// Strategy 1: Look for hansard debate content
			/<div[^>]*class="[^"]*hansard-debate[^"]*"[^>]*>(.*?)<\/div>/s,
			// Strategy 2: Look for debate content div
			/<div[^>]*class="[^"]*debate-content[^"]*"[^>]*>(.*?)<\/div>/s,
			// Strategy 3: Look for main content area
			/<main[^>]*>(.*?)<\/main>/s,
			// Strategy 4: Look for article content
			/<article[^>]*>(.*?)<\/article>/s,
			// Strategy 5: Look for content wrapper
			/<div[^>]*class="[^"]*content-wrapper[^"]*"[^>]*>(.*?)<\/div>/s,
			// Strategy 6: Look for parliament content
			/<div[^>]*class="[^"]*parliament[^"]*"[^>]*>(.*?)<\/div>/s,
			// Strategy 7: Look for any content div with substantial text
			/<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/s
		];
		
		let extractedContent = null;
		let usedStrategy = -1;
		
		for (let i = 0; i < strategies.length; i++) {
			const match = html.match(strategies[i]);
			if (match && match[1].trim().length > 200) { // Increased minimum length
				extractedContent = match[1];
				usedStrategy = i;
				break;
			}
		}
		
		debug.usedStrategy = usedStrategy;
		debug.strategiesAttempted = strategies.length;
		
		if (extractedContent) {
			// Clean up the content more thoroughly
			const cleanContent = extractedContent
				.replace(/<script[^>]*>.*?<\/script>/gs, '')
				.replace(/<style[^>]*>.*?<\/style>/gs, '')
				.replace(/<nav[^>]*>.*?<\/nav>/gs, '')
				.replace(/<header[^>]*>.*?<\/header>/gs, '')
				.replace(/<footer[^>]*>.*?<\/footer>/gs, '')
				.replace(/<aside[^>]*>.*?<\/aside>/gs, '')
				.replace(/<[^>]*>/g, ' ')
				.replace(/\s+/g, ' ')
				.replace(/\n+/g, '\n')
				.trim();
			
			debug.cleanContentLength = cleanContent.length;
			console.log(`Extracted content using strategy ${usedStrategy} (${cleanContent.length} chars)`);
			
			return { content: cleanContent, parsedData, debug };
		}
		
		// If no strategy worked, return cleaned raw text content
		const fallbackContent = html
			.replace(/<script[^>]*>.*?<\/script>/gs, '')
			.replace(/<style[^>]*>.*?<\/style>/gs, '')
			.replace(/<nav[^>]*>.*?<\/nav>/gs, '')
			.replace(/<header[^>]*>.*?<\/header>/gs, '')
			.replace(/<footer[^>]*>.*?<\/footer>/gs, '')
			.replace(/<[^>]*>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
		
		debug.fallbackContentLength = fallbackContent.length;
		console.log(`Using fallback content extraction (${fallbackContent.length} chars)`);
		
		return { content: fallbackContent.substring(0, 10000), parsedData, debug }; // Increased limit
		
	} catch (error) {
		console.error('Error scraping Hansard content:', error);
		debug.error = error instanceof Error ? error.message : String(error);
		return { content: null, parsedData: undefined, debug };
	}
}

export default {
	async fetch(req, env): Promise<Response> {
		const url = new URL(req.url);
		
		if (url.pathname === '/test-scrape') {
			// Manual test endpoint with current date
			const nztDate = getNZTDate();
			const dateString = formatDateForUrl(nztDate);
			
			try {
				console.log(`Testing scrape for date: ${dateString}`);
				const result = await scrapeHansardContent(env.BROWSER, dateString, true);
				
				return new Response(JSON.stringify({
					date: dateString,
					url: `https://www.parliament.nz/en/pb/hansard-debates/rhr/combined/HansD_${dateString}_${dateString}`,
					success: result.content !== null,
					contentLength: result.content?.length || 0,
					contentPreview: result.content?.substring(0, 500) || null,
					parsedData: result.parsedData ? {
						headline: result.parsedData.headline,
						contentItems: result.parsedData.content.length,
						topicSummaries: result.parsedData.topicSummaries.length
					} : null,
					debug: result.debug
				}, null, 2), {
					headers: { 'Content-Type': 'application/json' }
				});
			} catch (error) {
				return new Response(JSON.stringify({
					date: dateString,
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined
				}, null, 2), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}
		
		if (url.pathname === '/test-scrape-20250821') {
			// Test endpoint for specific date
			try {
				const result = await scrapeHansardContent(env.BROWSER, '20250821');
				return new Response(JSON.stringify({
					success: result.content !== null,
					contentLength: result.content?.length || 0,
					contentPreview: result.content?.substring(0, 1000) || null,
					debug: result.debug
				}, null, 2), {
					headers: { 'Content-Type': 'application/json' }
				});
			} catch (error) {
				return new Response(JSON.stringify({
					error: error instanceof Error ? error.message : String(error)
				}, null, 2), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}
		
		if (url.pathname === '/inspect-html-20250821') {
			// HTML inspection endpoint to understand page structure
			try {
				const result = await scrapeHansardContent(env.BROWSER, '20250821');
				
				// Extract class names and IDs from the HTML
				const classMatches = result.debug.htmlPreview?.match(/class="([^"]+)"/g) || [];
				const idMatches = result.debug.htmlPreview?.match(/id="([^"]+)"/g) || [];
				
				return new Response(JSON.stringify({
					htmlLength: result.debug.htmlLength,
					htmlPreview: result.debug.htmlPreview,
					classNames: classMatches.slice(0, 20),
					ids: idMatches.slice(0, 10),
					contentFound: result.content !== null,
					contentLength: result.content?.length || 0,
					debug: result.debug
				}, null, 2), {
					headers: { 'Content-Type': 'application/json' }
				});
			} catch (error) {
				return new Response(JSON.stringify({
					error: error instanceof Error ? error.message : String(error)
				}, null, 2), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}
		
		url.pathname = '/__scheduled';
		url.searchParams.append('cron', '0 11 * * 1-5');
		return new Response(`Paperboy Worker - Parliament Hansard Scraper\nScheduled to run weekdays at 11PM NZT\nTest with: curl "${url.href}"`);
	},

	async scheduled(event, env): Promise<void> {
		console.log(`Hansard scraper triggered at ${event.cron}`);
		
		try {
			// Get current NZT date
			const nztDate = getNZTDate();
			const dateString = formatDateForUrl(nztDate);
			const dateFormatted = `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`;
			
			console.log(`Scraping Hansard for date: ${dateString} (${dateFormatted})`);
			
			// Check if we already have processed data for this date
			const filename = `${dateString}.json`;
			const fileExists = await checkFileExists(filename, env);
			if (fileExists) {
				console.log(`Article for ${dateString} already exists in GitHub, skipping`);
				return;
			}
			
			// Scrape the content with parsing enabled
			const result = await scrapeHansardContent(env.BROWSER, dateString, true);
			
			if (result.content && result.parsedData) {
				console.log(`Successfully scraped and parsed content (${result.content.length} characters)`);
				console.log(`Found ${result.parsedData.content.length} content items, ${result.parsedData.topicSummaries.length} topics`);
				
				try {
					// Process through Gemini API
					const promptData = prepareGeminiPrompt(result.parsedData, dateFormatted);
					console.log(`Processing ${dateFormatted} through Gemini API...`);
					
					const processedArticle = await callGeminiAPI(promptData, env.GEMINI_API_KEY);
					
					// Push the processed article to GitHub
					const articleData = [processedArticle]; // Wrap in array to match expected format
					await pushToGitHub(articleData, filename, env);
					console.log(`Successfully pushed processed article for ${dateString} to GitHub`);
					
				} catch (geminiError) {
					console.error(`Failed to process ${dateFormatted} through Gemini API:`, geminiError);
					
					// Fallback: push raw scraped data if Gemini processing fails
					const fallbackFilename = `fallback-${dateString}.json`;
					await pushToGitHub([result.parsedData], fallbackFilename, env);
					console.log(`Pushed raw scraped data as fallback for ${dateString} to GitHub`);
				}
				
			} else {
				console.log('No content found or scraping failed');
				console.log(`Debug info:`, JSON.stringify(result.debug, null, 2));
			}
			
		} catch (error) {
			console.error('Error in scheduled handler:', error);
		}
	},
} satisfies ExportedHandler<Env>;
