// Parses a Hansard sitting-day transcript into the raw article shape that the
// news prompt consumes. Shared by the cron Worker and local scripts.
//
// cheerio/slim (htmlparser2 only) avoids the undici-based fetch helpers in the
// full cheerio entry point, which do not bundle for Workers.
import { load } from 'cheerio/slim';

// Parliament migrated Hansard to hansard.parliament.nz (a Blazor app backed by a
// JSON API). The site and API sit behind Radware bot protection, so the API has
// to be called from inside a real browser session that has passed the challenge.
export const HANSARD_ORIGIN = 'https://hansard.parliament.nz';

export function transcriptApiPath(date) {
  return `/api/resources/transcript/${date}`;
}

// Function to parse transcript HTML and extract a NewsArticle
export function parseNewsArticle(html, date) {
  const $ = load(html);

  // The transcript is a sequence of div.HpsHansard sections. Headings are
  // span.HpsProceedingHeading / span.HpsSubjectHeading; speeches are paragraphs
  // whose speaker is in span.HpsByToc or span.HpsBy, e.g.
  // "Hon LOUISE UPSTON (Leader of the House) (14:01)": <speech text>
  const headingSelector = '.HpsProceedingHeading, .HpsSubjectHeading, .HpsSubproceedingHeading, .HpsClauseHeading';
  const content = [];
  const allText = [];

  $('div.HpsHansard').each((i, section) => {
    const sectionText = $(section).text().trim();
    if (sectionText) {
      allText.push(sectionText);
    }

    $(section).children('p').each((j, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      if (!text) return;

      const $heading = $elem.find(headingSelector).first();
      if ($heading.length) {
        content.push({
          speaker: '',
          text: $heading.text().trim(),
          type: $heading.attr('class'),
          isHeading: true
        });
        return;
      }

      const $by = $elem.find('span.HpsByToc, span.HpsBy').first();
      if ($by.length) {
        const byText = $by.text().trim();
        const timeMatch = byText.match(/\((\d{1,2}:\d{2})\)/);
        const speaker = byText
          .replace(/\(\d{1,2}:\d{2}\)/, '')
          .replace(/:\s*$/, '')
          .trim();
        const speechText = text
          .slice(text.indexOf(byText) + byText.length)
          .replace(/^:\s*/, '')
          .trim();
        content.push({
          speaker,
          text: speechText,
          type: 'Speech',
          timestamp: timeMatch ? timeMatch[1] : null
        });
      } else if (text.length > 10) {
        const className = $elem.find('span[class]').first().attr('class') || 'general';
        content.push({ speaker: '', text, type: className });
      }
    });
  });

  // Headline: first subject heading is the sitting day title, e.g. "Thursday, 20 August 2026"
  const headline = $('.HpsSubjectHeading').first().text().trim() || `Hansard Debate ${date}`;

  // Extract summary from first meaningful paragraph
  const summary = content.find(item => !item.isHeading && item.text && item.text.length > 50)?.text?.substring(0, 200) + '...' || '';

  // Group content into topics based on headings
  const topicSummaries = [];
  let currentTopic = null;
  let currentContent = [];

  content.forEach(item => {
    if (item.isHeading) {
      // Save previous topic if it accumulated content
      if (currentTopic && currentContent.length > 0) {
        topicSummaries.push({
          topic: currentTopic,
          content: currentContent.map(c => `${c.speaker}: ${c.text}`).join('\n'),
          tags: []
        });
      }
      // Proceeding heading followed by a subject heading forms a combined topic
      // (e.g. "Business of the House — Business Statement")
      if (currentTopic && currentContent.length === 0 && item.type === 'HpsSubjectHeading') {
        currentTopic = `${currentTopic} — ${item.text}`;
      } else {
        currentTopic = item.text;
      }
      currentContent = [];
    } else if (currentTopic && item.text) {
      currentContent.push(item);
    }
  });

  // Add final topic
  if (currentTopic && currentContent.length > 0) {
    topicSummaries.push({
      topic: currentTopic,
      content: currentContent.map(c => `${c.speaker}: ${c.text}`).join('\n'),
      tags: []
    });
  }

  // Extract conclusion from last meaningful content
  const conclusion = content.slice(-3).find(item => item.text && item.text.length > 20)?.text || '';

  // Create full content text
  const fullContent = allText.join('\n\n') || content.map(item => `${item.speaker}: ${item.text}`).join('\n\n');

  return {
    headline,
    publicationDate: date,
    summary,
    topicSummaries,
    conclusion,
    tags: [],
    content,
    fullContent
  };
}
