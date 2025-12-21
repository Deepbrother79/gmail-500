/**
 * Gmail500 Scraper per GitHub Actions
 * Soluzione GRATUITA alternativa a Cloudflare Workers
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// Configurazione
const CONFIG = {
  TARGET_URL: 'https://gmail500.com/email/3011',
  API_URL_PATTERN: '/api/v1/product/get/3011',
  BROWSER_TIMEOUT: 60000, // 60 secondi
  MAX_RETRIES: 3,
};

/**
 * Scrape dati da Gmail500
 */
async function scrapeGmail500() {
  let browser = null;
  let lastError = null;

  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(`\n🔄 Tentativo ${attempt}/${CONFIG.MAX_RETRIES}`);

      // Launch browser con configurazione GitHub Actions
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      console.log('✅ Browser lanciato');

      const page = await browser.newPage();

      // Setup listener PRIMA di navigare
      const responsePromise = page.waitForResponse(
        response => {
          const url = response.url();
          return url.includes(CONFIG.API_URL_PATTERN) && response.status() === 200;
        },
        { timeout: CONFIG.BROWSER_TIMEOUT }
      );

      // Naviga alla pagina
      console.log(`🌐 Navigando a ${CONFIG.TARGET_URL}...`);
      await page.goto(CONFIG.TARGET_URL, {
        waitUntil: 'networkidle0',
        timeout: CONFIG.BROWSER_TIMEOUT,
      });

      // Cattura risposta API
      console.log('⏳ Aspettando risposta API...');
      const response = await responsePromise;
      const data = await response.json();

      console.log('📦 Risposta API ricevuta:', JSON.stringify(data, null, 2));

      // Valida ed estrai
      if (data.successful && data.data) {
        const result = {
          success: true,
          price: data.data.price,
          count: data.data.count,
          timestamp: new Date().toISOString(),
        };

        console.log('✅ Scraping completato:', result);
        await browser.close();
        return result;
      }

      throw new Error(`Risposta API invalida: ${JSON.stringify(data)}`);

    } catch (error) {
      lastError = error;
      console.error(`❌ Tentativo ${attempt} fallito:`, error.message);

      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.error('Errore chiusura browser:', e.message);
        }
        browser = null;
      }

      if (attempt < CONFIG.MAX_RETRIES) {
        const delay = Math.min(2000 * attempt, 10000);
        console.log(`⏰ Attendo ${delay}ms prima del prossimo tentativo...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Scraping fallito dopo ${CONFIG.MAX_RETRIES} tentativi. Ultimo errore: ${lastError?.message}`
  );
}

/**
 * Salva dati su Supabase
 */
async function saveToSupabase(data) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Secrets Supabase non configurati. Vai su GitHub > Settings > Secrets and variables > Actions'
    );
  }

  console.log('\n💾 Connessione a Supabase...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const record = {
    price: data.price,
    count: data.count,
    timestamp: data.timestamp,
    created_at: new Date().toISOString(),
  };

  console.log('📝 Inserendo record:', record);

  const { data: insertedData, error } = await supabase
    .from('gmail500_products')
    .insert([record])
    .select();

  if (error) {
    throw new Error(`Errore Supabase: ${error.message}`);
  }

  console.log('✅ Dati salvati su Supabase:', insertedData);
  return { success: true, data: insertedData };
}

/**
 * Main
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Gmail500 Scraper - GitHub Actions    ║');
  console.log('║  Soluzione GRATUITA                    ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n🕐 Esecuzione: ${new Date().toISOString()}`);

  try {
    // 1. Scrape
    const scrapedData = await scrapeGmail500();

    // 2. Salva
    const saveResult = await saveToSupabase(scrapedData);

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  ✅ COMPLETATO CON SUCCESSO            ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('\nDati estratti:');
    console.log(`  💰 Prezzo: $${scrapedData.price}`);
    console.log(`  📦 Quantità: ${scrapedData.count}`);
    console.log(`  🕐 Timestamp: ${scrapedData.timestamp}`);

    process.exit(0);

  } catch (error) {
    console.error('\n╔════════════════════════════════════════╗');
    console.error('║  ❌ ERRORE                             ║');
    console.error('╚════════════════════════════════════════╝');
    console.error('\nDettagli:', error.message);
    console.error('Stack:', error.stack);

    process.exit(1);
  }
}

// Esegui
main();
