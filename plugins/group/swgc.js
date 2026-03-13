const {
  generateWAMessageFromContent,
  generateWAMessageContent,
  downloadContentFromMessage,
} = require("@trashcore/baileys");
const crypto = require("crypto");

module.exports = {
  command: ["upswgc", "swgc"],
  desc: "Upload media/text/link to WhatsApp group status",
  category: "Group",

  run: async ({ trashcore, chat, m, xreply, isOwner, text }) => {
    try {
      // Helper functions from original code
      function unwrapMsg(msg) {
        let m = msg || {};
        for (let i = 0; i < 10; i++) {
          if (m?.ephemeralMessage?.message) { m = m.ephemeralMessage.message; continue; }
          if (m?.viewOnceMessage?.message) { m = m.viewOnceMessage.message; continue; }
          if (m?.viewOnceMessageV2?.message) { m = m.viewOnceMessageV2.message; continue; }
          if (m?.viewOnceMessageV2Extension?.message) { m = m.viewOnceMessageV2Extension.message; continue; }
          if (m?.documentWithCaptionMessage?.message) { m = m.documentWithCaptionMessage.message; continue; }
          break;
        }
        return m;
      }

      const MEDIA_TYPES = ["imageMessage", "videoMessage", "audioMessage", "documentMessage", "stickerMessage"];
      const TEXT_TYPES = ["extendedTextMessage", "conversation"];

      function pickNode(raw) {
        if (!raw) return null;
        const u = unwrapMsg(raw);
        for (const t of MEDIA_TYPES) {
          if (u?.[t]) return { node: u[t], type: t };
        }
        for (const t of TEXT_TYPES) {
          if (u?.[t]) return { node: u[t], type: t };
        }
        return null;
      }

      function getQuotedRaw(m) {
        if (m.quoted?.message) return m.quoted.message;
        const raw = m.message;
        if (!raw) return null;
        const u = unwrapMsg(raw);
        const ci =
          u?.extendedTextMessage?.contextInfo ||
          u?.imageMessage?.contextInfo ||
          u?.videoMessage?.contextInfo ||
          u?.audioMessage?.contextInfo ||
          u?.documentMessage?.contextInfo ||
          null;
        return ci?.quotedMessage || null;
      }

      async function downloadMedia(node, type) {
        const streamType = type.replace("Message", "");
        const stream = await downloadContentFromMessage(node, streamType);
        let buf = Buffer.from([]);
        for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
        return buf;
      }

      const BG_COLORS = [0xFF8A2BE2, 0xFFFF69B4, 0xFFFFA500, 0xFF00BFFF, 0xFF32CD32, 0xFFFF4500, 0xFF1E90FF];
      const randomBg = () => BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)];

      function isUrl(str) {
        return /^https?:\/\//i.test(str.trim());
      }

      function getDomain(url) {
        try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
      }

      // Main logic
      if (!chat.endsWith("@g.us"))
        return xreply("⚠️ This command is only for groups.");

      if (!isOwner) return xreply("⚠️ Only the bot owner can use this command");

      let picked = null;
      let caption = text || "";

      const quotedRaw = getQuotedRaw(m);
      if (quotedRaw) {
        picked = pickNode(quotedRaw);
      }

      if (!picked && m.message) {
        const selfPicked = pickNode(m.message);
        if (selfPicked && MEDIA_TYPES.includes(selfPicked.type)) {
          picked = selfPicked;
        }
      }

      if (!picked) {
        const statusText =
          caption ||
          (() => {
            const u = unwrapMsg(m.message);
            return u?.extendedTextMessage?.text || u?.conversation || "";
          })();

        if (!statusText) {
          return xreply(
            `> ❌ *NO CONTENT!*\n` +
            `\n` +
            `> 📋 *How to Use:*\n` +
            `\n` +
            `> 1️⃣ *Image/Video:*\n` +
            `>    Send/reply media → \`.swgc\`\n` +
            `>    With caption → \`.swgc This caption\`\n` +
            `\n` +
            `> 2️⃣ *Plain text:*\n` +
            `>    \`.swgc Hello everyone! 🎉\`\n` +
            `\n` +
            `> 3️⃣ *Link/Preview:*\n` +
            `>    \`.swgc https://youtu.be/xxx\`\n` +
            `\n` +
            `> 4️⃣ *Voice Note:*\n` +
            `>    Reply audio → \`.swgc\`\n` +
            `\n` +
            `> ✅ *Support:* Image • Video • Audio/VN • Text • Link Preview`
          );
        }

        picked = { node: statusText, type: "text" };
        caption = "";
      }

      let contentPayload = {};
      let typeLabel = "";

      if (picked.type === "imageMessage") {
        const buf = await downloadMedia(picked.node, "imageMessage");
        contentPayload = { image: buf, caption: caption || picked.node?.caption || "" };
        typeLabel = "📷 Image";

      } else if (picked.type === "videoMessage") {
        const buf = await downloadMedia(picked.node, "videoMessage");
        contentPayload = { video: buf, caption: caption || picked.node?.caption || "", gifPlayback: false };
        typeLabel = "🎥 Video";

      } else if (picked.type === "audioMessage") {
        const buf = await downloadMedia(picked.node, "audioMessage");
        const isPtt = picked.node?.ptt === true;
        contentPayload = {
          audio: buf,
          mimetype: isPtt ? "audio/ogg; codecs=opus" : "audio/mp4",
          ptt: isPtt,
        };
        typeLabel = isPtt ? "🎤 Voice Note" : "🎵 Audio";

      } else if (picked.type === "stickerMessage") {
        const buf = await downloadMedia(picked.node, "stickerMessage");
        contentPayload = { image: buf, caption: caption || "" };
        typeLabel = "🖼️ Sticker (as image)";

      } else if (picked.type === "documentMessage") {
        const fname = picked.node?.fileName || "Document";
        const textDoc = `📄 *${fname}*\n${caption || ""}`;
        contentPayload = { text: textDoc, linkPreview: null };
        typeLabel = "📄 Document (as text)";

      } else {
        const rawText = typeof picked.node === "string" ? picked.node : caption;

        if (isUrl(rawText)) {
          contentPayload = {
            text: rawText,
            linkPreview: {
              url: rawText,
              title: getDomain(rawText),
              description: caption || rawText,
              thumbnail: null,
            },
          };
          typeLabel = `🔗 Link — ${getDomain(rawText)}`;

        } else {
          contentPayload = {
            text: rawText,
            backgroundArgb: randomBg(),
            textArgb: 0xFFFFFFFF,
            font: Math.floor(Math.random() * 5) + 1,
          };
          typeLabel = "📝 Text";
        }
      }

      let waContent;
      try {
        waContent = await generateWAMessageContent(contentPayload, { upload: trashcore.waUploadToServer });
      } catch (genErr) {
        console.error("[UPSWGC] generateWAMessageContent error:", genErr.message);
        const fallbackText = caption || (typeof picked.node === "string" ? picked.node : "") || typeLabel;
        waContent = await generateWAMessageContent(
          {
            text: fallbackText || "(status)",
            backgroundArgb: randomBg(),
            textArgb: 0xFFFFFFFF,
            font: 1,
          },
          { upload: trashcore.waUploadToServer }
        );
        typeLabel += " (fallback text)";
      }

      const messageSecret = crypto.randomBytes(32);

      const finalMsg = generateWAMessageFromContent(
        chat,
        {
          messageContextInfo: { messageSecret },
          groupStatusMessageV2: {
            message: {
              ...waContent,
              messageContextInfo: { messageSecret },
            },
          },
        },
        { userJid: trashcore.user.id }
      );

      await trashcore.relayMessage(chat, finalMsg.message, { messageId: finalMsg.key.id });

      let successMsg =
        `> ✅ *GROUP STATUS SUCCESSFUL!*\n\n` +
        `> 📌 Type: ${typeLabel}\n`;
      if (caption && !["🎤 Voice Note", "🎵 Audio"].includes(typeLabel)) {
        successMsg += `> 📝 Caption: ${caption}\n`;
      }
      successMsg += `\n> 💡 Status has been published to the group`;

      await xreply(successMsg);

    } catch (e) {
      console.error("[UPSWGC ERROR]", e);

      let errorMsg = `> ❌ *UPLOAD STATUS FAILED*\n\n`;

      if (e.message?.includes("not-authorized")) {
        errorMsg += `> 🔒 Bot is not authorized to upload status\n> 💡 Make sure the bot is properly connected`;
      } else if (e.message?.includes("rate-overlimit")) {
        errorMsg += `> ⏱️ Too many requests\n> 💡 Wait a moment and try again`;
      } else if (e.message?.includes("Invalid media")) {
        errorMsg += `> ⚠️ Media format not supported\n> 💡 Try with a different image/video`;
      } else {
        errorMsg += `> 🔧 Error: ${e.message}`;
      }

      await xreply(errorMsg);
    }
  },
};