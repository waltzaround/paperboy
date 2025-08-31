# SEO Implementation Guide for Paperboy

## Overview
This document outlines the comprehensive SEO optimization implemented for the Paperboy NZ political news application.

## Implemented Features

### 1. Dynamic Meta Tags
- **Location**: `src/lib/seo.ts`
- **Features**:
  - Dynamic page titles and descriptions
  - Open Graph meta tags for social sharing
  - Twitter Card meta tags
  - Article-specific meta tags (published time, tags, etc.)
  - Automatic HTML cleaning for meta content

### 2. Structured Data (JSON-LD)
- **Implementation**: Articles include NewsArticle schema markup
- **Benefits**: Enhanced search result appearance with rich snippets
- **Data Included**:
  - Article headline and description
  - Publication date
  - Author (Paperboy NZ)
  - Publisher information
  - Keywords and article section

### 3. SEO-Optimized HTML Base
- **Location**: `index.html`
- **Features**:
  - Comprehensive default meta tags
  - Open Graph and Twitter Card defaults
  - Canonical URL specification
  - Proper robots meta tag
  - Language specification

### 4. Robots.txt
- **Location**: `public/robots.txt`
- **Configuration**:
  - Allows all crawlers
  - References sitemap location
  - Sets crawl delay to 1 second
  - Disallows raw news data directory

### 5. XML Sitemap Generation
- **Location**: `generate-sitemap.js`
- **Features**:
  - Automatic sitemap generation from news index
  - Proper priority and changefreq settings
  - Homepage, about page, and all articles included
  - Integrated into build process

## Usage

### For Home Page
```typescript
import { updatePageSEO, DEFAULT_SEO } from "@/lib/seo";

useEffect(() => {
  updatePageSEO({
    ...DEFAULT_SEO,
    url: window.location.href
  });
}, []);
```

### For Article Pages
```typescript
import { updatePageSEO, addStructuredData, generateArticleSEO, createArticleStructuredData } from "@/lib/seo";

// Generate SEO config
const seoConfig = generateArticleSEO(
  article.headline,
  article.summary,
  article.publicationDate,
  article.tags || [],
  currentUrl
);

// Update page SEO
updatePageSEO(seoConfig);

// Add structured data
const structuredData = createArticleStructuredData(
  cleanHeadline,
  cleanSummary,
  publishedDate,
  currentUrl,
  article.tags,
  "New Zealand Politics"
);

addStructuredData(structuredData);
```

## Build Process Integration

The sitemap is automatically generated during the build process:
```bash
npm run build  # Includes sitemap generation
npm run generate-sitemap  # Generate sitemap only
```

## SEO Best Practices Implemented

1. **Page Titles**: Descriptive, unique titles under 60 characters
2. **Meta Descriptions**: Compelling descriptions under 160 characters
3. **Structured Data**: NewsArticle schema for better search visibility
4. **Social Sharing**: Open Graph and Twitter Card optimization
5. **Sitemap**: Comprehensive XML sitemap for search engines
6. **Robots.txt**: Proper crawler guidance
7. **Canonical URLs**: Prevents duplicate content issues
8. **Semantic HTML**: Proper heading hierarchy and semantic elements

## Monitoring and Maintenance

### Google Search Console
- Submit sitemap: `https://paperboy.nz/sitemap.xml`
- Monitor crawl errors and indexing status
- Track search performance

### Regular Updates
- Sitemap regenerates automatically on build
- Meta tags update dynamically per article
- Structured data includes latest article information

## Performance Impact
- Minimal JavaScript overhead
- SEO functions run only on page load
- Structured data cached in DOM
- Sitemap generation happens at build time

## Future Enhancements
1. **Image SEO**: Add image alt tags and structured data
2. **Breadcrumbs**: Implement breadcrumb navigation with schema
3. **FAQ Schema**: Add FAQ structured data for common questions
4. **Local SEO**: Add organization schema for New Zealand context
5. **AMP Pages**: Consider AMP implementation for mobile performance
