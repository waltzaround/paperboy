import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Quote, User, ExternalLink, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTextWithBold, splitIntoParagraphs } from "@/lib/utils";
import { updatePageSEO, addStructuredData, generateArticleSEO, createArticleStructuredData } from "@/lib/seo";
import { Header } from "./header";

interface KeyExchange {
  speaker: string;
  quote: string;
}

interface NewsArticle {
  headline: string;
  publicationDate: string;
  summary: string;
  topicSummaries: Array<{
    topic: string;
    content: string;
    keyExchanges?: KeyExchange[];
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

        // Set up SEO for article page
        if (article) {
          const currentUrl = window.location.href;
          const seoConfig = generateArticleSEO(
            article.headline,
            article.summary,
            article.publicationDate,
            article.tags || [],
            currentUrl
          );
          
          updatePageSEO(seoConfig);

          // Add structured data
          const structuredData = createArticleStructuredData(
            article.headline.replace(/<[^>]*>/g, '').trim(),
            article.summary.replace(/<[^>]*>/g, '').trim(),
            new Date(article.publicationDate).toISOString(),
            currentUrl,
            article.tags,
            "New Zealand Politics"
          );
          
          addStructuredData(structuredData);
        }
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

  const generateSourceUrl = (dateString: string) => {
    // Convert from 2025-05-06 format to 20250506 format for the URL
    const formattedDate = dateString.replace(/-/g, '');
    return `https://www.parliament.nz/en/pb/hansard-debates/rhr/combined/HansD_${formattedDate}_${formattedDate}`;
  };

  const handleShare = async () => {
    if (!article) return;

    const shareData = {
      title: article.headline.replace(/<[^>]*>/g, '').trim(),
      text: article.summary.replace(/<[^>]*>/g, '').trim(),
      url: window.location.href,
    };

    try {
      // Check if Web Share API is supported
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy URL to clipboard
        await navigator.clipboard.writeText(window.location.href);
        
        // Show a temporary success message (you could implement a toast here)
        const button = document.querySelector('[data-share-button]') as HTMLButtonElement;
        if (button) {
          const originalText = button.textContent;
          button.textContent = 'Copied!';
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback to copying URL if share fails
      try {
        await navigator.clipboard.writeText(window.location.href);
        const button = document.querySelector('[data-share-button]') as HTMLButtonElement;
        if (button) {
          const originalText = button.textContent;
          button.textContent = 'Copied!';
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        }
      } catch (clipboardError) {
        console.error('Error copying to clipboard:', clipboardError);
      }
    }
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

  return (<>
    <Header/>
    <div className="border-t"></div>
    <div className="mx-auto max-w-[800px]  border-x">
      <div className="border-b flex justify-between">
      <Link to="/" className="">
        <Button variant="ghost" className="p-4 rounded-none border-r">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </Link>
      <Button 
        variant="ghost" 
        className="p-4 rounded-none border-l" 
        onClick={handleShare}
        data-share-button
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </Button>
      </div>

      <article className="space-y-6">
        <header className="space-y-4 p-6">
     
          <h1 
            className="font-semibold text-4xl leading-tight tracking-tighter"
            dangerouslySetInnerHTML={{ __html: formatTextWithBold(article.headline) }}
          />
          <div className="flex gap-6 items-center py-4 border-y border-gray-700/30">
            <aside className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> {formatDate(article.publicationDate)}
            </aside>
            <aside className="text-xs text-gray-400 flex items-center gap-1">
              <User className="w-4 h-4" /> Gemini Pro
            </aside>
            <aside className="text-xs text-blue-400">
              <a 
                href={generateSourceUrl(article.publicationDate)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-gray-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />  Source
              </a>
            </aside>
          </div>
          <p 
            className="text-sm text-gray-400 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatTextWithBold(article.summary) }}
          />
      
        </header>

        <div className="flex flex-col gap-24 mt-16  p-6 border-t">
          {(article.topicSummaries || []).map((topic, index) => (
            <section key={index} className="flex flex-col gap-1">
              <h3 
                className="text-2xl text-balance font-semibold text-gray-100 mb-2  tracking-tighter"
                dangerouslySetInnerHTML={{ __html: formatTextWithBold(topic.topic) }}
              />
              <div className="text-gray-400 leading-relaxed text-sm space-y-4">
                {splitIntoParagraphs(topic.content).map((paragraph, paragraphIndex) => (
                  <p 
                    key={paragraphIndex}
                    dangerouslySetInnerHTML={{ __html: formatTextWithBold(paragraph) }}
                  />
                ))}
              </div>
              {topic.keyExchanges && topic.keyExchanges.length > 0 && (
                <div className="mt-6 space-y-4">
                  {topic.keyExchanges.map((exchange, exchangeIndex) => {
                    const isLeftWing = exchange.speaker.includes('Labour') || 
                           
                                     exchange.speaker.includes('Te Pāti Māori');
                    const isRightWing = exchange.speaker.includes('National') || 
                                       exchange.speaker.includes('ACT') || 
                                       exchange.speaker.includes('NZ First');
                                   const isGreen =    exchange.speaker.includes('Green') ;
                    
                    return (
                      <div 
                        key={exchangeIndex} 
                        className={`relative p-4 rounded-lg border-l-4 ${
                          isLeftWing 
                            ? 'bg-red-950/20 border-l-red-500' 
                            : isRightWing 
                            ? 'bg-blue-950/20 border-l-blue-500'
                            : isGreen
                            ? 'bg-green-950/20 border-l-green-500'
                            : 'bg-gray-800/20 border-l-gray-500'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 p-2 rounded-full ${
                            isLeftWing 
                              ? 'bg-red-500/10' 
                              : isRightWing 
                              ? 'bg-blue-500/10'
                              : 'bg-gray-500/10'
                          }`}>
                            <Quote className={`w-4 h-4 ${
                              isLeftWing 
                                ? 'text-red-400' 
                                : isRightWing 
                                ? 'text-blue-400'
                                : isGreen
                                ? 'text-green-400'
                                : 'text-gray-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-sm font-medium ${
                                isLeftWing 
                                  ? 'text-red-300' 
                                  : isRightWing 
                                  ? 'text-blue-300'
                                  : 'text-gray-300'
                              }`}>
                                {exchange.speaker}
                              </span>
                           
                            </div>
                            <blockquote className="text-gray-300 leading-relaxed italic text-xs">
                              "{exchange.quote}"
                            </blockquote>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>

        <footer className="p-6 border-t pb-24">
          <h3 className="text-2xl tracking-tight font-semibold  mb-3">Conclusion</h3>
          <p 
            className="text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatTextWithBold(article.conclusion) }}
          />
              <div className="flex flex-wrap gap-2">
            {(article.tags || []).map((tag, index) => (
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
    </div></>
  );
}
