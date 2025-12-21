/**
 * TEST SCRAPER - Solo estrazione dati (SENZA Supabase)
 * Usa questo per verificare che il browser estragga i dati correttamente
 */

import puppeteer from 'puppeteer';

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
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 TENTATIVO ${attempt}/${CONFIG.MAX_RETRIES}`);
      console.log('='.repeat(60));

      // Launch browser
      console.log('\n📱 Lanciando browser Puppeteer...');
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
      console.log('✅ Browser lanciato con successo');

      const page = await browser.newPage();

      // Setup listener PRIMA di navigare
      console.log('\n🎯 Configurando intercettazione risposta API...');
      const responsePromise = page.waitForResponse(
        response => {
          const url = response.url();
          const matches = url.includes(CONFIG.API_URL_PATTERN) && response.status() === 200;
          if (matches) {
            console.log(`✅ Trovata risposta API: ${url}`);
          }
          return matches;
        },
        { timeout: CONFIG.BROWSER_TIMEOUT }
      );
      console.log('✅ Listener configurato');

      // Naviga alla pagina
      console.log(`\n🌐 Navigando a: ${CONFIG.TARGET_URL}`);
      console.log('⏳ Aspettando che la pagina carichi completamente...');

      await page.goto(CONFIG.TARGET_URL, {
        waitUntil: 'networkidle0',
        timeout: CONFIG.BROWSER_TIMEOUT,
      });
      console.log('✅ Pagina caricata');

      // Cattura risposta API
      console.log('\n⏳ Aspettando risposta API...');
      const response = await responsePromise;
      console.log('✅ Risposta API ricevuta!');

      // Estrai JSON
      console.log('\n📦 Parsing JSON dalla risposta...');
      const data = await response.json();

      // Mostra risposta completa
      console.log('\n' + '='.repeat(60));
      console.log('📋 RISPOSTA API COMPLETA:');
      console.log('='.repeat(60));
      console.log(JSON.stringify(data, null, 2));

      // Valida ed estrai dati
      console.log('\n' + '='.repeat(60));
      console.log('🔍 ANALISI DATI:');
      console.log('='.repeat(60));

      if (data.successful) {
        console.log('✅ successful: true');
      } else {
        console.log('❌ successful: false');
        throw new Error('API ha restituito successful=false');
      }

      if (data.data) {
        console.log('✅ data object presente');

        const result = {
          success: true,
          price: data.data.price,
          count: data.data.count,
          productCode: data.data.code,
          productName: data.data.name,
          categoryName: data.data.categoryName,
          timestamp: new Date().toISOString(),
        };

        console.log('\n' + '='.repeat(60));
        console.log('✅ DATI ESTRATTI CON SUCCESSO:');
        console.log('='.repeat(60));
        console.log(`💰 Prezzo:        $${result.price}`);
        console.log(`📦 Quantità:      ${result.count} unità disponibili`);
        console.log(`🔖 Codice:        ${result.productCode}`);
        console.log(`📝 Nome:          ${result.productName}`);
        console.log(`📂 Categoria:     ${result.categoryName}`);
        console.log(`🕐 Timestamp:     ${result.timestamp}`);
        console.log('='.repeat(60));

        await browser.close();
        console.log('\n✅ Browser chiuso');

        return result;
      }

      throw new Error('Campo "data" mancante nella risposta API');

    } catch (error) {
      lastError = error;
      console.error(`\n❌ Tentativo ${attempt} fallito:`);
      console.error(`   Errore: ${error.message}`);

      if (browser) {
        try {
          await browser.close();
          console.log('   Browser chiuso dopo errore');
        } catch (e) {
          console.error(`   Errore chiusura browser: ${e.message}`);
        }
        browser = null;
      }

      if (attempt < CONFIG.MAX_RETRIES) {
        const delay = Math.min(2000 * attempt, 10000);
        console.log(`\n⏰ Attendo ${delay}ms prima del prossimo tentativo...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `❌ Scraping fallito dopo ${CONFIG.MAX_RETRIES} tentativi.\nUltimo errore: ${lastError?.message}`
  );
}

/**
 * Main
 */
async function main() {
  console.log('\n' + '╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(58) + '║');
  console.log('║  🧪 TEST SCRAPER - Solo Estrazione Dati (NO Supabase)  ║');
  console.log('║' + ' '.repeat(58) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  console.log(`\n🕐 Avvio test: ${new Date().toISOString()}`);
  console.log(`🎯 Target: ${CONFIG.TARGET_URL}`);

  try {
    const scrapedData = await scrapeGmail500();

    console.log('\n\n' + '╔' + '═'.repeat(58) + '╗');
    console.log('║  ✅ TEST COMPLETATO CON SUCCESSO                        ║');
    console.log('╚' + '═'.repeat(58) + '╝');

    console.log('\n📊 RIEPILOGO:');
    console.log('─'.repeat(60));
    console.log('Il browser ha estratto correttamente i seguenti dati:');
    console.log(`  💰 Prezzo: $${scrapedData.price}`);
    console.log(`  📦 Quantità disponibile: ${scrapedData.count}`);
    console.log(`  🔖 Codice prodotto: ${scrapedData.productCode}`);
    console.log('─'.repeat(60));

    console.log('\n✅ Il browser funziona correttamente!');
    console.log('✅ I dati vengono estratti con successo!');
    console.log('\n💡 Prossimo passo: configura Supabase per salvare questi dati');

    process.exit(0);

  } catch (error) {
    console.error('\n\n' + '╔' + '═'.repeat(58) + '╗');
    console.error('║  ❌ TEST FALLITO                                        ║');
    console.error('╚' + '═'.repeat(58) + '╝');
    console.error('\n❌ Errore:', error.message);
    console.error('\n📋 Stack trace:');
    console.error(error.stack);

    process.exit(1);
  }
}

// Esegui test
main();
