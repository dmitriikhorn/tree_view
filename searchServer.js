// sudo docker run -d -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" elasticsearch:9.2.0

import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { Client } from "@elastic/elasticsearch";

const port = 3000;
const app = express();
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
        body.push({ index: { _index: "elements", _id: row.id } });
        body.push({ name: row.name, parent_id: row.parent_id, path: fullPath });
    }

    await es.bulk({ refresh: true, body });
    console.log(`Indexed ${rows.length} elements`);
}

// await syncToElasticsearch();


app.get("/search", async (req, res) => {
    const query = req.query.q || "";
    try {
        const result = await es.search({
            index: "elements",
            query: {
                match: { name: query }
            },
            size: 50
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

// Serve frontend
app.use(express.static("public"));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
