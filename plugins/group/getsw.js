const { downloadContentFromMessage } = require("@trashcore/baileys");

async function downloadMedia(mediaNode, type) {
  const streamType = type.replace("Message", "").toLowerCase();
  const stream = await downloadContentFromMessage(mediaNode, streamType);
  let buffer = Buffer.from([]);
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
  return buffer;
}

function deepUnwrap(msg) {
  if (!msg || typeof msg !== "object") return msg;
  let m = msg;
  for (let i = 0; i < 15; i++) {
    if (m?.ephemeralMessage?.message) { m = m.ephemeralMessage.message; continue; }
    if (m?.viewOnceMessage?.message) { m = m.viewOnceMessage.message; continue; }
    if (m?.viewOnceMessageV2?.message) { m = m.viewOnceMessageV2.message; continue; }
    if (m?.viewOnceMessageV2Extension?.message) { m = m.viewOnceMessageV2Extension.message; continue; }
    if (m?.documentWithCaptionMessage?.message) { m = m.documentWithCaptionMessage.message; continue; }
    if (m?.editedMessage?.message) { m = m.editedMessage.message; continue; }
    break;
  }
  return m;
}

function resolveToPhone(jid, participants = []) {
  if (!jid) return jid;

  const num = jid.replace(/@.*$/, "").replace(/[^0-9]/g, "");

  for (const p of participants) {
    const ids = [p.id, p.jid, p.lid].filter(Boolean);
    const match = ids.some((id) => id.replace(/[^0-9]/g, "") === num);
    if (match) {
      const phone = ids.find((id) => id.endsWith("@s.whatsapp.net") && !id.includes(":"));
      if (phone) return phone;
    }
  }

  // Note: resolveAnyLidToJid and cacheParticipantLids functions need to be imported/implemented
  // For now, using a simplified version
  if (jid.endsWith("@lid")) return jid.replace("@lid", "@s.whatsapp.net");

  return jid;
}

module.exports = {
  command: ["getsw"],
  desc: "Retrieve media from status that mentioned/tagged the group",
  category: "Group",

  run: async ({ trashcore, chat, m, xreply, participants, isOwner }) => {
    try {
      if (!chat.endsWith("@g.us"))
        return xreply("⚠️ This command is only for groups.");

      if (!m.quoted) {
        return xreply(
          `❌ *REPLY TO NOTIFICATION MESSAGE!*\n\n` +
          `📋 *How to Use:*\n` +
          `1. Wait for someone to tag the group in their status\n` +
          `2. WhatsApp will send a notification to the group\n` +
          `3. Reply to that notification with this command\n\n` +
          `💡 *Example:*\n` +
          `[Notification: "Status from user @ Group name"]\n` +
          `└─ Reply: .getsw`
        );
      }

      const rawSender = m.quoted?.sender || m.msg?.contextInfo?.participant;
      if (!rawSender) return xreply("❌ Cannot detect status sender!");

      const statusSender = resolveToPhone(rawSender, participants);
      const senderNum = statusSender.replace(/[^0-9]/g, "");

      if (!global.statusStore) {
        return xreply(
          `❌ *STATUS STORE NOT ACTIVE!*\n\n` +
          `💡 Make sure \`index.js\` has been updated with status@broadcast listener.`
        );
      }

      let userStatuses = global.statusStore.get(rawSender) || [];

      if (userStatuses.length === 0) {
        for (const [key, val] of global.statusStore.entries()) {
          if (key.replace(/[^0-9]/g, "") === senderNum) {
            userStatuses = val;
            break;
          }
        }
      }

      if (userStatuses.length === 0) {
        return xreply(
          `❌ *STATUS NOT FOUND IN STORE!*\n\n` +
          `👤 User: @${senderNum}\n\n` +
          `💡 Possibilities:\n` +
          `• Bot just restarted, status hasn't entered store yet\n` +
          `• Status has been deleted by user\n` +
          `• Bot hasn't received status from this user yet\n\n` +
          `🔄 Ask user to upload new status again`,
          { mentions: [statusSender] }
        );
      }

      const latestMsg = userStatuses[userStatuses.length - 1];
      const statusContent = deepUnwrap(latestMsg?.message);
      if (!statusContent) return xreply("❌ Status content is empty!");

      const supportedTypes = ["imageMessage", "videoMessage", "audioMessage", "extendedTextMessage", "conversation"];
      const type = Object.keys(statusContent).find((k) => supportedTypes.includes(k));

      if (!type) {
        return xreply(
          `❌ *STATUS TYPE NOT SUPPORTED!*\n\n` +
          `📋 Type: ${Object.keys(statusContent).join(", ")}\n\n` +
          `💡 Only supports: image, video, audio, text`
        );
      }

      const node = statusContent[type];
      const caption =
        node?.caption ||
        statusContent?.extendedTextMessage?.text ||
        (typeof statusContent?.conversation === "string" ? statusContent.conversation : "") ||
        "";

      if (type === "imageMessage") {
        const buffer = await downloadMedia(node, type);
        await trashcore.sendMessage(chat, {
          image: buffer,
          caption:
            `✅ *STATUS SUCCESSFULLY RETRIEVED!*\n\n` +
            `👤 From: @${senderNum}\n` +
            `📷 Type: Image` +
            (caption ? `\n📝 Caption: ${caption}` : ""),
          mentions: [statusSender],
        }, { quoted: m });

      } else if (type === "videoMessage") {
        const buffer = await downloadMedia(node, type);
        await trashcore.sendMessage(chat, {
          video: buffer,
          caption:
            `✅ *STATUS SUCCESSFULLY RETRIEVED!*\n\n` +
            `👤 From: @${senderNum}\n` +
            `🎥 Type: Video` +
            (caption ? `\n📝 Caption: ${caption}` : ""),
          mentions: [statusSender],
          mimetype: "video/mp4",
        }, { quoted: m });

      } else if (type === "audioMessage") {
        const buffer = await downloadMedia(node, type);
        await trashcore.sendMessage(chat, {
          audio: buffer,
          mimetype: node.mimetype || "audio/mp4",
          ptt: node.ptt || false,
        }, { quoted: m });
        await xreply(
          `✅ *STATUS SUCCESSFULLY RETRIEVED!*\n\n` +
          `👤 From: @${senderNum}\n` +
          `🎤 Type: ${node.ptt ? "Voice Note" : "Audio"}`,
          { mentions: [statusSender] }
        );

      } else if (type === "extendedTextMessage" || type === "conversation") {
        await xreply(
          `✅ *STATUS SUCCESSFULLY RETRIEVED!*\n\n` +
          `👤 From: @${senderNum}\n` +
          `📝 Type: Text\n\n` +
          `💬 Status Content:\n${caption || "No text"}`,
          { mentions: [statusSender] }
        );
      }

    } catch (err) {
      console.error("[GETSW ERROR]", err);

      let errorMsg = "❌ *FAILED TO RETRIEVE STATUS!*\n\n";
      if (err.message?.includes("not-authorized")) errorMsg += "🔒 Bot does not have access.\n💡 Make sure bot is in user's contacts.";
      else if (err.message?.includes("rate-overlimit")) errorMsg += "⏱️ Too many requests.\n💡 Wait and try again.";
      else errorMsg += `🔧 Error: ${err.message}`;

      await xreply(errorMsg);
    }
  },
};