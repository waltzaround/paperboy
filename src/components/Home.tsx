import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatTextWithBold } from "@/lib/utils";
import { updatePageSEO, DEFAULT_SEO } from "@/lib/seo";



interface Sitting {
  date: string;
  start: string; // UTC ISO
  end: string; // UTC ISO
  title: string;
}

function formatTimeLeft(difference: number) {
  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

// Counts down to the next sitting in Parliament's official sitting calendar,
// which the cron Worker publishes to /sitting-calendar.json
function CountdownPill() {
  const [sittings, setSittings] = useState<Sitting[] | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetch('/sitting-calendar.json')
      .then(response => response.ok ? response.json() : Promise.reject(response.status))
      .then(data => setSittings(data.sittings))
      .catch(error => console.error('Error loading sitting calendar:', error));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!sittings) return null;

  const current = sittings.find(s => Date.parse(s.start) <= now && now < Date.parse(s.end));
  const next = sittings.find(s => Date.parse(s.start) > now);

  let message;
  if (current) {
    message = "Parliament is sitting now";
  } else if (next) {
    message = (
      <>
        Parliament next sits in: <span className="font-semibold italic text-white">{formatTimeLeft(Date.parse(next.start) - now)}</span>
      </>
    );
  } else {
    message = "No upcoming sittings scheduled";
  }

  return (
    <div className="px-4 py-2 rounded-full border border-white/20 mt-4 text-sm">
      {message}
    </div>
  );
}

interface NewsArticle {
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
}

export function Home() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);

  // Set up SEO for home page
  useEffect(() => {
    updatePageSEO({
      ...DEFAULT_SEO,
      url: window.location.href
    });
  }, []);

  useEffect(() => {
    const loadArticles = async () => {
      try {
        // First, fetch the index of available files
        const indexResponse = await fetch('/news/index.json');
        if (!indexResponse.ok) {
          console.error('Failed to load index.json');
         
          return;
        }
        const newsFiles: string[] = await indexResponse.json();
        console.log('Available files:', newsFiles);

        const loadedArticles: NewsArticle[] = [];

        // Fetch files in batches to avoid overwhelming the browser
        const batchSize = 30;

        for (let i = 0; i < newsFiles.length; i += batchSize) {
          const batch = newsFiles.slice(i, i + batchSize);
          const batchPromises = batch.map(async (filename) => {
            try {
              const response = await fetch(`/news/${filename}`);
              if (response.ok) {
                console.log("Successfully loaded:", filename);
                return await response.json();
              }
              return null;
            } catch {
              return null;
            }
          });

          const batchResults = await Promise.all(batchPromises);
          const validArticles = batchResults
            .filter((article) => article !== null)
            .flat();
          loadedArticles.push(...validArticles);
        }

        // Files are already sorted by the index (newest first)
        setArticles(loadedArticles);
        console.log(loadedArticles[0]);
      } catch (error) {
        console.error("Error loading news articles:", error);
      } finally {
        console.error("lol");
      }
    };

    loadArticles();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Generate last 12 months for sidebar navigation
  const generateLast12Months = () => {
    const months = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthYear = date.toLocaleDateString("en-NZ", {
        month: "long",
        year: "numeric"
      });
      const monthId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({ monthYear, monthId, date });
    }
    
    return months;
  };

  // Group articles by month
  const groupArticlesByMonth = (articles: NewsArticle[]) => {
    const grouped: { [key: string]: NewsArticle[] } = {};
    
    articles.forEach(article => {
      const date = new Date(article.publicationDate);
      const monthId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped[monthId]) {
        grouped[monthId] = [];
      }
      grouped[monthId].push(article);
    });
    
    return grouped;
  };

  const months = generateLast12Months();
  const groupedArticles = groupArticlesByMonth(articles);

  const scrollToMonth = (monthId: string) => {
    const element = document.getElementById(monthId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
   

      <div className="relative w-full h-[400px] overflow-hidden border-y ">
      
        <div className="absolute inset-0 flex flex-col justify-center items-center z-10 pointer-events-none">
          <h1 className="pb-2 font-semibold text-4xl text-white drop-shadow-lg">Paperboy</h1>
          <p className="text-xl pt-0 text-white/60 drop-shadow-md text-center max-w-xl">
            The latest political news from New Zealand, freshly squeezed from parliament.
          </p>
          <CountdownPill />
        </div>
      </div>

      <section className="grid grid-cols-[264px_1fr]  max-w-[1024px] mx-auto max-xl:grid-cols-1 max-xl:mx-4 border-x">
        <div>
          <div className=" min-h-screen sticky top-0 max-xl:hidden border-r">
            <h3 className="font-semibold text-lg p-6 border-b">Browse by Month</h3>
            <nav className="flex flex-col gap-2">
              {months.map(({ monthYear, monthId }) => {
                const hasArticles = groupedArticles[monthId] && groupedArticles[monthId].length > 0;
                return (
                  <button
                    key={monthId}
                    onClick={() => scrollToMonth(monthId)}
                    className={`text-left p-6 py-2 first:pt-6 rounded transition-colors ${
                      hasArticles 
                        ? 'hover:bg-gray-800 text-gray-300 hover:text-white' 
                        : 'text-gray-600 cursor-not-allowed'
                    }`}
                    disabled={!hasArticles}
                  >
                    {monthYear}
                    {hasArticles && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({groupedArticles[monthId].length})
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
        <div className=" flex flex-col ">
          {months.map(({ monthYear, monthId }) => {
            const monthArticles = groupedArticles[monthId];
            
            if (!monthArticles || monthArticles.length === 0) {
              return null;
            }
            
            return (
              <div key={monthId} id={monthId} className="scroll-mt-8">
                <h2 className="text-xl font-semibold   text-white   p-6  border-b sticky top-0 bg-[#0a0a0a] z-20">
                  {monthYear}
                </h2>
                <div className="flex flex-col">
                  {monthArticles.map((article, index) => (
                    <Link
                      key={`${monthId}-${index}`}
                      to={`/${article.publicationDate}`}
                      className="block group hover:bg-gray-900/50 p-6 transition-colors border-b"
                    >
                      <article className="flex flex-col gap-2">
                        <aside className="text-xs text-gray-400">
                          {formatDate(article.publicationDate)}
                        </aside>
                        <h3 className="font-semibold text-xl group-hover:text-blue-400 group-hover:underline transition-colors">
                          {article.headline}
                        </h3>
                        <p
                          className="text-gray-400 text-sm line-clamp-3"
                          dangerouslySetInnerHTML={{
                            __html: formatTextWithBold(article.summary),
                          }}
                        />
                      </article>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <footer className="p-4 py-24"> <p className="text-center"> Made by <a href="https://walt.online" className="text-blue-400 hover:text-blue-300 underline">Walter Lim</a> and <a href="https://www.linkedin.com/in/jonas-kuhn-99526350/" className="text-blue-400 hover:text-blue-300 underline"> Jonas Kuhn</a></p></footer>
    </>
  );
}
