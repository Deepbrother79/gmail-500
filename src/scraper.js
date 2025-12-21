import puppeteer from '@cloudflare/puppeteer';
import { CONFIG } from './config.js';

/**
 * Scrape dati da Gmail500 usando Puppeteer
 * @param {Fetcher} browserBinding - Browser binding da Cloudflare
 * @returns {Promise<{success: boolean, price: number, count: number, timestamp: string}>}
 */
export async function scrapeGmail500(browserBinding) {
  let browser = null;
  let lastError = null;

  // Retry logic
  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(`Scrape attempt ${attempt}/${CONFIG.MAX_RETRIES}`);

      // Launch browser
      browser = await puppeteer.launch(browserBinding);
      console.log('Browser launched successfully');

      const page = await browser.newPage();

      // Setup listener PRIMA di navigare alla pagina
      const responsePromise = page.waitForResponse(
        response => {
          const url = response.url();
          return url.includes(CONFIG.API_URL_PATTERN) && response.status() === 200;
        },
        { timeout: CONFIG.BROWSER_TIMEOUT }
      );

      // Naviga alla pagina
      console.log(`Navigating to ${CONFIG.TARGET_URL}...`);
      await page.goto(CONFIG.TARGET_URL, {
        waitUntil: 'networkidle0',
        timeout: CONFIG.BROWSER_TIMEOUT,
      });

      // Cattura risposta API
      console.log('Waiting for API response...');
      const response = await responsePromise;
      const data = await response.json();

      console.log('API Response received:', JSON.stringify(data));

      // Valida ed estrai dati
      if (data.successful && data.data) {
        const result = {
          success: true,
          price: data.data.price,
          count: data.data.count,
          timestamp: new Date().toISOString(),
        };

        console.log('Scraping successful:', result);
        return result;
      }

      throw new Error(`Invalid API response: ${JSON.stringify(data)}`);

    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);

      // Se non è l'ultimo tentativo, aspetta prima di riprovare
      if (attempt < CONFIG.MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

    } finally {
      // Chiudi sempre il browser
      if (browser) {
        try {
          await browser.close();
          console.log('Browser closed');
        } catch (e) {
          console.error('Failed to close browser:', e.message);
        }
        browser = null;
      }
    }
  }

  // Tutti i tentativi falliti
  throw new Error(
    `Scraping failed after ${CONFIG.MAX_RETRIES} attempts. Last error: ${lastError?.message}`
  );
}
