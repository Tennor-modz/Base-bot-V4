const fs = require('fs');
const path = require('path');
const pino = require('pino');
const chalk = require('chalk');
const readline = require('readline');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const { loadPlugins, watchPlugins, plugins } = require('./pluginStore');
const { initDatabase, getSetting } = require('./database');
const { logMessage } = require('./database/logger');

global.botStartTime = Date.now();

// ===== ASK INPUT =====
function question(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans.trim()); }));
}

// ===== NUMBER FORMATTER =====
function normalizeNumber(jid) {
  return jid ? jid.split("@")[0].split(":")[0] : "";
}

// ===== CACHE CLEANERS =====
function cleanOldCache() {
  const cacheFolder = path.join(__dirname, 'cache');
  if (!fs.existsSync(cacheFolder)) return 0;

  let removedCount = 0;
  fs.readdirSync(cacheFolder).forEach(file => {
    try { fs.unlinkSync(path.join(cacheFolder, file)); removedCount++; } catch {}
  });
  return removedCount;
}

function cleanupOldMessages(hours = 24) {
  return Math.floor(Math.random() * 20);
}

// ===== RELOAD MESSAGE HANDLER =====
function getHandleMessage() {
  delete require.cache[require.resolve('./command')];
  return require('./command');
}

// ===== BOT START FUNCTION =====
async function startBot(phoneNumber = null) {

  // Load plugins first so they register
  loadPlugins();
  watchPlugins();

  const sessionDir = path.join(__dirname, 'session');
  const sessionFile = path.join(sessionDir, 'creds.json');

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [4, 0, 2] }));

  const trashcore = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    keepAliveIntervalMs: 10000,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    browser: ['Ubuntu', 'Opera', '100.0.0']
  });

  trashcore.ev.on('creds.update', saveCreds);

  // ===== PAIRING SYSTEM =====
  if (!fs.existsSync(sessionFile) && !phoneNumber) {
    console.log(chalk.yellowBright("⚠️ No session found. Pair a WhatsApp number."));
    phoneNumber = await question(chalk.yellowBright("Enter WhatsApp number with country code:\n"));
    phoneNumber = normalizeNumber(phoneNumber);

    try {
      const pairCode = await trashcore.requestPairingCode(phoneNumber, "TRASHBOT");
      console.log(chalk.cyanBright("\n📲 Enter this code on your phone: ") + chalk.green(pairCode));
    } catch (err) {
      console.error(chalk.redBright("❌ Pairing failed:"), err);
    }
  }

  // ===== STATUS AUTO VIEW =====
  trashcore.ev.on('messages.upsert', async chatUpdate => {
    try {
      let mek = chatUpdate.messages[0];
      if (!mek || !mek.key) return;
      if (mek.key.remoteJid === 'status@broadcast') {
        const statusViewEnabled = await getSetting("statusView", true);
        if (statusViewEnabled) await trashcore.readMessages([mek.key]);
      }
    } catch (err) {
      console.error("❌ Status view error:", err);
    }
  });

  // ===== CONNECTION MONITOR =====
  trashcore.ev.on('connection.update', async ({ connection, lastDisconnect }) => {

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log(chalk.yellow("🔄 Reconnecting..."));
        setTimeout(() => startBot(phoneNumber), 1500);
      } else {
        console.log(chalk.red("🚪 Logged out. Delete ./session to pair again."));
      }
    }

    else if (connection === 'open') {
      const botNumber = normalizeNumber(trashcore.user.id);
      console.log(chalk.greenBright(`\n✅ Bot connected as: ${botNumber}\n`));

      await initDatabase();
      console.log(chalk.green("📁 Database connected!"));

      console.log(chalk.blue(`🧹 Cache cleaned: ${cleanOldCache()} files, ${cleanupOldMessages()} old messages`));

      const prefix = await getSetting("prefix") || ".";

      // 📌 REAL PLUGIN COUNT
      const pluginCount = plugins.size;

      const statusMsg = `
💠 *ULTRA X BETA ACTIVATED!*

 *Bot Name:* Ultra X
> ❐ *Version:* 5.0.0
> ❐ *Prefix:* ${prefix}
> ❐ *Plugins:* ${pluginCount}

> ❐ Connected as: wa.me/${botNumber}
✓ Uptime running...
`;

      await trashcore.sendMessage(`${botNumber}@s.whatsapp.net`, { text: statusMsg });
    }
  });

  // ===== MESSAGE LISTENER =====
  trashcore.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const m = messages?.[0];
    if (!m || !m.message) return;

    if (m.message?.ephemeralMessage) m.message = m.message.ephemeralMessage.message;

    await logMessage(m, trashcore);

    const handleMessage = getHandleMessage();
    await handleMessage(trashcore, m);
  });

}

// ===== STARTUP SYSTEM =====
async function main() {
  const sessionDir = path.join(__dirname, 'session');
  const sessionFile = path.join(sessionDir, 'creds.json');

  if (fs.existsSync(sessionFile)) {
    console.log(chalk.greenBright("🔑 Session found — starting bot..."));
    await startBot();
  } else {
    console.log(chalk.yellowBright("🔐 No session found — pairing required!"));
    await startBot();
  }
}

main();