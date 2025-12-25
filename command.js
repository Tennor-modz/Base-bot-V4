const { plugins } = require('./pluginStore');
const { getSetting } = require('./database');

function normalizeNumber(jid) {
  return jid ? jid.split("@")[0].split(":")[0] : "";
}

async function handleMessage(trashcore, m) {
  if (!m || !m.message) return;

  const chatId = m.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");
  const isFromMe = m.key.fromMe === true;

  if (isFromMe && isGroup) return;

  const senderJid = m.key.participant || chatId;
  const senderNumber = normalizeNumber(senderJid);
  const botNumber = normalizeNumber(trashcore.user.id);
  const isSelf = senderNumber === botNumber;
  const isOwner = senderNumber === botNumber;

  const text =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    m.message?.documentMessage?.caption ||
    m.message?.buttonsResponseMessage?.selectedButtonId ||
    m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.message?.templateButtonReplyMessage?.selectedId ||
    "";

  if (!text) return;

  const prefix = await getSetting("prefix", ".");
  if (!text.startsWith(prefix)) return;

  const args = text.slice(prefix.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  const plugin = plugins.get(command);
  if (!plugin) return;

  const privateMode = await getSetting("privateMode", false);
  if (privateMode && !isOwner) return;
  const xreply = async (replyText) => {
    await trashcore.sendMessage(chatId, { text: replyText }, { quoted: m });
  };

  try {
    await plugin.run({
      trashcore,
      m,
      args,
      text: args.join(" "),
      command,
      sender: senderNumber,
      chat: chatId,
      isGroup,
      isSelf,
      isOwner,
      xreply,
    });
  } catch (err) {
    console.error("❌ Plugin error:", err);
  }
}

module.exports = handleMessage;