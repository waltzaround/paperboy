import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatTextWithBold } from "@/lib/utils";
import { updatePageSEO, DEFAULT_SEO } from "@/lib/seo";
import { Header } from "./header";


function CountdownPill() {
  const [timeLeft, setTimeLeft] = useState("");
  const [nextMeeting, setNextMeeting] = useState<Date | null>(null);

  useEffect(() => {
    // Hardcoded parliament meeting dates from RSS feed
    const parliamentMeetings = [
      new Date("2025-09-16T14:00:00+12:00"),
      new Date("2025-09-17T14:00:00+12:00"),
      new Date("2025-09-18T14:00:00+12:00"),
      new Date("2025-10-07T14:00:00+13:00"),
      new Date("2025-10-08T14:00:00+13:00"),
      new Date("2025-10-09T14:00:00+13:00"),
      new Date("2025-10-14T14:00:00+13:00"),
      new Date("2025-10-15T14:00:00+13:00"),
      new Date("2025-10-16T14:00:00+13:00"),
      new Date("2025-10-21T14:00:00+13:00"),
      new Date("2025-10-22T14:00:00+13:00"),
      new Date("2025-10-23T14:00:00+13:00"),
      new Date("2025-11-04T14:00:00+13:00")
    ];

    const now = new Date();
    const futureMeetings = parliamentMeetings.filter(date => date > now);
    
    if (futureMeetings.length > 0) {
      setNextMeeting(futureMeetings[0]);
    }
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
      Parliament meets in: <span className="font-semibold italic text-white">{timeLeft}</span>
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

  return (
    <>
      <Header />

      <div className="relative w-full h-[600px] overflow-hidden border-y mb-6">
      
        <div className="absolute inset-0 flex flex-col justify-center items-center z-10 pointer-events-none">
          <h1 className="pb-2 font-semibold text-4xl text-white drop-shadow-lg">Paperboy</h1>
          <p className="text-xl pt-0 text-white/90 drop-shadow-md text-center max-w-xl">
            The latest political news from New Zealand, freshly squeezed from parliament.
          </p>
          <CountdownPill />
        </div>
      </div>

      <section className="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1  gap-4  max-w-[1600px] mx-auto  max-2xl:mx-4 max-md:mx-4 max-sm:px-2 ">
        {articles.map((article, index) => (
          <Link
            key={index}
            to={`/${article.publicationDate}`}
            className="block group hover:bg-gray-900/50 p-6 transition-colors border rounded-lg"
          >
            <article className="flex flex-col gap-2">
              <aside className="text-xs text-gray-400">
                {formatDate(article.publicationDate)}
              </aside>
              <h2 className="font-semibold text-xl group-hover:text-blue-400 group-hover:underline transition-colors">
                {article.headline}
              </h2>
              <p
                className="text-gray-400 text-sm line-clamp-3"
                dangerouslySetInnerHTML={{
                  __html: formatTextWithBold(article.summary),
                }}
              />
            </article>
          </Link>
        ))}
      </section>
      <footer className="p-4 py-24"> <p className="text-center"> Made by <a href="https://walt.online" className="text-blue-400 hover:text-blue-300 underline">Walter Lim</a> and <a href="https://www.linkedin.com/in/jonas-kuhn-99526350/" className="text-blue-400 hover:text-blue-300 underline"> Jonas Kuhn</a></p></footer>
    </>
  );
}
