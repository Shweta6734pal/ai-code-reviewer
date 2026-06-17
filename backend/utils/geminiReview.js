const { GoogleGenerativeAI } = require("@google/generative-ai");

async function runGeminiReview(code, filePath = "") {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  });

  const prompt = `
You are a senior software engineer doing a pull request code review.

File: ${filePath}

Review this code and provide:
1. Bugs
2. Performance issues
3. Security problems
4. Clean code improvements
5. Final rating out of 10

CODE:
\`\`\`
${code}
\`\`\`
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = { runGeminiReview };