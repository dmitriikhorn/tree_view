import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";
import {Client} from "@elastic/elasticsearch";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 8003;
const es = new Client({ node: "http://localhost:9200" });
const db = await open({
    filename: "sros_20_10.sqlite3",
    driver: sqlite3.Database
});

(async () => {

    app.use("/ytv", express.static(path.join(__dirname, "public")));

    app.get("/ytv/node/:id", async (req, res) => {
        const id = req.params.id === "root" ? null : req.params.id;
        const rows = await db.all(
            "SELECT id, name, parent_id, type FROM yang_models WHERE parent_id IS ? LIMIT 1000",
            [id]
        );
        res.json(rows);
    });

    app.get("/ytv/search", async (req, res) => {
        const query = req.query.q || "";
        try {
            const result = await es.search({
                index: "elements",
                query: {
                    match: { name: query }
                },
                size: 100
            });

            const hits = result.hits.hits.map(hit => ({
                id: hit._id,
                path: hit._source.path
            }));

            res.json(hits);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Search failed" });
        }
    });
    app.listen(PORT);
})();
