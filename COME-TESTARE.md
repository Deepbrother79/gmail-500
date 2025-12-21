# 🧪 Come Testare il Scraper

Hai **2 workflow** disponibili su GitHub Actions:

## 1️⃣ TEST Scraper (No Supabase) - INIZIA DA QUI! ✅

**Usa questo per testare che il browser estragga i dati correttamente**

### Come eseguire:

1. Vai su: https://github.com/Deepbrother79/gmail-500/actions

2. Click su **"TEST Scraper (No Supabase)"** (nella lista a sinistra)

3. Click **"Run workflow"** > **"Run workflow"** (verde)

4. Aspetta 2-3 minuti

5. Click sull'esecuzione appena creata

6. Click su **"test-scraping"** per vedere i logs

### Cosa vedrai nei logs:

```
╔══════════════════════════════════════════════════════════╗
║  🧪 TEST SCRAPER - Solo Estrazione Dati (NO Supabase)  ║
╚══════════════════════════════════════════════════════════╝

🔄 TENTATIVO 1/3
📱 Lanciando browser Puppeteer...
✅ Browser lanciato con successo

🎯 Configurando intercettazione risposta API...
✅ Listener configurato

🌐 Navigando a: https://gmail500.com/email/3011
✅ Pagina caricata

⏳ Aspettando risposta API...
✅ Risposta API ricevuta!

📋 RISPOSTA API COMPLETA:
{
  "successful": true,
  "code": 0,
  "msg": "successful",
  "data": {
    "price": 0.300,
    "count": 8651,
    "code": "3011",
    "name": "{\"en\":\"Gmail Account-11-独享\"}",
    ...
  }
}

✅ DATI ESTRATTI CON SUCCESSO:
💰 Prezzo:        $0.300
📦 Quantità:      8651 unità disponibili
🔖 Codice:        3011
📝 Nome:          {"en":"Gmail Account-11-独享"}
🕐 Timestamp:     2025-12-20T19:30:00.000Z

╔══════════════════════════════════════════════════════════╗
║  ✅ TEST COMPLETATO CON SUCCESSO                        ║
╚══════════════════════════════════════════════════════════╝

✅ Il browser funziona correttamente!
✅ I dati vengono estratti con successo!

💡 Prossimo passo: configura Supabase per salvare questi dati
```

### ✅ Se vedi questo output:

Il browser funziona perfettamente! Puoi passare allo step 2.

### ❌ Se vedi errori:

Controlla i logs per capire cosa è andato storto:
- **Timeout**: La pagina impiega troppo tempo a caricare
- **Invalid signature**: Problemi con l'intercettazione della risposta
- **Browser crash**: Problemi con Puppeteer

---

## 2️⃣ Gmail500 Scraper (Con Supabase) - USA DOPO IL TEST

**Usa questo SOLO dopo aver verificato che il TEST funziona**

### Prerequisiti:

Prima di usare questo workflow, devi:

1. ✅ Aver eseguito con successo il TEST workflow (sopra)
2. ✅ Aver creato la tabella su Supabase
3. ✅ Aver configurato i secrets GitHub

### Step per configurare Supabase:

#### A. Crea la tabella

1. Vai su https://supabase.com/dashboard
2. Apri il tuo progetto (o creane uno)
3. Vai su **SQL Editor**
4. Esegui questo SQL:

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

#### B. Configura i secrets

1. Vai su: https://github.com/Deepbrother79/gmail-500/settings/secrets/actions

2. **Secret 1:**
   - Name: `SUPABASE_URL`
   - Value: `https://your-project.supabase.co` (prendi da Supabase > Settings > API > Project URL)

3. **Secret 2:**
   - Name: `SUPABASE_ANON_KEY`
   - Value: `eyJhbGc...` (prendi da Supabase > Settings > API > anon public)

### Come eseguire:

1. Vai su: https://github.com/Deepbrother79/gmail-500/actions

2. Click su **"Gmail500 Scraper"** (nella lista a sinistra)

3. Click **"Run workflow"** > **"Run workflow"** (verde)

4. Aspetta 2-3 minuti

5. Verifica che nei logs vedi:
   ```
   ✅ Scraping completato
   ✅ Dati salvati su Supabase
   ✅ COMPLETATO CON SUCCESSO
   ```

6. Verifica su Supabase > Table Editor > `gmail500_products` che ci sia il record

---

## 🔍 Quale workflow usare?

### Primo test (ORA):
✅ **"TEST Scraper (No Supabase)"**
- Non servono secrets
- Non serve Supabase
- Mostra solo se il browser funziona
- Esegui questo PRIMA DI TUTTO

### Produzione (DOPO):
✅ **"Gmail500 Scraper"**
- Richiede secrets configurati
- Richiede tabella Supabase
- Salva i dati sul database
- Si esegue automaticamente ogni ora
- Usa questo SOLO dopo aver testato

---

## 📊 Workflow Automatici

Dopo che hai verificato che tutto funziona:

- **"TEST Scraper"**: Solo manuale (workflow_dispatch)
- **"Gmail500 Scraper"**: Automatico ogni ora + manuale

Il workflow con Supabase partirà automaticamente ogni ora alle :00 (es: 14:00, 15:00, 16:00, ecc.)

---

## 🆘 Troubleshooting

### Test workflow fallisce con timeout

**Soluzione**: Aumenta `BROWSER_TIMEOUT` in `test-scraper-only.js`:
```javascript
BROWSER_TIMEOUT: 90000, // 90 secondi invece di 60
```

### Test funziona, ma scraper con Supabase fallisce

**Causa**: Secrets non configurati o tabella mancante

**Soluzione**:
1. Verifica secrets: https://github.com/Deepbrother79/gmail-500/settings/secrets/actions
2. Verifica tabella su Supabase > Table Editor

### Browser crash

**Soluzione**: Già gestito con flag `--no-sandbox`, ma se persiste:
- Controlla i logs GitHub Actions
- Verifica che non ci siano problemi di memoria

---

## 📝 Note Importanti

1. ⚠️ **Esegui PRIMA il TEST workflow** per verificare che tutto funzioni
2. ✅ Il TEST workflow NON richiede Supabase
3. ✅ Il TEST workflow mostra tutti i dati estratti nei logs
4. ✅ Solo dopo che il TEST funziona, configura Supabase
5. 🔒 I secrets GitHub sono privati e sicuri

---

## 🚀 Quick Start

```bash
1. Esegui "TEST Scraper (No Supabase)" workflow
   ↓
2. Verifica che estrae i dati correttamente
   ↓
3. Crea tabella su Supabase
   ↓
4. Configura secrets GitHub
   ↓
5. Esegui "Gmail500 Scraper" workflow
   ↓
6. Verifica che salva su Supabase
   ↓
7. Fatto! Il workflow girerà automaticamente ogni ora
```

Buon testing! 🧪
