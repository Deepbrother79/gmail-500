/**
 * TEST SCRAPER - Estrazione dal DOM HTML (SENZA Supabase)
 * Versione semplificata che estrae direttamente dalla pagina
 * Con Cloudflare bypass usando puppeteer-extra-plugin-stealth
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Aggiungi plugin stealth per bypassare Cloudflare
puppeteer.use(StealthPlugin());

// Configurazione
const CONFIG = {
  TARGET_URL: 'https://gmail500.com/email/3011',
  BROWSER_TIMEOUT: 60000, // 60 secondi
  MAX_RETRIES: 3,
};

/**
 * Scrape dati da Gmail500 - Estrazione DOM
 */
async function scrapeGmail500() {
  let browser = null;
  let lastError = null;

  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 TENTATIVO ${attempt}/${CONFIG.MAX_RETRIES}`);
      console.log('='.repeat(60));

      // Launch browser con stealth plugin per bypassare Cloudflare
      console.log('\n📱 Lanciando browser Puppeteer con Cloudflare bypass...');
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
      console.log('✅ Browser lanciato con successo');

      const page = await browser.newPage();

      // Naviga alla pagina
      console.log(`\n🌐 Navigando a: ${CONFIG.TARGET_URL}`);
      await page.goto(CONFIG.TARGET_URL, {
        waitUntil: 'networkidle2',
        timeout: CONFIG.BROWSER_TIMEOUT,
      });
      console.log('✅ Pagina caricata');

      // Aspetta che gli elementi React siano renderizzati
      console.log('\n⏳ Aspettando rendering React...');

      // Selettori forniti dall'utente
      const quantitySelector = '#root > div.ant-layout.my-var-css > div:nth-child(2) > div > div > div > div:nth-child(1) > div.ant-ribbon-wrapper.my-var-css > div.ant-ribbon.ant-ribbon-placement-end > span';
      const priceSelector = '#root > div.ant-layout.my-var-css > div:nth-child(2) > div > div > div > div:nth-child(1) > div:nth-child(2) > h3';

      try {
        // Aspetta che l'elemento del prezzo sia visibile (timeout 30s)
        console.log('⏳ Aspettando elemento prezzo...');
        await page.waitForSelector(priceSelector, { timeout: 30000 });
        console.log('✅ Elemento prezzo trovato');

        // Aspetta che l'elemento quantità sia visibile
        console.log('⏳ Aspettando elemento quantità...');
        await page.waitForSelector(quantitySelector, { timeout: 30000 });
        console.log('✅ Elemento quantità trovato');
      } catch (error) {
        console.log(`❌ Timeout aspettando elementi: ${error.message}`);
        console.log('📋 Salvo screenshot per debug...');
        await page.screenshot({ path: '/tmp/debug.png' });
        throw error;
      }

      // Aspetta ancora un po' per sicurezza
      await page.waitForTimeout(2000);

      // Estrai dati direttamente dal DOM con i selettori corretti
      console.log('\n🔍 Estraendo dati dal DOM HTML...');

      const data = await page.evaluate((qtySelector, priceSelector) => {
        // Estrai quantità usando il selector fornito
        const quantityElement = document.querySelector(qtySelector);
        let count = null;
        let quantityText = 'NOT FOUND';

        if (quantityElement) {
          quantityText = quantityElement.textContent.trim();
          // Pattern: "8651 pcs" o solo "8651"
          const match = quantityText.match(/(\d+)/);
          if (match) {
            count = parseInt(match[1]);
          }
        }

        // Estrai prezzo usando il selector fornito
        // Element: <h3 class="ant-typography my-var-css">...0.3...</h3>
        const priceElement = document.querySelector(priceSelector);
        let price = null;
        let priceText = 'NOT FOUND';

        if (priceElement) {
          priceText = priceElement.textContent.trim();
          // Il testo è tipo: "Price 0.3 / pc"
          // Estrai solo il numero
          const match = priceText.match(/([\d.]+)/);
          if (match) {
            price = parseFloat(match[1]);
          }
        }

        const productCode = '3011'; // Dal URL

        return {
          count: count,
          price: price,
          productCode: productCode,
          // Debug info
          quantityText: quantityText,
          priceText: priceText,
          quantityElementFound: quantityElement !== null,
          priceElementFound: priceElement !== null,
        };
      }, quantitySelector, priceSelector);

      console.log('\n' + '='.repeat(60));
      console.log('🔍 DATI ESTRATTI DAL DOM:');
      console.log('='.repeat(60));
      console.log('Debug Info:');
      console.log(`  Elemento quantità trovato: ${data.quantityElementFound}`);
      console.log(`  Testo quantità: "${data.quantityText}"`);
      console.log(`  Valore estratto: ${data.count}`);
      console.log('');
      console.log(`  Elemento prezzo trovato: ${data.priceElementFound}`);
      console.log(`  Testo prezzo: "${data.priceText}"`);
      console.log(`  Valore estratto: ${data.price}`);
      console.log('─'.repeat(60));

      // Valida che abbiamo i dati
      if (data.count === null || data.price === null) {
        console.log('❌ Dati mancanti:');
        if (data.count === null) console.log('   - Quantità non trovata');
        if (data.price === null) console.log('   - Prezzo non trovato');

        // Prova a fare screenshot per debug
        const screenshot = await page.screenshot({ encoding: 'base64' });
        console.log('\n📸 Screenshot della pagina salvato (base64 - primi 100 chars):');
        console.log(screenshot.substring(0, 100) + '...');

        throw new Error('Dati non trovati nel DOM');
      }

      const result = {
        success: true,
        price: data.price,
        count: data.count,
        productCode: data.productCode,
        timestamp: new Date().toISOString(),
        extractionMethod: 'DOM',
      };

      console.log('\n' + '='.repeat(60));
      console.log('✅ DATI ESTRATTI CON SUCCESSO:');
      console.log('='.repeat(60));
      console.log(`💰 Prezzo:        $${result.price}`);
      console.log(`📦 Quantità:      ${result.count} pcs`);
      console.log(`🔖 Codice:        ${result.productCode}`);
      console.log(`🕐 Timestamp:     ${result.timestamp}`);
      console.log(`⚙️  Metodo:        ${result.extractionMethod}`);
      console.log('='.repeat(60));

      await browser.close();
      console.log('\n✅ Browser chiuso');

      return result;

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
  console.log('║  🧪 TEST SCRAPER - Estrazione DOM (NO Supabase)        ║');
  console.log('║' + ' '.repeat(58) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  console.log(`\n🕐 Avvio test: ${new Date().toISOString()}`);
  console.log(`🎯 Target: ${CONFIG.TARGET_URL}`);
  console.log(`⚙️  Metodo: Estrazione diretta dal DOM HTML`);

  try {
    const scrapedData = await scrapeGmail500();

    console.log('\n\n' + '╔' + '═'.repeat(58) + '╗');
    console.log('║  ✅ TEST COMPLETATO CON SUCCESSO                        ║');
    console.log('╚' + '═'.repeat(58) + '╝');

    console.log('\n📊 RIEPILOGO:');
    console.log('─'.repeat(60));
    console.log('Il browser ha estratto correttamente i seguenti dati:');
    console.log(`  💰 Prezzo: $${scrapedData.price}`);
    console.log(`  📦 Quantità disponibile: ${scrapedData.count} pcs`);
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
