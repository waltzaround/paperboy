import { Link } from "react-router-dom";
import { ArrowLeft, Github, Calendar, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function About() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        <article className="space-y-8">
          <header className="space-y-4">
            <h1 className="font-semibold text-4xl leading-tight tracking-tighter">
              About Paperboy
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              Your daily digest of New Zealand parliamentary proceedings, powered by AI.
            </p>
          </header>

          <div className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-100">What is Paperboy?</h2>
              <div className="text-gray-400 leading-relaxed space-y-4">
                <p>
                  Paperboy automatically scrapes New Zealand's official Hansard records and uses AI 
                  to create accessible news summaries of parliamentary proceedings. Built by <a href="https://walt.online">Walter Lim</a> 
                  and <a href="https://www.linkedin.com/in/jonas-kuhn-99526350/"> Jonas Kuhn</a> to make democracy more transparent for everyday New Zealanders.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-100">How it Works</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-blue-400" />
                    <h3 className="font-medium text-gray-200">Automated Scraping</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    We automatically collect official Hansard transcripts from Parliament's website 
                    using Cloudflare Workers and Playwright.
                  </p>
                </div>
                
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-green-400" />
                    <h3 className="font-medium text-gray-200">AI Processing</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    Google's Gemini Pro AI analyzes the raw parliamentary data and creates 
                    structured, journalistic summaries with key quotes and context.
                  </p>
                </div>
                
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Github className="w-5 h-5 text-purple-400" />
                    <h3 className="font-medium text-gray-200">Open Source</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    The entire project is open source and available on GitHub. Built with React, 
                    TypeScript, and modern web technologies.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-100">Key Features</h2>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-gray-300">Daily Summaries:</strong> Comprehensive coverage of each sitting day's proceedings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-gray-300">Key Exchanges:</strong> Direct quotes showing the actual debates between MPs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-gray-300">Party Context:</strong> Color-coded quotes showing political affiliations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-gray-300">Topic Organization:</strong> Structured summaries organized by major issues</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong className="text-gray-300">Neutral Reporting:</strong> AI-powered objective summaries without editorial bias</span>
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-100">Technology Stack</h2>
              <div className="text-gray-400 leading-relaxed">
                <p className="mb-4">
                  Paperboy is built with modern web technologies and cloud infrastructure:
                </p>
                <ul className="grid gap-2 md:grid-cols-2">
                  <li><strong className="text-gray-300">Frontend:</strong> React, TypeScript, Vite, Tailwind CSS</li>
                  <li><strong className="text-gray-300">UI Components:</strong> Shadcn/ui</li>
                  <li><strong className="text-gray-300">Scraping:</strong> Playwright, Cheerio</li>
                  <li><strong className="text-gray-300">AI Processing:</strong> Google Gemini Pro</li>
                  <li><strong className="text-gray-300">Infrastructure:</strong> Cloudflare Workers, Pages</li>
                  <li><strong className="text-gray-300">Deployment:</strong> Automated via GitHub Actions</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-100">Data Sources</h2>
              <div className="text-gray-400 leading-relaxed">
                <p>
                  All content is sourced directly from the official New Zealand Parliament website's 
                  Hansard records. We respect the Parliament's terms of use and only collect publicly 
                  available information. No personal data is collected from users of this site.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-100">Contributing</h2>
              <div className="text-gray-400 leading-relaxed space-y-4">
                <p>
                  Paperboy is an open-source project. We welcome contributions, bug reports, and 
                  feature suggestions. Whether you're interested in improving the AI prompts, 
                  enhancing the UI, or adding new features, there are many ways to get involved.
                </p>
                <div className="flex gap-4">
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href="https://github.com/waltzaround/paperboy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2"
                    >
                      <Github className="w-4 h-4" />
                      View on GitHub
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href="https://www.parliament.nz/en/calendar" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      Parliament Calendar
                    </a>
                  </Button>
                </div>
              </div>
            </section>

            <section className="pt-8 border-t border-gray-800">
              <p className="text-sm text-gray-500">
                Paperboy is an independent project and is not affiliated with the New Zealand Parliament 
                or any political party. All parliamentary content is sourced from official public records.
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}
