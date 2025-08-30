/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"` to see your Worker in action
 * - Run `npm run deploy` to publish your Worker
 *
 * Bind resources to your Worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

export default {
	async fetch(req) {
		const url = new URL(req.url);
		url.pathname = '/__scheduled';
		url.searchParams.append('cron', '* * * * *');
		return new Response(`To test the scheduled handler, ensure you have used the "--test-scheduled" then try running "curl ${url.href}".`);
	},

	// The scheduled handler is invoked at the interval set in our wrangler.jsonc's
	// [[triggers]] configuration.
	async scheduled(event, env, ctx): Promise<void> {
		// Calculate date range for last 7 days
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(endDate.getDate() - 7);

		const startStr = startDate.toISOString().split('T')[0];
		const endStr = endDate.toISOString().split('T')[0];

		console.log(`Running scraper for dates ${startStr} to ${endStr}`);

		const __dirname = path.dirname(fileURLToPath(import.meta.url));

		// Spawn the scraper process
		const scraper = spawn('node', ['../scraper.js', startStr, endStr], { cwd: __dirname });

		scraper.stdout.on('data', (data) => {
			console.log(`Scraper stdout: ${data}`);
		});

		scraper.stderr.on('data', (data) => {
			console.error(`Scraper stderr: ${data}`);
		});

		scraper.on('close', (code) => {
			console.log(`Scraper process exited with code ${code}`);
		});

		scraper.on('error', (error) => {
			console.error(`Failed to start scraper: ${error}`);
		});
	},
} satisfies ExportedHandler<Env>;
