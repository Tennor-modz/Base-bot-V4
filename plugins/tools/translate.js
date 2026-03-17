const axios = require("axios");

async function translate(text, to, from = "auto") {
  const { data } = await axios.get(
    "https://translate.googleapis.com/translate_a/single",
    {
      params: {
        client: "gtx",
        sl: from,
        tl: to,
        dt: "t",
        q: text
      }
    }
  );

  const result = data[0]?.map(s => s?.[0]).filter(Boolean).join("");
  const detectedLang = data[2] || from;

  return { result, detectedLang };
}

const langMap = {
  id: "Indonesia",
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  tr: "Turkish",
  th: "Thai",
  vi: "Vietnamese",
  ms: "Malay",
  nl: "Dutch",
  pl: "Polish",
  sv: "Swedish",
  hi: "Hindi"
};

module.exports = {
  command: ["tr", "translate", "tl"],
  desc: "Translate text to another language",
  category: "Tools",
  usage: ".tr <lang> <text> or reply message",

  run: async ({ m, args, xreply }) => {
    try {

      const quoted = m.quoted ? m.quoted : null;

      if (!args.length) {
        return xreply(
          "*Auto Translate*\n\n" +
          "Format:\n" +
          ".tr <language code> <text>\n" +
          ".tr <language code> (reply message)\n\n" +
          "*Language Codes:*\n" +
          Object.entries(langMap)
            .map(([k, v]) => `${k} — ${v}`)
            .join("\n")
        );
      }

      const to = args[0].toLowerCase();

      if (!langMap[to]) {
        return xreply(
          `❌ Language code *${to}* not recognized.\n\nType *.tr* to see the list.`
        );
      }

      const text =
        args.slice(1).join(" ") ||
        quoted?.text ||
        quoted?.caption ||
        "";

      if (!text) {
        return xreply(
          "⚠️ Provide text or reply to a message.\nExample:\n.tr en halo dunia"
        );
      }

      const { result, detectedLang } = await translate(text, to);

      return xreply(
        `🌐 *Translate*\n\n` +
        `From : ${langMap[detectedLang] || detectedLang}\n` +
        `To   : ${langMap[to]}\n\n` +
        `${result}`
      );

    } catch (err) {
      console.error("Translate Error:", err);
      xreply("❌ Translation failed.");
    }
  }
};