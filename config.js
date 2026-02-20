module.exports = {
  // ===== Bot Identity =====
  BOT_NAME: "Ultra X",
  VERSION: "5.0.0",

  // ===== Core Settings =====
  PREFIX: ".",

  // ===== Owners (without + or spaces) =====
  OWNER: ["254788460896"],

  // ===== Sticker Settings =====
  PACK_NAME: "Trashcore Stickers",
  AUTHOR: "Trashcore",

  // ===== Session ID (optional – used if present) =====
  // ✅ Uses environment variable if set (Heroku-safe)
  SESSION_ID: process.env.SESSION_ID || "" // example: trashcore~BASE64_DATA
};
