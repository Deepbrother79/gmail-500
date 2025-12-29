/**
 * Gmail500 Scraper - VERSIONE DEBUG LOCALE
 * Browser VISIBILE per debugging
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Configurazione
const CONFIG = {
  TARGET_URL: 'https://gmail500.com/email/3011',
  API_URL_PATTERN: '/api/v1/product/get/3011',
  BROWSER_TIMEOUT: 60000, // 60 secondi
  MAX_RETRIES: 1, // Solo 1 tentativo per debug
};

/**
 * Crea directory screenshots se non esiste
 */
function ensureScreenshotsDir() {
  const dir = './screenshots';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  return dir;
}

/**
 * Scrape dati da Gmail500 - VERSIONE DEBUG
 */
async function scrapeGmail500Debug() {
  let browser = null;

  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║    DEBUG MODE - Browser Visibile       ║');
    console.log('╚════════════════════════════════════════╝\n');

    const screenshotsDir = ensureScreenshotsDir();

    // Launch browser VISIBILE
    console.log('🚀 Lanciando browser in modalità VISIBILE...');
    browser = await puppeteer.launch({
      headless: false,  // ← BROWSER VISIBILE!
      devtools: true,   // ← Apre DevTools automaticamente
      slowMo: 100,      // ← Rallenta le operazioni di 100ms per vederle meglio
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--start-maximized', // Apre finestra massimizzata
      ],
    });

    console.log('✅ Browser lanciato (controlla la finestra!)');

    const page = await browser.newPage();

    // Imposta viewport grande
    await page.setViewport({ width: 1920, height: 1080 });

    // Abilita console logging dal browser
    page.on('console', msg => {
      console.log('🌐 Browser Console:', msg.text());
    });

    // Log delle richieste di rete
    page.on('request', request => {
      if (request.url().includes('gmail500.com')) {
        console.log('📤 Request:', request.method(), request.url());
      }
    });

    // Log delle risposte di rete
    page.on('response', response => {
      if (response.url().includes('gmail500.com')) {
        console.log('📥 Response:', response.status(), response.url());
      }
    });

    // Naviga alla pagina
    console.log(`\n🌐 Navigando a ${CONFIG.TARGET_URL}...`);
    console.log('⏳ Aspetta che la pagina si carichi completamente...\n');

    await page.goto(CONFIG.TARGET_URL, {
      waitUntil: 'networkidle2',
      timeout: CONFIG.BROWSER_TIMEOUT,
    });

    // Screenshot 1: Pagina caricata
    const screenshot1 = path.join(screenshotsDir, `01-page-loaded-${Date.now()}.png`);
    await page.screenshot({ path: screenshot1, fullPage: true });
    console.log(`📸 Screenshot salvato: ${screenshot1}`);

    // Selettori CSS per elementi React
    const quantitySelector = '#root > div.ant-layout.my-var-css > div:nth-child(2) > div > div > div > div:nth-child(1) > div.ant-ribbon-wrapper.my-var-css > div.ant-ribbon.ant-ribbon-placement-end > span';
    const priceSelector = '#root > div.ant-layout.my-var-css > div:nth-child(2) > div > div > div > div:nth-child(1) > div:nth-child(2) > h3';

    // Aspetta che gli elementi siano caricati
    console.log('\n⏳ Aspettando rendering React...');
    console.log(`   Cercando selettore prezzo: ${priceSelector}`);
    console.log(`   Cercando selettore quantità: ${quantitySelector}\n`);

    try {
      await page.waitForSelector(priceSelector, { timeout: 30000 });
      console.log('✅ Elemento PREZZO trovato!');
    } catch (e) {
      console.error('❌ Elemento PREZZO NON trovato!');

      // Debug: mostra tutti gli elementi disponibili
      const allElements = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*'))
          .filter(el => el.textContent && el.textContent.includes('$'))
          .map(el => ({
            tag: el.tagName,
            id: el.id,
            class: el.className,
            text: el.textContent.substring(0, 100)
          }));
      });

      console.log('\n🔍 Elementi con "$" trovati:', JSON.stringify(allElements, null, 2));
    }

    try {
      await page.waitForSelector(quantitySelector, { timeout: 30000 });
      console.log('✅ Elemento QUANTITÀ trovato!');
    } catch (e) {
      console.error('❌ Elemento QUANTITÀ NON trovato!');

      // Debug: mostra la struttura del DOM
      const domStructure = await page.evaluate(() => {
        const root = document.getElementById('root');
        if (!root) return 'NO ROOT ELEMENT!';

        function getStructure(el, depth = 0) {
          if (depth > 5) return '';
          const indent = '  '.repeat(depth);
          let result = `${indent}${el.tagName}`;
          if (el.id) result += `#${el.id}`;
          if (el.className) result += `.${el.className.split(' ').join('.')}`;
          result += '\n';

          for (let child of el.children) {
            result += getStructure(child, depth + 1);
          }
          return result;
        }

        return getStructure(root);
      });

      console.log('\n🏗️  Struttura DOM:\n', domStructure);
    }

    // Screenshot 2: Dopo wait selectors
    const screenshot2 = path.join(screenshotsDir, `02-after-selectors-${Date.now()}.png`);
    await page.screenshot({ path: screenshot2, fullPage: true });
    console.log(`\n📸 Screenshot salvato: ${screenshot2}`);

    // Aspetta ancora un po'
    console.log('\n⏰ Aspetto 2 secondi aggiuntivi...');
    await page.waitForTimeout(2000);

    // Estrai dati dal DOM
    console.log('\n📊 Estraendo dati dal DOM...');
    const data = await page.evaluate((qtySelector, priceSelector) => {
      const quantityElement = document.querySelector(qtySelector);
      const priceElement = document.querySelector(priceSelector);

      let count = null;
      let price = null;

      console.log('Quantity element:', quantityElement);
      console.log('Price element:', priceElement);

      if (quantityElement) {
        const text = quantityElement.textContent.trim();
        console.log('Quantity text:', text);
        const match = text.match(/(\d+)/);
        if (match) count = parseInt(match[1]);
      }

      if (priceElement) {
        const text = priceElement.textContent.trim();
        console.log('Price text:', text);
        const match = text.match(/([\d.]+)/);
        if (match) price = parseFloat(match[1]);
      }

      return {
        successful: count !== null && price !== null,
        quantityFound: quantityElement !== null,
        priceFound: priceElement !== null,
        quantityText: quantityElement?.textContent,
        priceText: priceElement?.textContent,
        data: {
          count: count,
          price: price,
          code: '3011',
        }
      };
    }, quantitySelector, priceSelector);

    console.log('\n📦 Dati estratti:', JSON.stringify(data, null, 2));

    // Screenshot 3: Finale
    const screenshot3 = path.join(screenshotsDir, `03-final-${Date.now()}.png`);
    await page.screenshot({ path: screenshot3, fullPage: true });
    console.log(`📸 Screenshot salvato: ${screenshot3}`);

    // Valida risultati
    if (data.successful && data.data) {
      const result = {
        success: true,
        price: data.data.price,
        count: data.data.count,
        timestamp: new Date().toISOString(),
      };

      console.log('\n╔════════════════════════════════════════╗');
      console.log('║         ✅ SUCCESSO!                   ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('\nDati estratti:');
      console.log(`  💰 Prezzo: $${result.price}`);
      console.log(`  📦 Quantità: ${result.count}`);
      console.log(`  🕐 Timestamp: ${result.timestamp}`);

      // Pausa prima di chiudere per vedere il risultato
      console.log('\n⏸️  Premi CTRL+C per chiudere il browser e terminare...');
      console.log('    (Il browser rimarrà aperto per ispezionare)\n');

      // Aspetta input dell'utente
      await new Promise(resolve => {
        process.on('SIGINT', () => {
          console.log('\n\n👋 Chiusura in corso...');
          resolve();
        });
      });

      return result;
    }

    throw new Error(`Dati non estratti correttamente: ${JSON.stringify(data)}`);

  } catch (error) {
    console.error('\n╔════════════════════════════════════════╗');
    console.error('║         ❌ ERRORE                      ║');
    console.error('╚════════════════════════════════════════╝');
    console.error('\nDettagli:', error.message);
    console.error('Stack:', error.stack);

    // Pausa anche in caso di errore
    console.log('\n⏸️  Il browser rimarrà aperto per debugging.');
    console.log('    Premi CTRL+C per chiudere...\n');

    await new Promise(resolve => {
      process.on('SIGINT', () => {
        console.log('\n\n👋 Chiusura in corso...');
        resolve();
      });
    });

    throw error;

  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser chiuso');
    }
  }
}

/**
 * Main
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Gmail500 Scraper - DEBUG LOCALE      ║');
  console.log('║  Browser VISIBILE per debugging        ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n🕐 Esecuzione: ${new Date().toISOString()}`);

  try {
    await scrapeGmail500Debug();
  } catch (error) {
    console.error('\n💥 Errore finale:', error.message);
    process.exit(1);
  }
}

// Esegui
main();
