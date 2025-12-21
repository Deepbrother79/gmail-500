import { scrapeGmail500 } from './scraper.js';
import { saveToSupabase } from './storage.js';

export default {
  /**
   * Scheduled event handler (Cron Trigger)
   * Viene eseguito ogni 10 minuti
   */
  async scheduled(event, env, ctx) {
    console.log('=== Cron trigger started ===');
    console.log('Scheduled time:', new Date(event.scheduledTime).toISOString());
    console.log('Cron pattern:', event.cron);

    try {
      // 1. Scrape dati da Gmail500
      console.log('Starting scraping process...');
      const scrapedData = await scrapeGmail500(env.BROWSER);
      console.log('Scraping completed successfully:', scrapedData);

      // 2. Salva su Supabase
      console.log('Saving to Supabase...');
      const saveResult = await saveToSupabase(scrapedData, env);
      console.log('Save completed successfully:', saveResult);

      console.log('=== Cron trigger completed successfully ===');

    } catch (error) {
      console.error('=== Cron trigger failed ===');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);

      // Re-throw per logging Cloudflare
      throw error;
    }
  },

  /**
   * HTTP fetch handler (per testing manuale)
   * Test: https://your-worker.workers.dev/?test=1
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Test endpoint
    if (url.searchParams.has('test')) {
      console.log('Manual test triggered via /?test=1');

      try {
        const scrapedData = await scrapeGmail500(env.BROWSER);
        const saveResult = await saveToSupabase(scrapedData, env);

        return new Response(JSON.stringify({
          success: true,
          scraped: scrapedData,
          saved: saveResult,
          timestamp: new Date().toISOString(),
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' },
        });

      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        }, null, 2), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Health check endpoint
    return new Response(JSON.stringify({
      status: 'ok',
      service: 'gmail500-scraper',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        test: '/?test=1 - Run scraper manually',
        health: '/ - This endpoint',
      },
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
