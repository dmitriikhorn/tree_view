import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";
import {Client} from "@elastic/elasticsearch";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;

const es = new Client({ node: "http://localhost:9200" });
const db = await open({
    filename: "db.sqlite3",
    driver: sqlite3.Database
});

async function getPath(db, row) {
    let path = [row.name];
    let currentParent = row.parent_id;

    while (currentParent !== null) {
        const parent = await db.get("SELECT id, name, parent_id FROM yang_models WHERE id = ?", currentParent);
        if (!parent) {
            console.warn(`Missing parent for id ${row.id}: ${currentParent}`);
            break
        };
        path.unshift(parent.name);
        currentParent = parent.parent_id;
    }

    return path.join("/");
}

async function syncToElasticsearch() {
    const rows = await db.all("SELECT id, name, parent_id FROM yang_models");
    const body = [];

    for (const row of rows) {
        const fullPath = await getPath(db, row);

        // Skipping "groups" container
        const first = fullPath.split("/")[0];
        if (first === "groups") continue;

        body.push({ index: { _index: "elements", _id: row.id } });
        body.push({ name: row.name, parent_id: row.parent_id, path: fullPath });
    }

    await es.bulk({ refresh: true, body });
    console.log(`Indexed ${rows.length} elements`);
}

// await syncToElasticsearch();

(async () => {

    app.use(express.static(path.join(__dirname, "public")));

    app.get("/node/:id", async (req, res) => {
        const id = req.params.id === "root" ? null : req.params.id;
        const rows = await db.all(
            "SELECT id, name, parent_id, type FROM yang_models WHERE parent_id IS ? LIMIT 1000",
            [id]
        );
        res.json(rows);
    });

    app.get("/search", async (req, res) => {
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

    app.listen(PORT, () =>
        console.log(`Server running at http://localhost:${PORT}`)
    );
})();
