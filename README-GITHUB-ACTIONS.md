# Gmail500 Scraper - GitHub Actions (GRATUITO) 🆓

Soluzione **completamente GRATUITA** per estrarre dati da Gmail500 ogni ora usando GitHub Actions.

## 🎯 Vantaggi GitHub Actions

| Caratteristica | GitHub Actions | Cloudflare Workers |
|----------------|----------------|-------------------|
| **Costo** | **$0** ✅ | $7.34/mese |
| **Minuti inclusi** | **2000/mese** | N/A |
| **Frequenza max (gratis)** | **Ogni ora** | Ogni 10 min |
| **Setup** | 5 minuti | 10 minuti |
| **Dipendenze esterne** | Nessuna | Workers Paid obbligatorio |

**Con esecuzione ogni ora**: 24 × 30 = 720 esecuzioni/mese × 2 min = **1440 minuti/mese** (dentro i 2000 gratis!)

## 📋 Prerequisiti

1. ✅ Account GitHub (gratuito)
2. ✅ Account Supabase (gratuito)
3. ❌ **Nessun costo**

## 🚀 Setup Rapido (5 minuti)

### Step 1: Crea Repository GitHub

```bash
cd "C:\Users\John\Documents\Gmail500-scarper"
git init
git add .
git commit -m "Initial commit - GitHub Actions scraper"
```

Crea repository su GitHub:
1. Vai su https://github.com/new
2. Nome: `gmail500-scraper`
3. Visibilità: **Private** (importante per i secrets!)
4. Crea repository

```bash
git remote add origin https://github.com/TUO-USERNAME/gmail500-scraper.git
git branch -M main
git push -u origin main
```

### Step 2: Crea Tabella Supabase

Vai su https://supabase.com > SQL Editor ed esegui:

```sql
CREATE TABLE gmail500_products (
  id BIGSERIAL PRIMARY KEY,
  price DECIMAL(10, 3) NOT NULL,
  count INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timestamp ON gmail500_products(timestamp);
```

### Step 3: Configura Secrets GitHub

1. Vai su GitHub repository > **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**

**Secret 1:**
- Name: `SUPABASE_URL`
- Value: `https://your-project.supabase.co`

**Secret 2:**
- Name: `SUPABASE_ANON_KEY`
- Value: `eyJhbGc...` (la tua Anon Key da Supabase)

### Step 4: Usa il Package.json Corretto

**IMPORTANTE**: Rinomina `package-github-actions.json` a `package.json`:

```bash
cd "C:\Users\John\Documents\Gmail500-scarper"
rm package.json
mv package-github-actions.json package.json
git add package.json
git commit -m "Use GitHub Actions package.json"
git push
```

### Step 5: Attiva GitHub Actions

1. Vai su GitHub repository > **Actions**
2. Se vedi un banner "Workflows aren't being run", click **I understand, enable them**
3. Dovresti vedere il workflow "Gmail500 Scraper"

### Step 6: Test Manuale

1. Vai su **Actions** > **Gmail500 Scraper**
2. Click **Run workflow** > **Run workflow**
3. Aspetta 2-3 minuti
4. Controlla i logs cliccando sul workflow appena eseguito

## 📅 Frequenze Disponibili

Modifica `.github/workflows/scraper.yml` per cambiare la frequenza:

```yaml
schedule:
  # Scegli UNA delle seguenti opzioni:

  - cron: '0 * * * *'        # Ogni ora (consigliato) ✅
  # 1440 minuti/mese - OK per piano gratuito

  - cron: '0 */2 * * *'      # Ogni 2 ore
  # 720 minuti/mese - Molto sicuro

  - cron: '0 */6 * * *'      # Ogni 6 ore
  # 240 minuti/mese - Ultra safe

  - cron: '0 9,15,21 * * *'  # Alle 9:00, 15:00, 21:00 UTC
  # Orari specifici - 180 minuti/mese

  - cron: '0 9 * * *'        # Una volta al giorno alle 9:00 UTC
  # 60 minuti/mese - Minimo
```

## 🔍 Verifica Funzionamento

### 1. Controlla Workflow Logs

GitHub > Actions > Gmail500 Scraper > Ultima esecuzione

Dovresti vedere:
```
✅ Browser lanciato
🌐 Navigando a https://gmail500.com/email/3011...
⏳ Aspettando risposta API...
📦 Risposta API ricevuta
✅ Scraping completato
💾 Connessione a Supabase...
✅ Dati salvati su Supabase

╔════════════════════════════════════════╗
║  ✅ COMPLETATO CON SUCCESSO            ║
╚════════════════════════════════════════╝
```

### 2. Verifica Supabase

Vai su Supabase > Table Editor > `gmail500_products`

Dovresti vedere i record con price, count, timestamp.

### 3. Monitora Minuti Usati

GitHub > Settings > Billing > Plans and usage

Verifica che sei sotto i 2000 minuti/mese.

## 🛠️ Test Locale (Opzionale)

