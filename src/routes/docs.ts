import express from "express";

const router = express.Router();

router.get("/get_video_link", async (req, res) => {
    try {
        if (!req.query.url) return res.status(400).send("400 Bad Request: no url provided!");
        const url: any = req.query.url;
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(
            url,
            { method: "GET"}
        );
        if (response.ok) {
            const text: string = await response.text();
            const match = text.match(/rawPath:.*/);
            if (!match) throw(Error("cannot match pattern!"));
            let link: string = match[0].slice(10, -2);
            link = link.replace(/\\u002D/g, "-");
            return res.status(200).send(link);
        }
        else return res.status(500).send("500 Internal Server Error: fetch failed!");
    } catch (err) {
        return res.status(500).send("500 Internal Server Error: " + err);
    }
})

export default router;
