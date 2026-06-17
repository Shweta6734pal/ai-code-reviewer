const express = require("express");
const axios = require("axios");
const authMiddleware = require("../middleware/authmiddleware");
const { runGeminiReview } = require("../utils/geminiReview");
const prisma = require("../config/prisma");

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { repoUrl, filePath } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Gemini API key is not configured",
      });
    }

    if (!repoUrl || !filePath) {
      return res.status(400).json({
        success: false,
        message: "Repository URL and file path are required",
      });
    }

    const url = new URL(repoUrl);

    if (url.hostname !== "github.com") {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid GitHub repository URL",
      });
    }

    const [, owner, repo] = url.pathname.split("/");

    if (!owner || !repo) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid GitHub repository URL",
      });
    }

    const cleanFilePath = filePath.replace(/^\/+/, "");

    // Try main first, fall back to master
    let code;
    try {
      const response = await axios.get(
        `https://raw.githubusercontent.com/${owner}/${repo}/main/${cleanFilePath}`
      );
      code = response.data;
    } catch {
      const response = await axios.get(
        `https://raw.githubusercontent.com/${owner}/${repo}/master/${cleanFilePath}`
      );
      code = response.data;
    }

    const review = await runGeminiReview(
      typeof code === "string" ? code : JSON.stringify(code, null, 2),
      cleanFilePath
    );

    // Save to database
    await prisma.review.create({
      data: {
        userId: req.user.userId,
        repoUrl,
        filePath: cleanFilePath,
        review,
      },
    });

    res.json({ success: true, review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Review failed" });
  }
});

// Get all reviews for the logged-in user
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Could not fetch reviews" });
  }
});

module.exports = router;