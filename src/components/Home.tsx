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
        // Generate potential filenames based on date range
        const newsFiles: string[] = [];
        const startDate = new Date('2025-08-14');
        const endDate = new Date();
        
        // Generate all possible dates from start to end
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
          const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
          newsFiles.push(`${dateStr}.json`);
        }
        
        // Try to fetch each file, only keep successful ones
        const articlePromises = newsFiles.map(async (filename) => {
          try {
            const response = await fetch(`/news/${filename}`);
            if (response.ok) {
              return await response.json();
            }
            return null;
          } catch {
            return null;
          }
        });
        
        const results = await Promise.all(articlePromises);
        const loadedArticles = results.filter(article => article !== null);
        
        // Sort by publication date (newest first)
        loadedArticles.sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());
        setArticles(loadedArticles);
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

  if (loading) {
    return (
      <>
        <section className="mx-auto max-w-[960px]">
          <h1 className="p-4 font-semibold text-6xl">Paperboy</h1>
          <p className="p-4 text-xl pt-0">The latest political news from New Zealand</p>
        </section>
        <section className="p-4 mx-auto max-w-[960px]">
          <div className="text-center text-gray-400">Loading news articles...</div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="mx-auto max-w-[960px]">
        <h1 className="p-4 font-semibold text-6xl">Paperboy</h1>
        <p className="p-4 text-xl pt-0">The latest political news from New Zealand</p>
      </section>
      <section className="p-4 grid gap-4 mx-auto max-w-[960px]">
        {articles.map((article, index) => (
          <Link 
            key={index} 
            to={`/${article.publicationDate}`}
            className="block hover:bg-gray-900/50 p-4 rounded-lg transition-colors"
          >
            <article className="flex flex-col gap-2">
              <aside className="text-sm text-gray-400">{formatDate(article.publicationDate)}</aside>
              <h2 className="font-semibold text-2xl hover:text-blue-400 transition-colors">
                {article.headline}
              </h2>
              <p 
                className="text-gray-300"
                dangerouslySetInnerHTML={{ __html: formatTextWithBold(article.summary) }}
              />
            </article>
          </Link>
        ))}
      </section>
    </>
  );
}
