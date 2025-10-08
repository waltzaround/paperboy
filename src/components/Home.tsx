import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatTextWithBold } from "@/lib/utils";
import { updatePageSEO, DEFAULT_SEO } from "@/lib/seo";



function CountdownPill() {
  const [timeLeft, setTimeLeft] = useState("");
  const [nextMeeting, setNextMeeting] = useState<Date | null>(null);

  useEffect(() => {
    // Parliament meeting schedule:
    // Tuesday: 2pm to 6pm, 6pm to 7:30pm, 7:30pm to 10pm
    // Wednesday: 2pm to 6pm, 6pm to 7:30pm, 7:30pm to 10pm  
    // Thursday: 2pm to 6pm, none, none

    // Calculate next parliament meeting based on weekly schedule
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentHour = now.getHours();
    
    // Find next meeting time
    let nextMeetingDate: Date | null = null;
    
    // Check if today is a meeting day and if there's still time
    if (currentDay === 2) { // Tuesday
      if (currentHour < 14) { // Before 2pm
        nextMeetingDate = new Date(now);
        nextMeetingDate.setHours(14, 0, 0, 0);
      }
    } else if (currentDay === 3) { // Wednesday  
      if (currentHour < 14) { // Before 2pm
        nextMeetingDate = new Date(now);
        nextMeetingDate.setHours(14, 0, 0, 0);
      }
    } else if (currentDay === 4) { // Thursday
      if (currentHour < 14) { // Before 2pm
        nextMeetingDate = new Date(now);
        nextMeetingDate.setHours(14, 0, 0, 0);
      }
    }
    
    // If no meeting today, find next Tuesday
    if (!nextMeetingDate) {
      const daysUntilTuesday = (2 - currentDay + 7) % 7;
      const nextTuesday = new Date(now);
      nextTuesday.setDate(now.getDate() + (daysUntilTuesday === 0 ? 7 : daysUntilTuesday));
      nextTuesday.setHours(14, 0, 0, 0);
      nextMeetingDate = nextTuesday;
    }
    
    setNextMeeting(nextMeetingDate);
  }, []);

  useEffect(() => {
    if (!nextMeeting) return;

    const updateCountdown = () => {
      const now = new Date();
      const difference = nextMeeting.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${minutes}m ${seconds}s`);
        }
      } else {
        setTimeLeft("Parliament is meeting now!");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextMeeting]);

  if (!nextMeeting) {
    return (
      <div className="px-4 py-2 rounded-full border border-white/20 mt-4 text-sm">
        No upcoming parliament meetings scheduled
      </div>
    );
  }

  return (
    <div className="px-4 py-2 rounded-full border border-white/20 mt-4 text-sm">
      Parliament usually meets in: <span className="font-semibold italic text-white">{timeLeft}</span>
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
   

      <div className="relative w-full h-[400px] overflow-hidden border-y mb-6">
      
        <div className="absolute inset-0 flex flex-col justify-center items-center z-10 pointer-events-none">
          <h1 className="pb-2 font-semibold text-4xl text-white drop-shadow-lg">Paperboy</h1>
          <p className="text-xl pt-0 text-white/90 drop-shadow-md text-center max-w-xl">
            The latest political news from New Zealand, freshly squeezed from parliament.
          </p>
          <CountdownPill />
        </div>
      </div>

      <section className="grid grid-cols-[264px_1fr] gap-4 max-w-[1024px] mx-auto max-xl:grid-cols-1 max-xl:mx-4">
        <div>
          <div className=" p-6 rounded-lg h-fit sticky top-4 max-xl:hidden">
            <h3 className="font-semibold text-lg mb-4">Browse by Month</h3>
            <nav className="flex flex-col gap-2">
              {months.map(({ monthYear, monthId }) => {
                const hasArticles = groupedArticles[monthId] && groupedArticles[monthId].length > 0;
                return (
                  <button
                    key={monthId}
                    onClick={() => scrollToMonth(monthId)}
                    className={`text-left px-3 py-2 rounded transition-colors ${
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
        <div className=" flex flex-col gap-8">
          {months.map(({ monthYear, monthId }) => {
            const monthArticles = groupedArticles[monthId];
            
            if (!monthArticles || monthArticles.length === 0) {
              return null;
            }
            
            return (
              <div key={monthId} id={monthId} className="scroll-mt-8">
                <h2 className="text-2xl   text-white   p-6 border-x border-t  rounded-t-lg border-b">
                  {monthYear}
                </h2>
                <div className="flex flex-col">
                  {monthArticles.map((article, index) => (
                    <Link
                      key={`${monthId}-${index}`}
                      to={`/${article.publicationDate}`}
                      className="block group hover:bg-gray-900/50 p-6 transition-colors border-x last:rounded-b-lg border-b"
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
