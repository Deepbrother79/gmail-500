/**
 * Gmail500 Scraper - Multi-Endpoint Edition
 * Soluzione GRATUITA per GitHub Actions
 * Con Cloudflare bypass usando puppeteer-extra-plugin-stealth
 * UPDATE-only (non inserisce nuovi record)
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';

puppeteer.use(StealthPlugin());

// Configurazione da Environment Variables (GitHub Secrets)
const CONFIG = {
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  TABLE_NAME: process.env.URL_TABLE,

  // Target 1
  TARGET_1_URL: process.env.URL_SCARP_1,
  TARGET_1_API: process.env.URL_SCARP_1_JSON,

  // Target 2
  TARGET_2_URL: process.env.URL_SCARP_2,
  TARGET_2_API: process.env.URL_SCARP_2_JSON,

  // Settings
  BROWSER_TIMEOUT: 60000,
  MAX_RETRIES: 3,
};

/**
 * Valida che tutti i secrets siano configurati
 */
function validateConfig(config) {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'TABLE_NAME',
    'TARGET_1_URL',
    'TARGET_1_API',
    'TARGET_2_URL',
    'TARGET_2_API',
  ];

  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    throw new Error(`
❌ Missing required secrets: ${missing.join(', ')}

Configure them in GitHub:
Settings > Secrets and variables > Actions > New repository secret
    `);
  }

  // Validazione formato URL
  const urls = [config.TARGET_1_URL, config.TARGET_2_URL, config.SUPABASE_URL];

  urls.forEach(url => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error(`Invalid URL format: ${url}`);
    }
  });

  console.log('✅ Configuration validated');
}

/**
 * Scrape generico di un target
 * @param {Object} target - { name, url, apiPattern }
 * @returns {Promise<Object>} { target, products[] }
 */
