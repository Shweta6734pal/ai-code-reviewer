
const express=require("express");
const cors=require("cors");
const prisma = require("./config/prisma");
const authMiddleware = require("./middleware/authmiddleware");
const webhookRoutes = require("./routes/webhook");
console.log("Token loaded:", !!process.env.GITHUB_TOKEN);

require("dotenv").config();

const app=express();

app.use(cors());
app.use(express.json());


const authRoutes=require("./routes/auth");
const reviewRoutes = require("./routes/review");

app.use("/auth",authRoutes);
app.use("/review", reviewRoutes);
app.use("/webhook", webhookRoutes);

app.get("/",async(req,res)=>{
     const users = await prisma.user.findMany();
  res.json(users);

});

const PORT=process.env.PORT || 5000;
app.get("/me", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
  });

  res.json(user);
});

app.listen(PORT,()=>{
    console.log(`Server running on ${PORT}`);
});
