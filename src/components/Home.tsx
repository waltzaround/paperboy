import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatTextWithBold } from "@/lib/utils";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadArticles = async () => {
      try {
        // First, fetch the index of available files
        const indexResponse = await fetch('/news/index.json');
        if (!indexResponse.ok) {
          console.error('Failed to load index.json');
          setLoading(false);
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
                console.log('Successfully loaded:', filename);
                return await response.json();
              }
              return null;
            } catch {
              return null;
            }
          });

          const batchResults = await Promise.all(batchPromises);
          const validArticles = batchResults.filter(article => article !== null).flat();
          loadedArticles.push(...validArticles);
        }

        // Files are already sorted by the index (newest first)
        setArticles(loadedArticles);
        console.log(loadedArticles[0]);
      } catch (error) {
        console.error('Error loading news articles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadArticles();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };


  


  return (
    <> <header className="flex justify-between items-center"><a href="/" className="p-3 text-sm font-semibold">Paperboy</a> <div className="text-xs flex items-center gap-4"><a href="/about" className="p-4">About</a><a href="https://www.parliament.nz/en/calendar" target="_blank" className="p-4"> Calendar</a> <a href="https://github.com/waltzaround/paperboy" className="p-4">Source Code</a></div></header> <section className="mx-auto px-4 border border-b-0">
    <h1 className="p-4 pb-2 font-semibold text-4xl">Paperboy</h1>
    <p className="p-4 text-xl pt-0">The latest political news from New Zealand, straight from Parliament.</p>
  </section>
   
      <section className="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1  gap-4 m-8">
        {articles.map((article, index) => (
          <Link 
            key={index} 
            to={`/${article.publicationDate}`}
            className="block group hover:bg-gray-900/50 p-6 transition-colors border rounded-lg"
          >
            <article className="flex flex-col gap-2">
              <aside className="text-xs text-gray-400">{formatDate(article.publicationDate)}</aside>
              <h2 className="font-semibold text-xl group-hover:text-blue-400 group-hover:underline transition-colors">
                {article.headline}
              </h2>
              <p 
                className="text-gray-400 text-sm"
                dangerouslySetInnerHTML={{ __html: formatTextWithBold(article.summary) }}
              />
            </article>
          </Link>
        ))}
      </section>
    </>
  );
}
