import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function ArticleDetail() {
  const { date } = useParams<{ date: string }>();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadArticle = async () => {
      if (!date) return;
      
      try {
        // Convert date format from 2025-08-19 to 20250819
        const filename = date.replace(/-/g, '') + '.json';
        const response = await fetch(`/news/${filename}`);
        
        if (!response.ok) {
          throw new Error('Article not found');
        }
        
        const articleData = await response.json();
        // Handle array format from scraper
        const article = Array.isArray(articleData) ? articleData[0] : articleData;
        setArticle(article);
      } catch (error) {
        console.error('Error loading article:', error);
        setError('Article not found');
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [date]);

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
      <div className="mx-auto max-w-[960px] p-4">
        <div className="text-center text-gray-400">Loading article...</div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="mx-auto max-w-[960px] p-4">
        <Link to="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        <div className="text-center text-red-400">
          <h1 className="text-2xl font-semibold mb-2">Article Not Found</h1>
          <p>The requested article could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[960px] p-4 mb-24">
      <Link to="/">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </Link>

      <article className="space-y-6">
        <header className="space-y-4">
          <aside className="text-sm text-gray-400">
            {formatDate(article.publicationDate)}
          </aside>
          <h1 
            className="font-semibold text-4xl leading-tight"
            dangerouslySetInnerHTML={{ __html: formatTextWithBold(article.headline) }}
          />
          <p 
            className="text-xl text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatTextWithBold(article.summary) }}
          />
      
        </header>

        <div className="space-y-8 mt-24">
          {article.topicSummaries.map((topic, index) => (
            <section key={index} className="flex flex-col gap-1">
              <h3 
                className="text-xl font-semibold text-gray-100"
                dangerouslySetInnerHTML={{ __html: formatTextWithBold(topic.topic) }}
              />
              <div 
                className="text-gray-400 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatTextWithBold(topic.content) }}
              />
              {/* <div className="flex flex-wrap gap-2">
                {topic.tags.map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div> */}
            </section>
          ))}
        </div>

        <footer className="pt-6 border-t border-gray-700">
          <h3 className="text-lg font-semibold text-gray-200 mb-3">Conclusion</h3>
          <p 
            className="text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatTextWithBold(article.conclusion) }}
          />
              <div className="flex flex-wrap gap-2">
            {article.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-800 text-gray-300 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </footer>
      </article>
    </div>
  );
}
