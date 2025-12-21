/**
 * TEST SCRAPER - Estrazione dal DOM HTML (SENZA Supabase)
 * Versione semplificata che estrae direttamente dalla pagina
 */

import puppeteer from 'puppeteer';

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

      // Naviga alla pagina
      console.log(`\n🌐 Navigando a: ${CONFIG.TARGET_URL}`);
      await page.goto(CONFIG.TARGET_URL, {
        waitUntil: 'networkidle2',
        timeout: CONFIG.BROWSER_TIMEOUT,
      });
      console.log('✅ Pagina caricata');

      // Aspetta un po' per assicurarsi che tutto sia renderizzato
      console.log('\n⏳ Aspettando rendering completo (3 secondi)...');
      await page.waitForTimeout(3000);

      // Estrai dati direttamente dal DOM
      console.log('\n🔍 Estraendo dati dal DOM HTML...');

      const data = await page.evaluate(() => {
        // Estrai quantità da: <span class="ant-ribbon-content">8651 pcs</span>
        const quantityElement = document.querySelector('.ant-ribbon-content');
        let count = null;
        if (quantityElement) {
          const text = quantityElement.textContent.trim();
          const match = text.match(/(\d+)\s*pcs/i);
          if (match) {
            count = parseInt(match[1]);
          }
        }

        // Estrai prezzo da: <strong>Total: 0.3</strong>
        // Cerca tutti gli elementi strong e trova quello con "Total:"
        const strongElements = document.querySelectorAll('strong');
        let price = null;
        for (const el of strongElements) {
          const text = el.textContent.trim();
          if (text.includes('Total:')) {
            const match = text.match(/Total:\s*([\d.]+)/i);
            if (match) {
              price = parseFloat(match[1]);
            }
            break;
          }
        }

        // Prova anche altri possibili selettori per il prezzo
        if (price === null) {
          // Cerca nella pagina qualsiasi elemento che contenga il pattern del prezzo
          const allText = document.body.innerText;
          const priceMatch = allText.match(/Total:\s*([\d.]+)/i);
          if (priceMatch) {
            price = parseFloat(priceMatch[1]);
          }
        }

        // Estrai anche altre info se disponibili
        const productCode = '3011'; // Dal URL

        return {
          count: count,
          price: price,
          productCode: productCode,
          // Debug info
          quantityText: quantityElement ? quantityElement.textContent.trim() : 'NOT FOUND',
          allStrongTexts: Array.from(strongElements).map(el => el.textContent.trim()),
        };
      });

      console.log('\n' + '='.repeat(60));
      console.log('🔍 DATI ESTRATTI DAL DOM:');
      console.log('='.repeat(60));
      console.log('Debug Info:');
      console.log(`  Testo quantità: "${data.quantityText}"`);
      console.log(`  Tutti i <strong>: ${JSON.stringify(data.allStrongTexts, null, 2)}`);
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
