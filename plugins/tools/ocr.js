module.exports = {
  command: ["ocr", "readtext"],
  desc: "Extract text from an image",
  category: "Tools",
  usage: ".ocr (reply to an image or send an image)",
  
  run: async ({ m, trashcore, xreply, chat }) => {
    try {
      const axios = require("axios");
      const { downloadContentFromMessage } = require("@trashcore/baileys");

      const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const msg = (quotedMsg && quotedMsg.imageMessage) || m.message?.imageMessage;

      if (!msg) {
        return await xreply("⚠️ Send or reply to an *image* with the caption *ocr* to extract text.");
      }

      const mime = msg.mimetype || "";
      if (!/image/.test(mime)) {
        return await xreply("⚠️ This command only works with *images*!");
      }

      await trashcore.sendMessage(chat, { react: { text: "⏳", key: m.key } });

      // Download image
      const stream = await downloadContentFromMessage(msg, "image");
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      const mimeType = /png/.test(mime) ? "image/png" : "image/jpeg";
      const imageBase64 = buffer.toString("base64");
      const res = await axios.post(
        "https://staging-ai-image-ocr-266i.frontend.encr.app/api/ocr/process",
        { imageBase64, mimeType },
        { headers: { "content-type": "application/json" } }
      );

      const text = res.data.extractedText?.trim() || "❌ No text detected in the image.";
      await xreply(`📄 *Extracted Text:*\n\n${text}`);

      await trashcore.sendMessage(chat, { react: { text: "✅", key: m.key } });

    } catch (err) {
      console.error("❌ OCR Error:", err);
      await xreply("💥 Failed to read text from image. Please try again later.");
      await trashcore.sendMessage(chat, { react: { text: "❌", key: m.key } });
    }
  }
};