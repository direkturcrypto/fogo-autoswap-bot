# 🔥 FOGO AutoSwap Bot

Bot otomatis untuk swap bolak-balik **FOGO ↔ USDC** di [Valiant DEX](https://app.valiant.gg) pada Fogo Chain.

## 📋 Flow

```
┌─────────────────────────────────────────────────┐
│  80% FOGO → USDC → FOGO → delay 5-10min → loop  │
└─────────────────────────────────────────────────┘
```

---

## 🖥️ Setup di VPS (Ubuntu/Debian)

### 1. Install Node.js

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi
node -v  # harus v20.x
npm -v
```

### 2. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### 3. Clone Repository

```bash
git clone https://github.com/USERNAME/fogo-bot.git
cd fogo-bot
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Konfigurasi

```bash
# Copy template config
cp .env.example .env

# Edit config
nano .env
```

Isi file `.env`:
```env
# Fogo RPC endpoint
RPC_URL=https://mainnet.fogo.io

# Private key wallet (base58 format dari Phantom/Solflare)
PRIVATE_KEY=paste_private_key_kamu_disini

# Delay antara swap (menit)
DELAY_MIN=5
DELAY_MAX=10
```

> ⚠️ **PENTING**: Jangan pernah share private key! File `.env` sudah di-ignore oleh git.

### 6. Cara Dapat Private Key

**Dari Phantom:**
1. Buka Phantom → Settings → Security & Privacy
2. Export Private Key → Masukkan password
3. Copy key (format base58)

**Dari Solflare:**
1. Buka Solflare → Settings → Export Private Key
2. Copy key (format base58)

---

## 🚀 Menjalankan Bot

### Development (dengan auto-reload)

```bash
npm start
# atau
node autoswap.js
```

### Production (dengan PM2)

```bash
# Start bot
pm2 start autoswap.js --name fogo-bot

# Lihat status
pm2 status

# Lihat logs
pm2 logs fogo-bot

# Stop bot
pm2 stop fogo-bot

# Restart bot
pm2 restart fogo-bot

# Auto-start saat VPS reboot
pm2 startup
pm2 save
```

---

## ⚙️ Konfigurasi

| Variable | Default | Keterangan |
|----------|---------|------------|
| `RPC_URL` | `https://mainnet.fogo.io` | Fogo RPC endpoint |
| `PRIVATE_KEY` | - | Private key wallet (base58) |
| `DELAY_MIN` | `5` | Delay minimum (menit) |
| `DELAY_MAX` | `10` | Delay maximum (menit) |

> **Note:** Bot otomatis swap **80%** dari balance FOGO. 20% sisanya untuk gas.

---

## 📝 Contoh Output

```
============================================================
🔥 FOGO AutoSwap Bot
   Flow: FOGO → USDC → FOGO (repeat)
============================================================

👛 Wallet: 8Z62...ngCH
🌐 RPC: https://mainnet.fogo.io

⚙️  Config:
   Swap: 80% of FOGO balance
   Delay: 5-10 minutes

============================================================
📊 Cycle #1 - 1/31/2026, 12:00:00 AM
============================================================

💰 Balances:
   FOGO: 10.0000
   USDC: 0.0000

🔄 Swapping 8 FOGO → USDC...
   ✅ Success! Tx: 4xK7...

⏳ Waiting 5 seconds before reverse swap...

🔄 Swapping 0.388 USDC → FOGO...
   ✅ Success! Tx: 2mN9...

💰 Balances:
   FOGO: 9.9950
   USDC: 0.0000

⏳ Next cycle in 7.3 minutes...
```

---

## ⚠️ Catatan Penting

- ✅ Bot swap **80%** dari saldo FOGO, sisanya 20% untuk gas
- ✅ Minimal balance: **0.2 FOGO**
- ✅ USDC dust < 0.01 akan di-skip otomatis
- ✅ Bot auto-retry jika ada error
- ❌ **JANGAN** share private key ke siapapun!
- ❌ **JANGAN** commit file `.env` ke GitHub!

---

## 🛠️ Troubleshooting

### Bot tidak jalan?

```bash
# Cek logs
pm2 logs fogo-bot --lines 50

# Restart
pm2 restart fogo-bot
```

### Error "Not enough FOGO"?

Pastikan wallet punya minimal 0.2 FOGO untuk swap + gas.

### Error "PRIVATE_KEY tidak ditemukan"?

Pastikan file `.env` sudah ada dan PRIVATE_KEY terisi.

---

## 📄 License

MIT License - Free to use and modify.
