// const axios = require("axios");
// const express = require("express");
// const router = express.Router();

// router.post("/github", async (req, res) => {
//     console.log("Webhook hit!");

//     try {
//         const event = req.headers["x-github-event"];

//         console.log("Event:", event);
//         console.log("Action:", req.body.action);

//         if (
//             event === "pull_request" &&
//             req.body.action === "opened"
//         ) {
//             const pr = req.body.pull_request;

//             console.log("PR Title:", pr.title);

//             const filesUrl = pr.url + "/files";

//             console.log("Fetching:", filesUrl);

//             const response = await axios.get(filesUrl, {
//                 headers: {
//                     Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
//                     Accept: "application/vnd.github+json",
//                 },
//             });

            

//             console.log(
//                 JSON.stringify(response.data, null, 2)
//             );
//         }

//         res.sendStatus(200);
//     } catch (error) {
//         console.error(
//             error.response?.data || error.message
//         );
//         res.sendStatus(500);
//     }
// });

// module.exports = router;



const axios = require("axios");
const express = require("express");
const { runGeminiReview } = require("../utils/geminiReview");

const router = express.Router();

// File extensions worth reviewing (skip binaries, lock files, etc.)
const REVIEWABLE_EXTENSIONS = [
  ".js", ".jsx", ".ts", ".tsx",
  ".py", ".java", ".c", ".cpp", ".cs",
  ".go", ".rb", ".php", ".swift", ".kt",
  ".rs", ".html", ".css", ".vue", ".svelte",
];

function isReviewable(filename) {
  return REVIEWABLE_EXTENSIONS.some((ext) => filename.endsWith(ext));
}

async function postPRComment(owner, repo, prNumber, body) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`;

  await axios.post(
    url,
    { body },
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
}

router.post("/github", async (req, res) => {
  console.log("Webhook hit!");

  // Respond to GitHub immediately — webhooks expect a fast 200
  res.sendStatus(200);

  try {
    const event = req.headers["x-github-event"];
    console.log("Event:", event, "| Action:", req.body.action);

    if (event !== "pull_request" || req.body.action !== "opened") {
      return;
    }

    const pr = req.body.pull_request;
    const repo_data = req.body.repository;
    const owner = repo_data.owner.login;
    const repo = repo_data.name;
    const prNumber = pr.number;

    console.log(`PR #${prNumber} opened in ${owner}/${repo}: "${pr.title}"`);

    // 1. Fetch list of changed files in the PR
    const filesUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`;
    const filesResponse = await axios.get(filesUrl, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });

    const allFiles = filesResponse.data;
    const filesToReview = allFiles.filter(
      (f) => f.status !== "removed" && isReviewable(f.filename)
    );

    console.log(`${allFiles.length} files changed, ${filesToReview.length} reviewable`);

    if (filesToReview.length === 0) {
      await postPRComment(
        owner, repo, prNumber,
        "🤖 **AI Code Reviewer**\n\nNo reviewable source files found in this PR (only config/binary/removed files)."
      );
      return;
    }

    // 2. Post an initial "reviewing..." comment so the author knows it's working
    await postPRComment(
      owner, repo, prNumber,
      `🤖 **AI Code Reviewer**\n\nReviewing ${filesToReview.length} file(s)... ⏳`
    );

    // 3. For each file, fetch its content and run Gemini review
    const reviews = [];

    for (const file of filesToReview) {
      try {
        console.log(`Reviewing: ${file.filename}`);

        const contentResponse = await axios.get(file.raw_url, {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          },
        });

        const code = contentResponse.data;
        const review = await runGeminiReview(
          typeof code === "string" ? code : JSON.stringify(code, null, 2),
          file.filename
        );

        reviews.push({ filename: file.filename, review });
      } catch (err) {
        console.error(`Failed to review ${file.filename}:`, err.message);
        reviews.push({
          filename: file.filename,
          review: `_Could not retrieve or review this file: ${err.message}_`,
        });
      }
    }

    // 4. Build and post the final combined review comment
    const commentParts = [
      "🤖 **AI Code Review**\n",
      `Reviewed **${reviews.length}** file(s) in this PR.\n`,
      "---",
    ];

    for (const { filename, review } of reviews) {
      commentParts.push(`\n### 📄 \`${filename}\`\n`);
      commentParts.push(review);
      commentParts.push("\n---");
    }

    await postPRComment(owner, repo, prNumber, commentParts.join("\n"));

    console.log(`Done — posted review for PR #${prNumber}`);
  } catch (error) {
    console.error("Webhook handler error:", error.response?.data || error.message);
  }
});

module.exports = router;