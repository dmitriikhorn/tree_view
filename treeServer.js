import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;

let db;

(async () => {
    db = await open({
        filename: path.join(__dirname, "db.sqlite3"),
        driver: sqlite3.Database,
    });

    app.use(express.static(path.join(__dirname, "public")));

    app.get("/node/:id", async (req, res) => {
        const id = req.params.id === "root" ? null : req.params.id;
        const rows = await db.all(
            "SELECT id, name, parent_id FROM yang_models WHERE parent_id IS ? LIMIT 1000",
            [id]
        );
        res.json(rows);
    });

    app.listen(PORT, () =>
        console.log(`Server running at http://localhost:${PORT}`)
    );
})();
