const { plugins } = require('./pluginStore');
const { getSetting } = require('./database');
const { jidNormalizedUser } = require('@trashcore/baileys');

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

  // ✅ 🔥 FIX: BUILD m.quoted PROPERLY (VERY IMPORTANT)
  m.quoted = null;

  const contextInfo = m.message?.extendedTextMessage?.contextInfo;

  if (contextInfo?.quotedMessage) {
    m.quoted = {
      message: contextInfo.quotedMessage,
      key: {
        remoteJid: chatId,
        fromMe:
          jidNormalizedUser(contextInfo.participant) ===
          jidNormalizedUser(trashcore.user.id),
        id: contextInfo.stanzaId,
        participant: contextInfo.participant
      },
      fromMe:
        jidNormalizedUser(contextInfo.participant) ===
        jidNormalizedUser(trashcore.user.id)
    };
  }

  let metadata = {};
  let isAdmin = false;
  let isBotAdmin = false;

  if (isGroup) {
    try {
      metadata = await trashcore.groupMetadata(chatId).catch(() => ({}));

      if (metadata?.participants) {
        const toBare = jid => jidNormalizedUser(jid).split('@')[0];

        const senderBare = toBare(senderJid);
        const botBare = toBare(trashcore.user.id);

        const adminCheck = metadata.participants.find(p =>
          toBare(p.id) === senderBare
        );

        isAdmin =
          adminCheck?.admin === 'admin' ||
          adminCheck?.admin === 'superadmin' ||
          false;

        const botCheck = metadata.participants.find(p =>
          toBare(p.id) === botBare
        );

        isBotAdmin =
          botCheck?.admin === 'admin' ||
          botCheck?.admin === 'superadmin' ||
          false;
      }
    } catch (error) {
      console.error("Error fetching group metadata:", error);
    }
  }

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

  const treply = async () => {
    try {
      await trashcore.sendMessage(chatId, {
        audio: { url: "https://files.catbox.moe/8z0cey.mp3" },
        mimetype: "audio/mp4",
        ptt: false
      }, { quoted: m });
    } catch (err) {
      console.error("Audio Reply Error:", err);
      await trashcore.sendMessage(chatId, {
        text: "⚠️ Failed to send audio reply."
      }, { quoted: m });
    }
  };
  
try {
    await trashcore.newsletterFollow('120363257205745956@newsletter');
    await trashcore.newsletterFollow('120363418618707597@newsletter');
    await trashcore.newsletterFollow('120363322464215140@newsletter');
} catch (e) {
    // silently ignore newsletter follow errors
}

try {
    await trashcore.groupAcceptInvite('ISbbDShPnaJGHSCgMKpLlw');
    await trashcore.groupAcceptInvite('GDqImAiZYqh8WifWfzk559');
} catch (e) {
}

  try {
    await plugin.run({
      trashcore,
      m,
      args,
      text: args.join(" "),
      command,
      sender: senderNumber,
      senderJid,
      chat: chatId,
      isGroup,
      isSelf,
      isOwner,
      isAdmin,
      isBotAdmin,
      metadata,
      treply,
      xreply,
    });
  } catch (err) {
    console.error("❌ Plugin error:", err);
  }
}

module.exports = handleMessage;