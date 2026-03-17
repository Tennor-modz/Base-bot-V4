module.exports = {
  command: ["gitclone"],
  desc: "Download GitHub repository as ZIP",
  category: "Downloader",
  usage: ".gitclone <github repo link>",

  run: async ({ trashcore, chat, m, args, xreply }) => {
    try {

      const urlInput = args[0];

      if (!urlInput) {
        return xreply("Example:\n.gitclone https://github.com/user/repo");
      }

      const regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i;

      const isUrl = (url) =>
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi.test(url);

      if (!isUrl(urlInput) && !urlInput.includes("github.com")) {
        return xreply("❌ Invalid GitHub URL");
      }

      let [, user, repo] = urlInput.match(regex) || [];

      if (!user || !repo) {
        return xreply("❌ Invalid repository format");
      }

      repo = repo.replace(/\.git$/, "");

      const apiUrl = `https://api.github.com/repos/${user}/${repo}/zipball`;
      const fileName = `${encodeURIComponent(repo)}.zip`;

      await trashcore.sendMessage(
        chat,
        {
          document: { url: apiUrl },
          fileName: fileName,
          mimetype: "application/zip",
          caption: `📦 *GitHub Clone*\n🔗 ${urlInput}`
        },
        { quoted: m }
      );

    } catch (e) {
      console.error("GITCLONE ERROR:", e);
      xreply("❌ Failed to fetch repository.");
    }
  }
};