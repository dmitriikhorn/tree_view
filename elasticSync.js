import {open} from "sqlite";
import sqlite3 from "sqlite3";
import {Client} from "@elastic/elasticsearch";

const db = await open({
    filename: "sros_20_10.sqlite3",
    driver: sqlite3.Database
});
const es = new Client({ node: "http://localhost:9200" });

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


await syncToElasticsearch();