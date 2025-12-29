/**
 * Gmail500 Scraper per GitHub Actions
 * Soluzione GRATUITA alternativa a Cloudflare Workers
 * Con Cloudflare bypass usando puppeteer-extra-plugin-stealth
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';

// Aggiungi plugin stealth per bypassare Cloudflare
puppeteer.use(StealthPlugin());

// Configurazione
const CONFIG = {
  TARGET_URL: 'https://gmail500.com/email/3011',
  API_URL_PATTERN: '/api/v1/product/get/3011',
  BROWSER_TIMEOUT: 60000, // 60 secondi
  MAX_RETRIES: 3,
};

/**
 * Scrape dati da Gmail500 - VERSIONE OTTIMIZZATA
 * Strategia: API Interception (più affidabile) + DOM Scraping come fallback
 */
async function scrapeGmail500() {
  let browser = null;
  let lastError = null;

  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(`\n🔄 Tentativo ${attempt}/${CONFIG.MAX_RETRIES}`);

      // Launch browser con configurazione ottimizzata per GitHub Actions
      // Con stealth plugin per bypassare Cloudflare
      browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled', // Nasconde automazione
        ],
      });

      console.log('✅ Browser lanciato');

      const page = await browser.newPage();

      // Logging delle richieste di rete per debug
      let requestCount = 0;
      page.on('request', request => {
        if (request.url().includes('gmail500.com')) {
          requestCount++;
          console.log(`📤 Request ${requestCount}: ${request.method()} ${request.url()}`);
        }
      });

      // === STRATEGIA 1: API INTERCEPTION (PRIMARIA) ===
      console.log('🎯 Strategia 1: Intercettazione API...');

      let apiData = null;
      let apiResolved = false;
      let responseCount = 0;

      // Setup listener PRIMA di navigare
      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('gmail500.com')) {
          responseCount++;
          console.log(`📥 Response ${responseCount}: ${response.status()} ${url}`);
        }

        if (url.includes(CONFIG.API_URL_PATTERN) && response.status() === 200) {
          try {
            const json = await response.json();
            console.log('✅ API Response intercettata:', JSON.stringify(json));
            apiData = json;
            apiResolved = true;
          } catch (e) {
            console.log('⚠️  Errore parsing JSON API:', e.message);
          }
        }
      });

      // Naviga alla pagina
      console.log(`🌐 Navigando a ${CONFIG.TARGET_URL}...`);
      await page.goto(CONFIG.TARGET_URL, {
        waitUntil: 'networkidle2', // Cambiato da networkidle0 per essere meno restrittivo
        timeout: CONFIG.BROWSER_TIMEOUT,
      });

      console.log(`✅ Pagina caricata! Richieste: ${requestCount}, Risposte: ${responseCount}`);

      // Aspetta che l'API risponda (con timeout più lungo)
      console.log('⏳ Aspettando risposta API...');
      const maxWaitTime = 15000; // 15 secondi
      const startTime = Date.now();
      while (!apiResolved && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (apiResolved) {
        console.log('✅ Risposta API ricevuta!');
      } else {
        console.log(`⚠️  API non ha risposto entro ${maxWaitTime}ms`);
      }

      // Se abbiamo i dati dall'API, usali
      if (apiData?.successful && apiData.data) {
        console.log('✅ Dati estratti da API interception');
        const result = {
          success: true,
          price: apiData.data.price,
          count: apiData.data.count,
          timestamp: new Date().toISOString(),
          method: 'api-interception',
        };

        console.log('✅ Scraping completato:', result);
        await browser.close();
        return result;
      }

      // === STRATEGIA 2: DOM SCRAPING (FALLBACK) ===
      console.log('🎯 Strategia 2: DOM Scraping fallback...');

      // Selettori CSS multipli come fallback
      const selectors = {
        quantity: [
          '#root > div.ant-layout.my-var-css > div:nth-child(2) > div > div > div > div:nth-child(1) > div.ant-ribbon-wrapper.my-var-css > div.ant-ribbon.ant-ribbon-placement-end > span',
          '.ant-ribbon span',
          '[class*="ribbon"] span'
        ],
        price: [
          '#root > div.ant-layout.my-var-css > div:nth-child(2) > div > div > div > div:nth-child(1) > div:nth-child(2) > h3',
          'h3[class*="price"]',
          'h3'
        ]
      };

      // Aspetta che la pagina sia pronta
      console.log('⏳ Aspettando rendering React...');
      await page.waitForTimeout(3000); // Wait più lungo per GitHub Actions

      // Prova tutti i selettori
      let count = null;
      let price = null;

      for (const qtySelector of selectors.quantity) {
        try {
          await page.waitForSelector(qtySelector, { timeout: 5000 });
          const text = await page.$eval(qtySelector, el => el.textContent.trim());
          const match = text.match(/(\d+)/);
          if (match) {
            count = parseInt(match[1]);
            console.log(`✅ Quantità trovata con selettore: ${qtySelector} = ${count}`);
            break;
          }
        } catch (e) {
          console.log(`⚠️  Selettore quantità fallito: ${qtySelector}`);
        }
      }

      for (const priceSelector of selectors.price) {
        try {
          await page.waitForSelector(priceSelector, { timeout: 5000 });
          const text = await page.$eval(priceSelector, el => el.textContent.trim());
          const match = text.match(/([\d.]+)/);
          if (match) {
            price = parseFloat(match[1]);
            console.log(`✅ Prezzo trovato con selettore: ${priceSelector} = ${price}`);
            break;
          }
        } catch (e) {
          console.log(`⚠️  Selettore prezzo fallito: ${priceSelector}`);
        }
      }

      // Valida risultati DOM scraping
      if (count !== null && price !== null) {
        const result = {
          success: true,
          price: price,
          count: count,
          timestamp: new Date().toISOString(),
          method: 'dom-scraping',
        };

        console.log('✅ Scraping completato:', result);
        await browser.close();
        return result;
      }

      // Se arriviamo qui, nessuna strategia ha funzionato
      throw new Error(`Entrambe le strategie fallite. API data: ${!!apiData}, Count: ${count}, Price: ${price}`);

    } catch (error) {
      lastError = error;
      console.error(`❌ Tentativo ${attempt} fallito:`, error.message);
      console.error('Stack:', error.stack);

      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.error('Errore chiusura browser:', e.message);
        }
        browser = null;
      }

      if (attempt < CONFIG.MAX_RETRIES) {
        const delay = Math.min(3000 * attempt, 15000); // Delay più lungo
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
