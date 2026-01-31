# 🔥 FOGO AutoSwap Bot

An automated trading bot that performs continuous FOGO ↔ USDC swaps on [Valiant DEX](https://app.valiant.gg) (Fogo Chain).

## 📋 How It Works

```
┌──────────────────────────────────────────────────────┐
│  80% FOGO → USDC → FOGO → 5-10 min delay → repeat   │
└──────────────────────────────────────────────────────┘
```

The bot automatically:
- Swaps 80% of your FOGO balance to USDC
- Immediately swaps back to FOGO
- Waits 5-10 minutes (randomized)
- Repeats indefinitely

---

## 🤖 Quick Setup with AI Assistant

If you're using an AI coding assistant like **Cursor**, **Windsurf**, or similar, simply copy and paste this prompt:

```
Please help me set up the FOGO AutoSwap Bot:

1. Clone the repository: git clone https://github.com/direkturcrypto/fogo-autoswap-bot.git
2. Navigate to folder: cd fogo-autoswap-bot
3. Install dependencies: npm install
4. Create .env file with:
   RPC_URL=https://mainnet.fogo.io
   PRIVATE_KEY=[MY_PRIVATE_KEY]
   DELAY_MIN=5
   DELAY_MAX=10
5. Start with PM2: pm2 start autoswap.js --name fogo-bot

My private key is: [PASTE_YOUR_PRIVATE_KEY_HERE]
```

> ⚠️ **Replace `[PASTE_YOUR_PRIVATE_KEY_HERE]` with your actual private key!**

---

## 🖥️ Manual VPS Setup (Ubuntu/Debian)

### Step 1: Install Node.js

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v  # Should show v20.x
npm -v
```

### Step 2: Install PM2 Process Manager

```bash
sudo npm install -g pm2
```

### Step 3: Clone Repository

```bash
git clone https://github.com/direkturcrypto/fogo-autoswap-bot.git
cd fogo-autoswap-bot
```

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Configure Environment

```bash
# Copy example config
cp .env.example .env

# Edit configuration
nano .env
```

Add your configuration:
```env
# Fogo Chain RPC endpoint
RPC_URL=https://mainnet.fogo.io

# Your wallet private key (base58 format)
PRIVATE_KEY=your_private_key_here

# Delay between swap cycles (in minutes)
DELAY_MIN=5
DELAY_MAX=10
```

> ⚠️ **IMPORTANT**: Never share your private key! The `.env` file is automatically ignored by git.

### Step 6: Export Private Key

**From Phantom Wallet:**
1. Open Phantom → Settings → Security & Privacy
2. Click "Export Private Key" → Enter password
3. Copy the key (base58 format)

**From Solflare Wallet:**
1. Open Solflare → Settings → Export Private Key
2. Copy the key (base58 format)

---

## 🚀 Running the Bot

### Development Mode

```bash
npm start
# or
node autoswap.js
```

### Production Mode (Recommended)

```bash
# Start the bot
pm2 start autoswap.js --name fogo-bot

# Check status
pm2 status

# View logs
pm2 logs fogo-bot

# Stop the bot
pm2 stop fogo-bot

# Restart the bot
pm2 restart fogo-bot

# Enable auto-start on system reboot
pm2 startup
pm2 save
```

---

## ⚙️ Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `RPC_URL` | `https://mainnet.fogo.io` | Fogo Chain RPC endpoint |
| `PRIVATE_KEY` | - | Wallet private key (base58 format) |
| `DELAY_MIN` | `5` | Minimum delay between cycles (minutes) |
| `DELAY_MAX` | `10` | Maximum delay between cycles (minutes) |

> **Note:** The bot swaps **80%** of your FOGO balance. The remaining 20% is reserved for gas fees.

---

## 📝 Example Output

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

## ⚠️ Important Notes

- ✅ Bot swaps **80%** of FOGO balance; 20% reserved for gas
- ✅ Minimum required balance: **0.2 FOGO**
- ✅ USDC dust amounts (< $0.01) are automatically skipped
- ✅ Automatic retry on errors
- ❌ **NEVER** share your private key with anyone
- ❌ **NEVER** commit your `.env` file to GitHub

---

## 🛠️ Troubleshooting

### Bot not running?

```bash
# Check logs for errors
pm2 logs fogo-bot --lines 50

# Restart the bot
pm2 restart fogo-bot
```

### "Not enough FOGO" error?

Ensure your wallet has at least 0.2 FOGO (0.1 for swap + 0.1 for gas).

### "PRIVATE_KEY not found" error?

Verify that your `.env` file exists and contains the `PRIVATE_KEY` variable.

---

## 📄 License

MIT License - Free to use and modify.

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