async function scrapeTarget(target) {
  console.log(`\n🎯 Scraping ${target.name}...`);
  console.log(`   URL: ${target.url}`);
  console.log(`   API Pattern: ${target.apiPattern}`);

  let browser = null;
  let lastError = null;

  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(`   🔄 Attempt ${attempt}/${CONFIG.MAX_RETRIES}`);

      // Launch browser con stealth plugin
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
        ],
      });

      const page = await browser.newPage();

      // Imposta User Agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      let apiData = null;
      let apiResolved = false;

      // Setup listener per intercettare API response
      page.on('response', async response => {
        const url = response.url();

        if (url.includes(target.apiPattern) && response.status() === 200) {
          try {
            const json = await response.json();
            console.log(`   ✅ API Response intercepted from: ${target.apiPattern}`);

            // Normalizza formato JSON (supporta vari formati)
            if (Array.isArray(json)) {
              apiData = json;
            } else if (json.data && Array.isArray(json.data)) {
              apiData = json.data;
            } else if (json.successful && json.data && Array.isArray(json.data)) {
              apiData = json.data;
            } else if (json.successful && json.data) {
              apiData = [json.data];
            } else {
              console.log('   ⚠️  Unexpected JSON format:', Object.keys(json));
            }

            apiResolved = true;
          } catch (e) {
            console.log(`   ⚠️  JSON parse error: ${e.message}`);
          }
        }
      });

      // Naviga alla pagina
      console.log(`   🌐 Navigating to page...`);
      await page.goto(target.url, {
        waitUntil: 'networkidle2',
        timeout: CONFIG.BROWSER_TIMEOUT,
      });

      console.log(`   ✅ Page loaded`);

      // Attendi che l'API risponda (max 15 secondi)
      console.log(`   ⏳ Waiting for API response...`);
      const maxWaitTime = 15000;
      const startTime = Date.now();

      while (!apiResolved && Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      await browser.close();
      browser = null;

      if (apiData && apiData.length > 0) {
        console.log(`   ✅ Extracted ${apiData.length} products`);

        // Trasforma i dati nel formato richiesto
        const products = apiData.map(p => ({
          code: p.code,
          price: parseFloat(p.price),
          count: parseInt(p.count),
        }));

        return {
          target: target.name,
          products: products,
        };
      }

      throw new Error('API data not received or empty');
    } catch (error) {
      lastError = error;
      console.error(`   ❌ Attempt ${attempt} failed: ${error.message}`);

      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          // Ignore close errors
        }
        browser = null;
      }

      if (attempt < CONFIG.MAX_RETRIES) {
        const delay = 3000 * attempt;
        console.log(`   ⏰ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `${target.name} failed after ${CONFIG.MAX_RETRIES} retries. Last error: ${lastError?.message}`
  );
}

/**
 * Aggiorna i prodotti su Supabase (UPDATE only, no INSERT)
 * @param {Array} products - Array di prodotti da aggiornare
 * @param {String} tableName - Nome della tabella Supabase
 * @returns {Promise<Object>} Statistiche update
 */
async function updateSupabase(products, tableName) {
  console.log(`\n💾 Connecting to Supabase...`);

  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

  const results = {
    updated: 0,
    skipped: 0,
    errors: [],
  };

  console.log(`📝 Processing ${products.length} products...\n`);

  for (const product of products) {
    try {
      // 1. Verifica se il record esiste
      const { data: existing, error: selectError } = await supabase
        .from(tableName)
        .select('id')
        .eq('id_provider', product.code)
        .maybeSingle();

      if (selectError) {
        throw selectError;
      }

      if (!existing) {
        console.log(`⏭️  SKIP: id_provider ${product.code} does not exist`);
        results.skipped++;
        continue;
      }

      // 2. UPDATE solo price e quantity (NON tocca name, type, etc.)
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          price: product.price,
          quantity: product.count,
        })
        .eq('id_provider', product.code);

      if (updateError) {
        throw updateError;
      }

      console.log(
        `✅ UPDATE: id_provider ${product.code} → price=${product.price}, qty=${product.count}`
      );
      results.updated++;
    } catch (error) {
      console.error(`❌ ERROR: id_provider ${product.code} → ${error.message}`);
      results.errors.push({
        code: product.code,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Main function - Orchestrazione con Promise.allSettled
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Gmail500 Scraper - Multi-Endpoint    ║');
  console.log('║  UPDATE Mode (No Insert)               ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n🕐 Execution time: ${new Date().toISOString()}\n`);

  try {
    // 1. Validazione configurazione
    validateConfig(CONFIG);

    // 2. Definisci targets
    const targets = [
      {
        name: 'Target 1',
        url: CONFIG.TARGET_1_URL,
        apiPattern: CONFIG.TARGET_1_API,
      },
      {
        name: 'Target 2',
        url: CONFIG.TARGET_2_URL,
        apiPattern: CONFIG.TARGET_2_API,
      },
    ];

    // 3. Scrape PARALLELO con Promise.allSettled
    console.log('🔄 Starting parallel scraping...');
    const scrapeResults = await Promise.allSettled(
      targets.map(target => scrapeTarget(target))
    );

    // 4. Processa risultati
    const successfulScrapes = [];
    const failedScrapes = [];

    scrapeResults.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        console.log(
          `\n✅ ${targets[i].name}: ${result.value.products.length} products extracted`
        );
        successfulScrapes.push(result.value);
      } else {
        console.error(`\n❌ ${targets[i].name}: ${result.reason.message}`);
        failedScrapes.push({
          target: targets[i].name,
          error: result.reason,
        });
      }
    });

    // 5. Verifica che almeno un target abbia successo
    if (successfulScrapes.length === 0) {
      throw new Error('All targets failed. No data to update.');
    }

    // 6. Aggrega tutti i prodotti
    const allProducts = successfulScrapes.flatMap(s => s.products);
    console.log(`\n📦 Total products to process: ${allProducts.length}`);

    // 7. Update Supabase
    const updateResults = await updateSupabase(allProducts, CONFIG.TABLE_NAME);

    // 8. Report finale
    console.log('\n' + '═'.repeat(50));
    console.log('╔════════════════════════════════════════╗');
    console.log('║  ✅ EXECUTION COMPLETED                ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('═'.repeat(50));
    console.log('\n📊 STATISTICS:');
    console.log(`   - Targets successful: ${successfulScrapes.length}/2`);
    console.log(`   - Products extracted: ${allProducts.length}`);
    console.log(`   - Records updated: ${updateResults.updated}`);
    console.log(`   - Records skipped: ${updateResults.skipped}`);
    console.log(`   - Update errors: ${updateResults.errors.length}`);

    if (failedScrapes.length > 0) {
      console.log(`\n⚠️  WARNING: ${failedScrapes.length} target(s) failed:`);
      failedScrapes.forEach(f => {
        console.log(`   - ${f.target}: ${f.error.message}`);
      });
    }

    if (updateResults.errors.length > 0) {
      console.log(`\n❌ UPDATE ERRORS:`);
      updateResults.errors.slice(0, 10).forEach(e => {
        console.log(`   - id_provider ${e.code}: ${e.error}`);
      });
      if (updateResults.errors.length > 10) {
        console.log(`   ... and ${updateResults.errors.length - 10} more`);
      }
    }

    console.log('\n' + '═'.repeat(50));
    console.log(`🏁 Finished at: ${new Date().toISOString()}`);
    console.log('═'.repeat(50) + '\n');

    // Exit 0 se almeno 1 target ha successo
    process.exit(0);
  } catch (error) {
    console.error('\n' + '═'.repeat(50));
    console.error('╔════════════════════════════════════════╗');
    console.error('║  ❌ EXECUTION FAILED                   ║');
    console.error('╚════════════════════════════════════════╝');
    console.error('═'.repeat(50));
    console.error(`\n💥 Error: ${error.message}`);
    console.error(`\n📚 Stack trace:`);
    console.error(error.stack);
    console.error('\n' + '═'.repeat(50) + '\n');

    process.exit(1);
  }
}

// Esegui
main();
