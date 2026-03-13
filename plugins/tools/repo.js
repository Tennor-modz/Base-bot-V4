
const axios = require('axios');

module.exports = {
  command: ["repo", "github", "repository"],
  desc: "Get information about the Trashcore Ultra GitHub repository",
  category: "Info",
  usage: ".repo",
  run: async ({ m, xreply }) => {
    const owner = "Tennor-modz";
    const repo = "trashcore-ultra";
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

    await xreply("📡 *Fetching repository data...*");

    try {
        const repoRes = await axios.get(apiUrl, { 
            headers: { "User-Agent": "TrashcoreBot" } 
        });
        const data = repoRes.data;

        const msg = `╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   🚀 *TRASHCORE ULTRA*   ┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

📁 *Repository*
  └ ${data.name}

🔗 *URL*
  └ ${data.html_url}

📊 *GitHub Stats*
  ├ ⭐ Stars    : ${data.stargazers_count.toLocaleString()}
  ├ 🍴 Forks    : ${data.forks_count.toLocaleString()}
  ├ 👀 Watchers : ${data.watchers_count.toLocaleString()}
  └ 🐛 Issues   : ${data.open_issues_count}

👤 *Owner*
  └ ${data.owner.login}

📝 *License*
  └ ${data.license?.name || 'None'}

🕒 *Last Updated*
  └ ${new Date(data.updated_at).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}

📋 *Description*
  └ "${data.description?.substring(0, 60) || 'Trashcore multiple device ultra'}..."

━━━━━━━━━━━━━━━━━━━
🌟 *Star on GitHub:* 
🔗 https://github.com/${owner}/${repo}
━━━━━━━━━━━━━━━━━━━`;

        await xreply(msg);
    } catch (err) {
        console.error('Repo error:', err);
        await xreply(`❌ *Error fetching repository*\n\n\`\`\`${err.message}\`\`\``);
    }
  }
};