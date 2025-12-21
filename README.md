# Gmail500 Scraper - Cloudflare Worker

Scraper automatico che estrae dati da Gmail500.com ogni 10 minuti usando Cloudflare Browser Rendering e li salva su Supabase.

## Caratteristiche

- ✅ Esecuzione schedulata ogni 10 minuti (Cron Trigger)
- ✅ Browser reale con Puppeteer (bypassa firma API)
- ✅ Retry logic automatico (max 2 tentativi)
- ✅ Salvataggio automatico su Supabase
- ✅ Endpoint di test manuale
- ✅ Logging dettagliato

## Prerequisiti

### 1. Account Cloudflare Workers Paid ($5/mese)
**OBBLIGATORIO** - Workers Free NON supporta Browser Rendering.

Iscriviti a Workers Paid:
1. Vai su https://dash.cloudflare.com
2. Workers & Pages > Plans > Upgrade to Paid
3. Costo: $5/mese + ~$2.34/mese browser hours = ~$7.34/mese totale

### 2. Account Supabase (gratuito)
1. Vai su https://supabase.com
2. Crea un nuovo progetto
3. Annota URL e Anon Key

### 3. Node.js installato
Versione 18 o superiore

## Setup Iniziale

### 1. Installa dipendenze
```bash
cd Gmail500-scarper
npm install
```

### 2. Crea tabella Supabase

Vai su Supabase > SQL Editor ed esegui:

```sql
CREATE TABLE gmail500_products (
  id BIGSERIAL PRIMARY KEY,
  price DECIMAL(10, 3) NOT NULL,
  count INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timestamp ON gmail500_products(timestamp);
CREATE INDEX idx_created_at ON gmail500_products(created_at);
```

### 3. Configura secrets Cloudflare

```bash
npx wrangler secret put SUPABASE_URL
# Quando richiesto, incolla: https://your-project.supabase.co

npx wrangler secret put SUPABASE_ANON_KEY
# Quando richiesto, incolla la tua Anon Key (inizia con eyJhbGc...)
```

## Testing

### Test locale

```bash
npm run dev
```

In un altro terminale:
```bash
curl "http://localhost:8787/?test=1"
```

### Deploy in produzione

```bash
npm run deploy
```

### Test manuale in produzione

```bash
curl "https://gmail500-scraper.YOUR-SUBDOMAIN.workers.dev/?test=1"
```

### Monitor logs

```bash
npm run tail
```

Oppure vai su Cloudflare Dashboard > Workers > gmail500-scraper > Logs

## Verifica Funzionamento

### 1. Controlla che il cron sia attivo
Dashboard Cloudflare > Workers > gmail500-scraper > Triggers

Dovresti vedere: `*/10 * * * *`

### 2. Aspetta 10 minuti
Il primo scraping avverrà al prossimo intervallo di 10 minuti.

### 3. Controlla i logs
```bash
npm run tail
```

### 4. Verifica Supabase
Vai su Supabase > Table Editor > gmail500_products

Dovresti vedere i record inseriti con:
- price
- count
- timestamp

## Struttura Progetto

```
gmail500-scraper/
├── package.json          # Dipendenze npm
├── wrangler.toml         # Config Cloudflare Worker
├── src/
│   ├── index.js         # Entry point (cron + HTTP handlers)
│   ├── scraper.js       # Logica Puppeteer per scraping
│   ├── storage.js       # Integrazione Supabase
│   └── config.js        # Configurazioni centralizzate
└── README.md            # Questa documentazione
```

## API Endpoints

### GET /
Health check endpoint

Risposta:
```json
{
  "status": "ok",
  "service": "gmail500-scraper",
  "version": "1.0.0",
  "timestamp": "2025-12-20T10:00:00.000Z",
  "endpoints": {
    "test": "/?test=1 - Run scraper manually",
    "health": "/ - This endpoint"
  }
}
```

### GET /?test=1
Esegue lo scraping manualmente (per testing)

Risposta successo:
```json
{
  "success": true,
  "scraped": {
    "success": true,
    "price": 0.300,
    "count": 8651,
    "timestamp": "2025-12-20T10:00:00.000Z"
  },
  "saved": {
    "success": true,
    "data": [...]
  }
}
```

Risposta errore:
```json
{
  "success": false,
  "error": "Error message",
  "stack": "Stack trace..."
}
```

## Troubleshooting

### Errore: "Invalid signature"
**Causa**: L'API risponde ma rifiuta la richiesta.

**Soluzione**: Verifica che il listener `waitForResponse()` sia impostato PRIMA di `page.goto()`. Questo è già implementato correttamente nel codice.

### Errore: Timeout (60s)
**Causa**: La pagina impiega troppo tempo a caricare.

**Soluzione**: Verifica la connessione di rete o riduci `waitUntil` da `networkidle0` a `domcontentloaded` in `src/scraper.js`.

### Errore: "Browser limit reached"
**Causa**: Troppi browser aperti contemporaneamente.

**Soluzione**: Assicurati che `browser.close()` venga sempre chiamato (già implementato nel blocco `finally`).

### Errore: Supabase 401/403
**Causa**: Secrets non configurati o errati.

**Soluzione**:
```bash
npx wrangler secret list
# Verifica che SUPABASE_URL e SUPABASE_ANON_KEY siano presenti

# Se mancano, configurali:
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
```

### Nessun dato inserito su Supabase
**Causa**: Possibile errore di scraping o configurazione.

**Soluzioni**:
1. Controlla i logs: `npm run tail`
2. Testa manualmente: `curl "https://your-worker.workers.dev/?test=1"`
3. Verifica che la tabella `gmail500_products` esista su Supabase
4. Verifica i permessi della tabella (RLS)

## Costi Stimati

**Configurazione**: Cron ogni 10 minuti
- 144 esecuzioni/giorno
- ~30 secondi per esecuzione
- ~72 minuti/giorno di browser rendering
- ~36 ore/mese di browser rendering

**Breakdown costi**:
- Workers Paid: $5/mese (piano base)
- Browser Rendering: 10 ore incluse + 26 ore extra × $0.09 = $2.34/mese
- **Totale stimato: ~$7.34/mese**

## Modifiche Configurazione

### Cambiare frequenza scraping

Modifica `wrangler.toml`:
```toml
[triggers]
crons = ["*/15 * * * *"]  # Ogni 15 minuti invece di 10
```

Esempi cron:
- `*/5 * * * *` - Ogni 5 minuti
- `0 * * * *` - Ogni ora
- `0 */6 * * *` - Ogni 6 ore
- `0 9 * * *` - Ogni giorno alle 9:00 UTC

### Cambiare prodotto da monitorare

Modifica `src/config.js`:
```javascript
export const CONFIG = {
  TARGET_URL: 'https://gmail500.com/email/XXXX',  // Cambia XXXX
  API_URL_PATTERN: '/api/v1/product/get/XXXX',    // Cambia XXXX
  // ...
};
```

## Comandi Utili

```bash
# Sviluppo locale
npm run dev

# Deploy in produzione
npm run deploy

# Visualizza logs in tempo reale
npm run tail

# Lista secrets configurati
npx wrangler secret list

# Elimina un secret
npx wrangler secret delete NOME_SECRET

# Visualizza info del worker
npx wrangler whoami
```

## Supporto

Per problemi o domande:
1. Controlla i logs: `npm run tail`
2. Verifica la documentazione Cloudflare: https://developers.cloudflare.com/browser-rendering
3. Verifica la documentazione Supabase: https://supabase.com/docs

## Licenza

ISC
