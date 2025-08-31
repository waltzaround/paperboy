import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatTextWithBold } from "@/lib/utils";
import { Header } from "./header";
import Plasma from './Plasma';
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

  useEffect(() => {
    const loadArticles = async () => {
      try {
        // Generate potential filenames for a reasonable date range
        const newsFiles: string[] = [];
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, 0, 1); // January 1st of current year
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); // Include next month for flexibility

        // Generate all possible dates from start to end
        for (
          let date = new Date(startDate);
          date <= endDate;
          date.setDate(date.getDate() + 1)
        ) {
          const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
          newsFiles.push(`${dateStr}.json`);
        }

        console.log(
          "Attempting to load files from date range:",
          startDate.toISOString().slice(0, 10),
          "to",
          endDate.toISOString().slice(0, 10)
        );

        const loadedArticles: NewsArticle[] = [];

        // Try to fetch files in batches to avoid overwhelming the browser
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

        // Sort by publication date (newest first)
        loadedArticles.sort(
          (a, b) =>
            new Date(b.publicationDate).getTime() -
            new Date(a.publicationDate).getTime()
        );
        setArticles(loadedArticles);
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
        <Plasma 
          color="#333333"
          speed={0.6}
          direction="forward"
          scale={1.1}
          opacity={0.8}
          mouseInteractive={false}
        />
        <div className="absolute inset-0 flex flex-col justify-center items-center z-10 pointer-events-none">
          <h1 className="pb-2 font-semibold text-4xl text-white drop-shadow-lg">Paperboy</h1>
          <p className="text-xl pt-0 text-white/90 drop-shadow-md text-center max-w-2xl">
            The latest political news from New Zealand, straight from Parliament.
          </p>
          <div className="px-4 py-2 rounded-full border border-white/20 mt-4 text-sm">NZ Parliament will resume in: <span className="font-semibold italic text-white">12 hours</span></div>
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
    </>
  );
}