Se vuoi testare localmente prima di pushare:

```bash
cd "C:\Users\John\Documents\Gmail500-scarper"
npm install

# Configura variabili ambiente
set SUPABASE_URL=https://your-project.supabase.co
set SUPABASE_ANON_KEY=eyJhbGc...

# Esegui
npm run scrape
```

## 📊 Struttura File

```
gmail500-scraper/
├── .github/
│   └── workflows/
│       └── scraper.yml              # Workflow GitHub Actions ⭐
├── github-actions-scraper.js        # Script principale ⭐
├── package.json                     # Dipendenze (puppeteer) ⭐
├── README-GITHUB-ACTIONS.md         # Questa guida
└── .gitignore
```

**File da usare per GitHub Actions:**
- ✅ `.github/workflows/scraper.yml`
- ✅ `github-actions-scraper.js`
- ✅ `package-github-actions.json` (rinominato in `package.json`)

**File da ignorare (per Cloudflare):**
- ❌ `wrangler.toml` (non serve per GitHub Actions)
- ❌ `src/` directory (non serve per GitHub Actions)

## 🔧 Troubleshooting

### Errore: "Secrets not configured"

**Causa**: SUPABASE_URL o SUPABASE_ANON_KEY non configurati.

**Soluzione**:
1. GitHub repo > Settings > Secrets and variables > Actions
2. Verifica che entrambi i secrets esistano
3. I nomi devono essere ESATTAMENTE: `SUPABASE_URL` e `SUPABASE_ANON_KEY` (case-sensitive)

### Errore: "Workflow not running"

**Causa**: GitHub Actions non abilitato.

**Soluzione**:
1. Actions > I understand, enable them
2. Repository deve essere privato o pubblico (non fork)

### Errore: Browser crash

**Causa**: Memory insufficiente su runner.

**Soluzione**: Già configurato con:
```javascript
args: [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
]
```

### Timeout dopo 60s

**Causa**: Pagina lenta a caricare.

**Soluzione**: Aumenta `BROWSER_TIMEOUT` in `github-actions-scraper.js`:
```javascript
BROWSER_TIMEOUT: 90000, // 90 secondi
```

## 💰 Costi e Limiti

### Piano Gratuito GitHub Actions

- ✅ 2000 minuti/mese
- ✅ Storage: 500 MB
- ✅ Concorrenza: fino a 20 jobs
- ✅ Workflow runs: illimitati

### Calcolo Minuti

| Frequenza | Exec/Mese | Minuti Usati | Dentro Limite? |
|-----------|-----------|--------------|----------------|
| Ogni ora | 720 | 1440 | ✅ Sì |
| Ogni 2 ore | 360 | 720 | ✅ Sì |
| Ogni 6 ore | 120 | 240 | ✅ Sì |
| Ogni 30 min | 1440 | 2880 | ❌ No (supera) |

**Consigliato**: Ogni ora (1440 minuti/mese)

## 🆚 Confronto Soluzioni

| Feature | GitHub Actions | Cloudflare Workers |
|---------|----------------|-------------------|
| Costo mensile | **$0** | $7.34 |
| Setup | Git + Secrets | Wrangler + Deploy |
| Frequenza minima | Ogni ora | Ogni 10 minuti |
| Puppeteer | Nativo | Fork Cloudflare |
| Limite esecuzioni | 2000 min/mese | Illimitato (pagato) |
| Complessità | ⭐⭐ | ⭐⭐⭐ |
| **Migliore per** | **Uso personale/test** | **Produzione intensiva** |

## 🎓 Comandi Utili

```bash
# Rinomina package.json per GitHub Actions
mv package-github-actions.json package.json

# Push modifiche
git add .
git commit -m "Update scraper configuration"
git push

# Test locale
npm run scrape

# Verifica file workflow
cat .github/workflows/scraper.yml
```

## 📝 Note Importanti

1. ⚠️ **Repository deve essere PRIVATE** per proteggere i secrets
2. ✅ GitHub Actions è gratuito anche per repository privati
3. ✅ Workflow si attiva automaticamente al push se contiene cron
4. ✅ Puoi sempre eseguire manualmente via "Run workflow"
5. ⚠️ Cron in UTC (converti il tuo orario locale)

## 🌟 Prossimi Passi

Dopo aver configurato tutto:

1. ✅ Esegui test manuale (Actions > Run workflow)
2. ✅ Verifica logs (Actions > Gmail500 Scraper > Latest run)
3. ✅ Controlla Supabase (Table Editor)
4. ✅ Aspetta 1 ora per verifica automatica
5. ✅ Monitora minuti usati (Settings > Billing)

## 🆘 Supporto

Per problemi:
1. Controlla logs: Actions > Workflow run > Logs
2. Verifica secrets: Settings > Secrets and variables
3. Controlla Supabase: Table Editor > gmail500_products
4. GitHub Actions docs: https://docs.github.com/en/actions

---

**Soluzione 100% GRATUITA** - Nessun costo nascosto! 🎉
