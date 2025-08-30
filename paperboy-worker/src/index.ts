/**
 * Paperboy Worker - Parliament Hansard Scraper
 * 
 * Scheduled worker that scrapes NZ Parliament Hansard debates every weekday at 11PM NZT
 * using Cloudflare Browser automation.
 */

interface Env {
	BROWSER: Fetcher;
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

interface ScrapeResult {
	content: string | null;
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

async function scrapeHansardContent(browser: Fetcher, dateString: string): Promise<ScrapeResult> {
	const url = `https://www.parliament.nz/en/pb/hansard-debates/rhr/combined/HansD_${dateString}_${dateString}`;
	const debug: ScrapeResult['debug'] = { url, dateString };
	
	try {
		console.log(`Attempting to scrape: ${url}`);
		
		let html = '';
		let usedBrowser = false;
		
		// Try browser rendering first, fallback to direct fetch
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
				usedBrowser = true;
				console.log(`Used browser rendering successfully`);
			} else {
				console.log(`Browser rendering failed with ${browserResponse.status}, falling back to direct fetch`);
			}
		} catch (browserError) {
			console.log(`Browser rendering not available, falling back to direct fetch:`, browserError);
		}
		
		// Fallback to direct fetch if browser rendering failed
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
		
		console.log(`Fetched HTML via Browser API (${html.length} chars)`);
		
		if (!html) {
			debug.error = 'No HTML content returned from Browser API';
			return { content: null, debug };
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
			
			return { content: cleanContent, debug };
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
		
		return { content: fallbackContent.substring(0, 10000), debug }; // Increased limit
		
	} catch (error) {
		console.error('Error scraping Hansard content:', error);
		debug.error = error instanceof Error ? error.message : String(error);
		return { content: null, debug };
	}
}

export default {
	async fetch(req, env): Promise<Response> {
		const url = new URL(req.url);
		
		if (url.pathname === '/test-scrape') {
			// Manual test endpoint with current date
			const nztDate = getNZTDate();
			const dateString = formatDateForUrl(nztDate);
			return new Response(`Test scrape for date: ${dateString}\nURL: https://www.parliament.nz/en/pb/hansard-debates/rhr/combined/HansD_${dateString}_${dateString}`);
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

	async scheduled(event, env, _ctx): Promise<void> {
		console.log(`Hansard scraper triggered at ${event.cron}`);
		
		try {
			// Get current NZT date
			const nztDate = getNZTDate();
			const dateString = formatDateForUrl(nztDate);
			
			console.log(`Scraping Hansard for date: ${dateString}`);
			
			// Scrape the content
			const result = await scrapeHansardContent(env.BROWSER, dateString);
			
			if (result.content) {
				console.log(`Successfully scraped content (${result.content.length} characters)`);
				
				// Here you could store the content in KV, D1, or send to another service
				// For now, we'll just log a summary
				const summary = result.content.substring(0, 200) + (result.content.length > 200 ? '...' : '');
				console.log(`Content preview: ${summary}`);
				console.log(`Debug info:`, JSON.stringify(result.debug, null, 2));
				
				// You might want to store this in Cloudflare KV or send to your main app
				// await env.KV.put(`hansard-${dateString}`, result.content);
			} else {
				console.log('No content found or scraping failed');
				console.log(`Debug info:`, JSON.stringify(result.debug, null, 2));
			}
			
		} catch (error) {
			console.error('Error in scheduled handler:', error);
		}
	},
} satisfies ExportedHandler<Env>;
