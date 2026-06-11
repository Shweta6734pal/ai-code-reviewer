const express = require("express");
const axios = require("axios");
const authMiddleware = require("../middleware/authmiddleware");
const { GoogleGenerativeAI } = require("@google/generative-ai");

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
    const githubUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${cleanFilePath}`;
    const response = await axios.get(githubUrl);
    const code = response.data;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    });

    const prompt = `
You are a senior software engineer.

Review this code and provide:

1. Bugs
2. Performance issues
3. Security problems
4. Clean code improvements
5. Final rating out of 10

CODE:
${code}
`;

    const result = await model.generateContent(prompt);
    const review = result.response.text();

    res.json({
      success: true,
      review,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Review failed",
    });
  }
});

module.exports = router;
