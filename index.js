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

const { loadPlugins, watchPlugins } = require('./pluginStore');
const { initDatabase,getSetting } = require('./database');
const { logMessage } = require('./database/logger'); 

global.botStartTime = Date.now();

function question(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans.trim()); }));
}

// ===== Normalize number =====
function normalizeNumber(jid) {
  return jid ? jid.split("@")[0].split(":")[0] : "";
}

// ===== Cache cleaners =====
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

// ===== Autoreload command.js =====
function getHandleMessage() {
  delete require.cache[require.resolve('./command')];
  return require('./command');
}

// ===== Bot starter =====
async function startBot(phoneNumber = null) {

  loadPlugins();
  watchPlugins();

  const sessionDir = path.join(__dirname, 'session');
  const sessionFile = path.join(sessionDir, 'creds.json');

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [4,0,2] }));

  const trashcore = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    keepAliveIntervalMs: 10000,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    browser: ['Ubuntu','Opera','100.0.0']
  });

  trashcore.isPublic = true;
  trashcore.ev.on('creds.update', saveCreds);

  // ===== PAIRING =====
  if (!fs.existsSync(sessionFile) && !phoneNumber) {
    console.log(chalk.yellowBright("⚠️ No session found. You need to pair a WhatsApp number."));
    phoneNumber = await question(chalk.yellowBright("[ = ] Enter the WhatsApp number you want to use as a bot (with country code):\n"));
    phoneNumber = normalizeNumber(phoneNumber);
    console.log(chalk.greenBright(`⏳ Using number: ${phoneNumber} to start pairing...`));

    try {
      const pairCode = await trashcore.requestPairingCode(phoneNumber, "TRASHBOT");
      console.log(chalk.cyanBright("📲 Enter this code on your phone: ") + chalk.green(pairCode));
      console.log(chalk.yellowBright("⏳ Wait a few seconds and approve the pairing on your phone..."));
    } catch (err) {
      console.error(chalk.redBright("❌ Failed to request pairing code:"), err);
    }
  }

trashcore.ev.on('messages.upsert', async chatUpdate => {
    try {
        let mek = chatUpdate.messages[0];
        if (!mek || !mek.key) return;
        if (mek.key.remoteJid === 'status@broadcast') {
            const statusViewEnabled = await getSetting("statusView", true); 

            if (statusViewEnabled) {
                await trashcore.readMessages([mek.key]);
            }
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
        console.log(chalk.yellow("🔄 Connection closed, reconnecting..."));
        setTimeout(() => startBot(phoneNumber), 1500);
      } else {
        console.log(chalk.red("🚪 Logged out. Delete ./session to re-pair."));
      }
    } else if (connection === 'open') {
      const botNumber = normalizeNumber(trashcore.user.id);
      console.log(chalk.greenBright(`✅ Bot connected as ${botNumber}`));

      await initDatabase();
      console.log(chalk.greenBright("✅ Connected to SQLite database..."));

      const cleanedCache = cleanOldCache();
      const cleanedMessages = cleanupOldMessages(24);
      console.log(chalk.blueBright(`🧹 Cleaned ${cleanedCache} cache files, ${cleanedMessages} older messages`));

      console.log(chalk.greenBright("🚀 Ultra Bot is fully ready!"));
    }
  });

  // ===== MESSAGE LISTENER =====
  trashcore.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const m = messages?.[0];
    if (!m || !m.message) return;

    // Handle ephemeral messages
    if (m.message?.ephemeralMessage) m.message = m.message.ephemeralMessage.message;

    // ===== LOG MESSAGES =====
    await logMessage(m, trashcore);

    // ===== HANDLE COMMAND =====
    const handleMessage = getHandleMessage();
    await handleMessage(trashcore, m);
  });
}

// ================== STARTUP ==================
async function main() {
  const sessionDir = path.join(__dirname, 'session');
  const sessionFile = path.join(sessionDir, 'creds.json');

  if (fs.existsSync(sessionFile)) {
    console.log(chalk.greenBright("✅ Existing session found. Starting bot without pairing..."));
    await startBot();
  } else {
    console.log(chalk.yellowBright("⚠️ No session found! You need to pair your WhatsApp number."));
    await startBot();
  }
}

main();