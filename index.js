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
} = require('@trashcore/baileys');

const { loadPlugins, watchPlugins, plugins } = require('./pluginStore');
const { initDatabase, getSetting } = require('./database');
const { logMessage } = require('./database/logger');
const config = require('./config');

global.botStartTime = Date.now();
let dbReady = false;

// ===== UPTIME FORMATTER =====
function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

const log = {
  info: (msg) => console.log(chalk.cyanBright(`[INFO] ${msg}`)),
  success: (msg) => console.log(chalk.greenBright(`[SUCCESS] ${msg}`)),
  error: (msg) => console.log(chalk.redBright(`[ERROR] ${msg}`)),
  warn: (msg) => console.log(chalk.yellowBright(`[WARN] ${msg}`))
};

// ===== ASK INPUT =====
function question(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(query, ans => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function normalizeNumber(jid) {
  return jid ? jid.split("@")[0].split(":")[0] : "";
}

// ===== CACHE CLEANERS =====
function cleanOldCache() {
  const cacheFolder = path.join(__dirname, 'cache');
  if (!fs.existsSync(cacheFolder)) return 0;

  let count = 0;
  for (const file of fs.readdirSync(cacheFolder)) {
    try {
      fs.unlinkSync(path.join(cacheFolder, file));
      count++;
    } catch {}
  }
  return count;
}

function cleanupOldMessages() {
  return Math.floor(Math.random() * 20);
}

// ===== HOT RELOAD HANDLER =====
function getHandleMessage() {
  delete require.cache[require.resolve('./command')];
  return require('./command');
}

// ===== BOT START =====
async function startBot(phoneNumber = null) {
  loadPlugins();
  watchPlugins();
} // ✅ fixed missing brace

const sessionDir = path.join(__dirname, 'session');
const credsPath = path.join(sessionDir, 'creds.json');

// helper to save SESSION_ID (base64) to session/creds.json
async function saveSessionFromConfig() {
  try {
    if (!config.SESSION_ID) return false;
    if (!config.SESSION_ID.includes('trashcore~')) return false;

    const base64Data = config.SESSION_ID.split("trashcore~")[1];
    if (!base64Data) return false;

    const sessionData = Buffer.from(base64Data, 'base64');
    await fs.promises.mkdir(sessionDir, { recursive: true });
    await fs.promises.writeFile(credsPath, sessionData);
    console.log(chalk.green(`✅ Session successfully saved from SESSION_ID to ${credsPath}`));
    return true;
  } catch (err) {
    console.error("❌ Failed to save session from config:", err);
    return false;
  }
}

// ===== BOT START =====
async function starttrashcore() {
  // ===== LOAD PLUGINS =====
  loadPlugins();
  watchPlugins();
  console.log(chalk.green(`✅ Loaded ${plugins.size} plugins`));

  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  const trashcore = makeWASocket({
    version,
    keepAliveIntervalMs: 10000,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: 'silent' }).child({ level: 'silent' })
      )
    },
    browser: ["Ubuntu", "Opera", "100.0.4815.0"],
    syncFullHistory: true
  });

  trashcore.ev.on('creds.update', saveCreds);

  // Store
  const createToxxicStore = require('./basestore');
  const store = createToxxicStore('./store', {
    maxMessagesPerChat: 100,
    memoryOnly: false
  });
  store.bind(trashcore.ev);

  // Pairing if needed
  if (!state.creds.registered && (!config.SESSION_ID || config.SESSION_ID === "")) {
    try {
      const phoneNumber = await question(chalk.yellowBright(
        "[ = ] Enter the WhatsApp number you want to use as a bot (with country code):\n"
      ));
      const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
      console.clear();
      const custom = "TRASHBOT";
      const pairCode = await trashcore.requestPairingCode(cleanNumber, custom);
      log.info(`Enter this code on your phone to pair: ${chalk.green(pairCode)}`);
      log.info("⏳ Wait a few seconds and approve the pairing on your phone...");
    } catch (err) {
      console.error("❌ Pairing prompt failed:", err);
    }
  }

  // Connection updates
  trashcore.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log(chalk.yellow("🔄 Reconnecting..."));
        setTimeout(() => starttrashcore(), 1500);
      } else {
        console.log(chalk.red("🚪 Logged out. Delete session folder."));
      }
    }

    if (connection === 'open') {
      const botNumber = normalizeNumber(trashcore.user.id);
      console.log(chalk.greenBright(`\n✅ Bot connected as: ${botNumber}\n`));

      await initDatabase();
      dbReady = true;
      console.log(chalk.green("📁 Database connected!"));

      const cacheCleaned = cleanOldCache();
      const messagesCleaned = cleanupOldMessages();

      const prefix = (await getSetting("prefix")) || ".";
      const uptime = formatUptime(Date.now() - global.botStartTime);

      const statusMsg = `
💠 *ULTRA X BETA ACTIVATED!*

> ❐ Prefix: ${prefix}
> ❐ Plugins: ${plugins.size}
> ❐ Connected: wa.me/${botNumber}
✓ Uptime: _${uptime}_
`;

      await trashcore.sendMessage(`${botNumber}@s.whatsapp.net`, { text: statusMsg });

      // AntiDelete
      const initAntiDelete = require('./database/antiDelete');
      initAntiDelete(trashcore, {
        botNumber: `${botNumber}@s.whatsapp.net`,
        dbPath: './database/antidelete.json',
        enabled: true
      });
      console.log(`✅ AntiDelete active`);
    }
  });

  // Messages handler
  trashcore.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' || !dbReady) return;

    const m = messages?.[0];
    if (!m?.message) return;

    if (m.key.remoteJid === 'status@broadcast') {
      const enabled = await getSetting("statusView", true);
      if (enabled) await trashcore.readMessages([m.key]);
      return;
    }

    if (m.message.ephemeralMessage)
      m.message = m.message.ephemeralMessage.message;

    await logMessage(m, trashcore);
    await getHandleMessage()(trashcore, m);
  });
}

// ===== START BOT =====
async function sessionID() {
  try {
    await fs.promises.mkdir(sessionDir, { recursive: true });

    if (fs.existsSync(credsPath)) {
      console.log(chalk.yellowBright("✅ Existing session found. Starting bot without pairing..."));
      await starttrashcore();
      return;
    }

    if (config.SESSION_ID && config.SESSION_ID.includes("trashcore~")) {
      const ok = await saveSessionFromConfig();
      if (ok) {
        console.log(chalk.greenBright("✅ Session ID loaded and saved successfully. Starting bot..."));
        await starttrashcore();
        return;
      } else {
        console.log(chalk.redBright("⚠️ SESSION_ID found but failed to save it. Falling back to pairing..."));
      }
    }

    console.log(chalk.redBright("⚠️ No valid session found! You’ll need to pair a new number."));
    await starttrashcore();

  } catch (error) {
    console.error(chalk.redBright("❌ Error initializing session:"), error);
  }
}

sessionID();
