interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

interface StructuredDataArticle {
  "@context": string;
  "@type": string;
  headline: string;
  description: string;
  author: {
    "@type": string;
    name: string;
  };
  publisher: {
    "@type": string;
    name: string;
    logo: {
      "@type": string;
      url: string;
    };
  };
  datePublished: string;
  dateModified?: string;
  mainEntityOfPage: {
    "@type": string;
    "@id": string;
  };
  keywords?: string[];
  articleSection?: string;
}

export function updatePageSEO(config: SEOConfig) {
  // Update document title
  document.title = config.title;

  // Helper function to update or create meta tags
  const updateMetaTag = (name: string, content: string, property = false) => {
    const attribute = property ? 'property' : 'name';
    let meta = document.querySelector(`meta[${attribute}="${name}"]`);
    
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attribute, name);
      document.head.appendChild(meta);
    }
    
    meta.setAttribute('content', content);
  };

  // Basic SEO meta tags
  updateMetaTag('description', config.description);
  if (config.keywords?.length) {
    updateMetaTag('keywords', config.keywords.join(', '));
  }
  if (config.author) {
    updateMetaTag('author', config.author);
  }

  // Open Graph meta tags
  updateMetaTag('og:title', config.title, true);
  updateMetaTag('og:description', config.description, true);
  updateMetaTag('og:type', config.type || 'website', true);
  updateMetaTag('og:site_name', 'Paperboy - NZ Political News', true);
  
  if (config.url) {
    updateMetaTag('og:url', config.url, true);
  }
  
  if (config.image) {
    updateMetaTag('og:image', config.image, true);
    updateMetaTag('og:image:alt', config.title, true);
  }

  if (config.publishedTime) {
    updateMetaTag('article:published_time', config.publishedTime, true);
  }
  
  if (config.modifiedTime) {
    updateMetaTag('article:modified_time', config.modifiedTime, true);
  }

  if (config.section) {
    updateMetaTag('article:section', config.section, true);
  }

  if (config.tags?.length) {
    // Remove existing article:tag meta tags
    document.querySelectorAll('meta[property="article:tag"]').forEach(tag => tag.remove());
    // Add new tags
    config.tags.forEach(tag => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'article:tag');
      meta.setAttribute('content', tag);
      document.head.appendChild(meta);
    });
  }

  // Twitter Card meta tags
  updateMetaTag('twitter:card', 'summary_large_image');
  updateMetaTag('twitter:title', config.title);
  updateMetaTag('twitter:description', config.description);
  
  if (config.image) {
    updateMetaTag('twitter:image', config.image);
  }
}

export function addStructuredData(article: StructuredDataArticle) {
  // Remove existing structured data
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }

  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(article);
  document.head.appendChild(script);
}

export function createArticleStructuredData(
  headline: string,
  description: string,
  publishedDate: string,
  url: string,
  keywords?: string[],
  section?: string
): StructuredDataArticle {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline,
    description,
    author: {
      "@type": "Organization",
      name: "Paperboy NZ"
    },
    publisher: {
      "@type": "Organization",
      name: "Paperboy",
      logo: {
        "@type": "ImageObject",
        url: `${window.location.origin}/emoji-favicon-fire.svg`
      }
    },
    datePublished: publishedDate,
    dateModified: publishedDate,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url
    },
    keywords,
    articleSection: section || "New Zealand Politics"
  };
}

// Default SEO configuration for the site
export const DEFAULT_SEO: SEOConfig = {
  title: "Paperboy - Latest New Zealand Political News",
  description: "Stay informed with the latest political news from New Zealand Parliament. Fresh analysis and summaries of parliamentary debates, delivered daily.",
  keywords: ["New Zealand politics", "Parliament", "political news", "NZ government", "parliamentary debates", "political analysis"],
  author: "Paperboy NZ",
  type: "website"
};

// Generate article-specific SEO config
export function generateArticleSEO(
  headline: string,
  summary: string,
  publishedDate: string,
  tags: string[],
  url: string
): SEOConfig {
  // Clean HTML from headline and summary for meta tags
  const cleanText = (text: string) => text.replace(/<[^>]*>/g, '').trim();
  
  const cleanHeadline = cleanText(headline);
  const cleanSummary = cleanText(summary);
  
  return {
    title: `${cleanHeadline} | Paperboy - NZ Political News`,
    description: cleanSummary.length > 160 ? 
      cleanSummary.substring(0, 157) + '...' : 
      cleanSummary,
    keywords: [...tags, "New Zealand politics", "Parliament", "political news"],
    author: "Paperboy NZ",
    publishedTime: new Date(publishedDate).toISOString(),
    modifiedTime: new Date(publishedDate).toISOString(),
    section: "New Zealand Politics",
    tags: tags,
    url: url,
    type: "article"
  };
}
