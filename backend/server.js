require("dotenv").config(); // ✅ moved to top so env vars load before anything else

const express = require("express");
const cors = require("cors");
const prisma = require("./config/prisma");
const authMiddleware = require("./middleware/authmiddleware");
const authRoutes = require("./routes/auth");
const reviewRoutes = require("./routes/review");
const webhookRoutes = require("./routes/webhook");
const rateLimit = require("express-rate-limit");


const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                 // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many review requests. Please try again later."
  }
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
console.log("GitHub App ID loaded:", !!process.env.GITHUB_APP_ID);
console.log("GitHub App installation ID loaded:", !!process.env.GITHUB_APP_INSTALLATION_ID);

const app = express();

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

app.use(globalLimiter);
app.use("/review", reviewLimiter, reviewRoutes);
app.use("/auth", authRoutes);
app.use("/webhook", webhookRoutes);


app.get("/", (req, res) => {
  res.json({
    message: "AI Code Reviewer API running"
  });
});

app.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    res.json({ user });
  } catch (err) {
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on ${PORT}`);
// });
module.exports = app;