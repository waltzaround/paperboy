interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: string;
}

export async function generateSitemap(): Promise<string> {
  const baseUrl = 'https://paperboy.nz';
  const urls: SitemapUrl[] = [];

  // Add homepage
  urls.push({
    loc: baseUrl,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: '1.0'
  });

  // Add about page
  urls.push({
    loc: `${baseUrl}/about`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: '0.8'
  });

  try {
    // Fetch news index to get all articles
    const indexResponse = await fetch('/news/index.json');
    if (indexResponse.ok) {
      const newsFiles: string[] = await indexResponse.json();
      
      for (const filename of newsFiles) {
        // Convert filename (20250131.json) to date format (2025-01-31)
        const dateMatch = filename.match(/(\d{4})(\d{2})(\d{2})\.json/);
        if (dateMatch) {
          const [, year, month, day] = dateMatch;
          const dateStr = `${year}-${month}-${day}`;
          
          urls.push({
            loc: `${baseUrl}/${dateStr}`,
            lastmod: `${year}-${month}-${day}`,
            changefreq: 'weekly',
            priority: '0.9'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }

  // Generate XML sitemap
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  const urlsetClose = '</urlset>';

  const urlEntries = urls.map(url => {
    let entry = `  <url>\n    <loc>${url.loc}</loc>`;
    
    if (url.lastmod) {
      entry += `\n    <lastmod>${url.lastmod}</lastmod>`;
    }
    
    if (url.changefreq) {
      entry += `\n    <changefreq>${url.changefreq}</changefreq>`;
    }
    
    if (url.priority) {
      entry += `\n    <priority>${url.priority}</priority>`;
    }
    
    entry += '\n  </url>';
    return entry;
  }).join('\n');

  return `${xmlHeader}\n${urlsetOpen}\n${urlEntries}\n${urlsetClose}`;
}

// Function to save sitemap (for build process)
export async function saveSitemap(): Promise<void> {
  try {
    const sitemapContent = await generateSitemap();
    
    // In a real deployment, you'd save this to public/sitemap.xml
    // For now, we'll log it or handle it in the build process
    console.log('Generated sitemap:', sitemapContent);
    
    // You could also save it to localStorage for development
    if (typeof window !== 'undefined') {
      localStorage.setItem('sitemap', sitemapContent);
    }
  } catch (error) {
    console.error('Error saving sitemap:', error);
  }
}
