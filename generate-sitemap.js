import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateSitemap() {
  const baseUrl = 'https://paperboy.nz';
  const urls = [];

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
    // Read news index to get all articles
    const indexPath = path.join(__dirname, 'public/news/index.json');
    if (fs.existsSync(indexPath)) {
      const newsFiles = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      
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
    console.error('Error reading news index:', error);
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

  const sitemapContent = `${xmlHeader}\n${urlsetOpen}\n${urlEntries}\n${urlsetClose}`;

  // Save sitemap to public directory
  const sitemapPath = path.join(__dirname, 'public/sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemapContent, 'utf8');
  
  console.log(`✅ Sitemap generated with ${urls.length} URLs`);
  console.log(`📍 Saved to: ${sitemapPath}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSitemap().catch(console.error);
}

export { generateSitemap };
