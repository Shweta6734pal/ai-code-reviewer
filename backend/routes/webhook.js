const axios = require("axios");
const express = require("express");
const router = express.Router();

router.post("/github", async (req, res) => {
    console.log("Webhook hit!");

    try {
        const event = req.headers["x-github-event"];

        console.log("Event:", event);
        console.log("Action:", req.body.action);

        if (
            event === "pull_request" &&
            req.body.action === "opened"
        ) {
            const pr = req.body.pull_request;

            console.log("PR Title:", pr.title);

            const filesUrl = pr.url + "/files";

            console.log("Fetching:", filesUrl);

            const response = await axios.get(filesUrl, {
                headers: {
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                    Accept: "application/vnd.github+json",
                },
            });

            console.log(
                JSON.stringify(response.data, null, 2)
            );
        }

        res.sendStatus(200);
    } catch (error) {
        console.error(
            error.response?.data || error.message
        );
        res.sendStatus(500);
    }
});

module.exports = router;