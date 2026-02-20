const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { downloadContentFromMessage } = require('@trashcore/baileys');
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('../../library/exif'); 
const ffmpeg = require('fluent-ffmpeg');
const config = require('../../config'); 

module.exports = {
  command: ['sticker', 's'],
  desc: "Create a sticker from image or video",
  category: "Fun",
  usage: ".sticker (reply to image/video or send media directly)",

  run: async ({ m, trashcore, xreply, command,chat }) => {
    try {
      const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const msg =
        (quotedMsg && (quotedMsg.imageMessage || quotedMsg.videoMessage)) ||
        m.message?.imageMessage ||
        m.message?.videoMessage;

      if (!msg) {
        return xreply(`⚠️ Reply to an *image* or *video* with caption *${command}*\n\n🎥 *Max Video Duration:* 30 seconds`);
      }

      const mime = msg.mimetype || '';
      if (!/image|video/.test(mime)) {
        return xreply("⚠️ Only works on *image* or *video* messages!");
      }

      // ⏳ Duration check for videos
      if (msg.videoMessage && msg.videoMessage.seconds > 30) {
        return xreply("⚠️ Maximum video duration is 30 seconds!");
      }

      await xreply("🪄 Creating your sticker...");
      const stream = await downloadContentFromMessage(msg, mime.split('/')[0]);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      let webpPath;
      if (/image/.test(mime)) {
        webpPath = await writeExifImg(buffer, {
          packname: config.PACK_NAME || "Trashcore Stickers",
          author: config.AUTHOR || "Trashcore",
        });
      } else {
        webpPath = await writeExifVid(buffer, {
          packname: config.PACK_NAME || "Trashcore Stickers",
          author: config.AUTHOR || "Trashcore",
        });
      }

      const stickerBuffer = fs.readFileSync(webpPath);

      await trashcore.sendMessage(chat, { sticker: stickerBuffer }, { quoted: m });

      fs.unlinkSync(webpPath); // Cleanup
    } catch (err) {
      console.error("❌ sticker error:", err);
      await xreply(`💥 Failed to create sticker:\n${err.message}`);
    }
  }
};