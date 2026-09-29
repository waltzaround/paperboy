// Posts a run status report to a Discord webhook. Uses only fetch.

// Function to send Discord webhook
export async function sendDiscordWebhook(webhookUrl, status, details) {
  if (!webhookUrl) {
    console.log('Discord webhook URL not configured, skipping webhook notification');
    return;
  }

  try {
    const embed = {
      title: "📰 Paperboy Scraper Status Report",
      color: status === 'success' ? 0x00ff00 : status === 'partial' ? 0xffaa00 : 0xff0000,
      timestamp: new Date().toISOString(),
      fields: [
        {
          name: "Status",
          value: status === 'success' ? "✅ Success" : status === 'partial' ? "⚠️ Partial Success" : "❌ Failed",
          inline: true
        },
        {
          name: "Date Range",
          value: details.dateRange || "N/A",
          inline: true
        },
        {
          name: "Articles Processed",
          value: details.articlesProcessed?.toString() || "0",
          inline: true
        }
      ]
    };

    if (details.successfulDates && details.successfulDates.length > 0) {
      embed.fields.push({
        name: "✅ Successfully Scraped",
        value: details.successfulDates.join(', '),
        inline: false
      });
    }

    if (details.failedDates && details.failedDates.length > 0) {
      embed.fields.push({
        name: "❌ Failed to Scrape",
        value: details.failedDates.join(', '),
        inline: false
      });
    }

    if (details.errors && details.errors.length > 0) {
      embed.fields.push({
        name: "🐛 Errors",
        value: details.errors.slice(0, 3).join('\n'),
        inline: false
      });
    }

    if (details.totalFiles) {
      embed.fields.push({
        name: "📁 Total Files in Index",
        value: details.totalFiles.toString(),
        inline: true
      });
    }

    if (details.githubPushed !== undefined) {
      embed.fields.push({
        name: "🐙 GitHub Push",
        value: details.githubPushed ? "✅ Success" : "❌ Failed",
        inline: true
      });
    }

    const payload = {
      embeds: [embed]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('Discord webhook sent successfully');
    } else {
      console.error('Failed to send Discord webhook:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error sending Discord webhook:', error.message);
  }
}
