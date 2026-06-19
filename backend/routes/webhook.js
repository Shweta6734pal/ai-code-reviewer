const axios = require("axios");
const express = require("express");
const { runGeminiReview } = require("../utils/geminiReview");
const prisma = require("../config/prisma");
const { getInstallationToken } = require("../config/githubApp");

const router = express.Router();

const REVIEWABLE_EXTENSIONS = [
  ".js", ".jsx", ".ts", ".tsx",
  ".py", ".java", ".c", ".cpp", ".cs",
  ".go", ".rb", ".php", ".swift", ".kt",
  ".rs", ".html", ".css", ".vue", ".svelte",
];

console.log("Webhook router loaded");

function isReviewable(filename) {
  return REVIEWABLE_EXTENSIONS.some((ext) => filename.endsWith(ext));
}

async function postPRComment(owner, repo, prNumber, body, installationId) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`;
  const token = await getInstallationToken(installationId);

  await axios.post(
    url,
    { body },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
}

router.post("/github", async (req, res) => {
  const deliveryId = req.headers["x-github-delivery"];
  const event = req.headers["x-github-event"];
  const action = req.body.action;

  console.log("================================");
  console.log("Webhook hit!");
  console.log("Delivery ID:", deliveryId);
  console.log("Event:", event);
  console.log("Action:", action);
  console.log("PID:", process.pid);

  res.sendStatus(200);

  if (!deliveryId) {
    console.warn("No X-GitHub-Delivery header present - skipping dedupe, processing anyway.");
  } else {
    try {
      await prisma.webhookDelivery.create({
        data: { deliveryId, event: event || "unknown", action },
      });
    } catch (err) {
      if (err.code === "P2002") {
        console.log(`Duplicate delivery ${deliveryId} ignored.`);
        return;
      }

      console.error("Idempotency check failed unexpectedly:", err.message);
    }
  }

  try {
    console.log("Event:", event, "| Action:", action);

    if (event !== "pull_request" || action !== "opened") {
      return;
    }

    const installationId = req.body.installation?.id;

    if (!installationId) {
      console.error("Missing GitHub App installation ID in webhook payload.");
      return;
    }

    const pr = req.body.pull_request;
    const repoData = req.body.repository;
    const owner = repoData.owner.login;
    const repo = repoData.name;
    const prNumber = pr.number;

    console.log(`PR #${prNumber} opened in ${owner}/${repo}: "${pr.title}"`);

    const installationToken = await getInstallationToken(installationId);

    const filesUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`;
    const filesResponse = await axios.get(filesUrl, {
      headers: {
        Authorization: `Bearer ${installationToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    const allFiles = filesResponse.data;
    const filesToReview = allFiles.filter(
      (file) => file.status !== "removed" && isReviewable(file.filename)
    );

    console.log(`${allFiles.length} files changed, ${filesToReview.length} reviewable`);

    if (filesToReview.length === 0) {
      await postPRComment(
        owner,
        repo,
        prNumber,
        "AI Code Reviewer\n\nNo reviewable source files found in this PR.",
        installationId
      );
      return;
    }

    await postPRComment(
      owner,
      repo,
      prNumber,
      `AI Code Reviewer\n\nReviewing ${filesToReview.length} file(s)...`,
      installationId
    );

    const reviews = [];

    for (const file of filesToReview) {
      try {
        console.log(`Reviewing: ${file.filename}`);

        const contentResponse = await axios.get(file.raw_url, {
          headers: {
            Authorization: `Bearer ${installationToken}`,
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

    const commentParts = [
      "AI Code Review\n",
      `Reviewed **${reviews.length}** file(s) in this PR.\n`,
      "---",
    ];

    for (const { filename, review } of reviews) {
      commentParts.push(`\n### \`${filename}\`\n`);
      commentParts.push(review);
      commentParts.push("\n---");
    }

    await postPRComment(
      owner,
      repo,
      prNumber,
      commentParts.join("\n"),
      installationId
    );

    console.log(`Done - posted review for PR #${prNumber}`);
  } catch (error) {
    console.error("Webhook handler error:", error.response?.data || error.message);
  }
});

module.exports = router;