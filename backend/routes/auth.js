const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

const router = express.Router();

router.get("/github", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: "user",
  });

  const redirectUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  res.redirect(redirectUrl);
});


router.get("/github/callback", async (req,res)=>{

try{

const code=req.query.code;

const tokenResponse=await axios.post(
"https://github.com/login/oauth/access_token",

{
client_id:process.env.GITHUB_CLIENT_ID,
client_secret:process.env.GITHUB_CLIENT_SECRET,
code
},

{
headers:{
Accept:"application/json"
}
}

);

const accessToken=tokenResponse.data.access_token;


const userResponse=await axios.get(
"https://api.github.com/user",

{
headers:{
Authorization:`Bearer ${accessToken}`
}
}
);

const {id,login}=userResponse.data;


let user=await prisma.user.findUnique({

where:{
githubId:String(id)
}

});


if(!user){

user=await prisma.user.create({

data:{
githubId:String(id),
username:login
}

});

}


const token=jwt.sign(

{userId:user.id},
process.env.JWT_SECRET,
{expiresIn:"7d"}

);


res.redirect(
  `${process.env.FRONTEND_URL}/dashboard?token=${token}`
);
}

catch (error) {
  console.error("GitHub OAuth error:", error.response?.data || error.message);

  res.status(500).json({
    message: "Authentication failed",
  });
}

});

module.exports=router;