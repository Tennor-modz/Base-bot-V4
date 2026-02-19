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

// ===== NUMBER FORMATTER =====
function normalizeNumber(jid) {
  return jid ? jid.split("@")[0].split(":")[0] : "";
}

// ===== SESSION ID VALIDATOR =====
async function loadSessionFromString(sessionId) {
  try {
    if (!sessionId.startsWith("trashcore~")) {
      console.log(chalk.red("❌ SESSION_ID must start with trashcore~"));
      return false;
    }

    const base64 = sessionId.replace("trashcore~", "").trim();
    const base64Regex =
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

    if (!base64Regex.test(base64)) {
      console.log(chalk.red("❌ Invalid base64 SESSION_ID"));
      return false;
    }

    const buffer = Buffer.from(base64, "base64");
    if (!buffer || buffer.length < 50) {
      console.log(chalk.red("❌ SESSION_ID data is corrupted"));
      return false;
    }

    JSON.parse(buffer.toString("utf8"));

    const sessionDir = path.join(__dirname, 'session');
    const sessionFile = path.join(sessionDir, 'creds.json');

    await fs.promises.mkdir(sessionDir, { recursive: true });
    await fs.promises.writeFile(sessionFile, buffer);

    console.log(chalk.green("✅ SESSION_ID validated and saved"));
    return true;
  } catch (err) {
    console.error(chalk.red("❌ SESSION_ID validation failed:"), err);
    return false;
  }
}

// ===== LOAD SESSION FROM CONFIG =====
async function loadSessionFromConfig() {
  if (!config.SESSION_ID) return false;
  return loadSessionFromString(config.SESSION_ID);
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

  const sessionDir = path.join(__dirname, 'session');
  const sessionFile = path.join(sessionDir, 'creds.json');

  if (!fs.existsSync(sessionFile)) {
    let loaded = await loadSessionFromConfig();

    if (!loaded) {
      console.log(chalk.yellowBright("\n⚠️ No session found.\n"));
      console.log(chalk.cyan("1️⃣ Pair with phone number"));
      console.log(chalk.cyan("2️⃣ Enter SESSION_ID\n"));

      const choice = await question("Select option (1 or 2): ");

      if (choice === "2") {
        const sessionId = await question("\nPaste your SESSION_ID:\n");
        if (!(await loadSessionFromString(sessionId))) {
          console.log(chalk.red("❌ SESSION_ID failed."));
          process.exit(1);
        }
      } else {
        phoneNumber = normalizeNumber(
          await question("\nEnter WhatsApp number with country code:\n")
        );
      }
    }
  }

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

  if (!trashcore.authState.creds.registered && phoneNumber) {
    const pairCode = await trashcore.requestPairingCode(phoneNumber, "TRASHBOT");
    console.log(chalk.green("\n📲 Pairing Code:"), pairCode);
  }

  // ===== CONNECTION UPDATE =====
  trashcore.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log(chalk.yellow("🔄 Reconnecting..."));
        setTimeout(() => startBot(phoneNumber), 1500);
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
    }
  });

  // ===== ANTIDELETE =====
  const initAntiDelete = require('./database/antiDelete');
  trashcore.ev.on('connection.update', ({ connection }) => {
    if (connection === 'open') {
      const botNumber = trashcore.user.id.split(':')[0] + '@s.whatsapp.net';
      initAntiDelete(trashcore, {
        botNumber,
        dbPath: './library/antidelete.json',
        enabled: true
      });
      console.log(`✅ AntiDelete active`);
    }
  });

  // ===== MESSAGE HANDLER =====
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

// ===== START =====
(async () => {
  console.log(chalk.blueBright("🚀 Starting Trashcore Ultra X..."));
  await startBot();
})();