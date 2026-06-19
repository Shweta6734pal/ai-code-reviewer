const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const tokenCache = new Map();

function getPrivateKey() {
  if (process.env.GITHUB_APP_PRIVATE_KEY) {
    return process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n");
  }

  const keyPath = path.resolve(process.cwd(), process.env.GITHUB_APP_PRIVATE_KEY_PATH);
  return fs.readFileSync(keyPath, "utf8");
}

function generateAppJWT() {
  const privateKey = getPrivateKey();
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iat: now - 60,
    exp: now + 9 * 60,
    iss: process.env.GITHUB_APP_ID,
  };

  return jwt.sign(payload, privateKey, { algorithm: "RS256" });
}

async function fetchInstallationToken(installationId) {
  if (!installationId) {
    throw new Error("GitHub App installation ID is missing");
  }

  const appJWT = generateAppJWT();

  const response = await axios.post(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {},
    {
      headers: {
        Authorization: `Bearer ${appJWT}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  console.log("Installation ID:", installationId);
  console.log("Installation token permissions:", JSON.stringify(response.data.permissions));
  console.log("Installation token repositories selected:", response.data.repository_selection);

  return {
    token: response.data.token,
    expiresAt: new Date(response.data.expires_at).getTime(),
  };
}

async function getInstallationToken(installationId) {
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
  const cached = tokenCache.get(String(installationId));

  if (cached && cached.expiresAt > fiveMinutesFromNow) {
    return cached.token;
  }

  const { token, expiresAt } = await fetchInstallationToken(installationId);

  tokenCache.set(String(installationId), {
    token,
    expiresAt,
  });

  return token;
}

module.exports = { getInstallationToken };