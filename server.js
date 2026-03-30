const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "restaurant_system"
};

let pool;

async function ensureDatabase() {
    const bootstrap = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password
    });

    await bootstrap.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`
    );
    await bootstrap.end();
}

async function ensureTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS app_state (
            id INT PRIMARY KEY AUTO_INCREMENT,
            state_key VARCHAR(50) UNIQUE NOT NULL,
            state_value LONGTEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
}

function safeJsonParse(value, fallback = null) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname)));

app.get("/api/health", async (_req, res) => {
    try {
        const [rows] = await pool.query("SELECT NOW() AS now_time");
        res.json({
            success: true,
            database: dbConfig.database,
            now: rows[0]?.now_time || null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post("/api/state/sync", async (req, res) => {
    try {
        const payload = req.body;
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            return res.status(400).json({
                success: false,
                message: "Invalid JSON payload"
            });
        }

        const stmt = `
            INSERT INTO app_state (state_key, state_value)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
                state_value = VALUES(state_value),
                updated_at = CURRENT_TIMESTAMP
        `;

        const savedKeys = [];
        for (const key of ["menus", "orders", "payments", "reviews", "cooks", "session"]) {
            if (!(key in payload)) continue;
            await pool.query(stmt, [key, JSON.stringify(payload[key])]);
            savedKeys.push(key);
        }

        res.json({
            success: true,
            saved_keys: savedKeys,
            saved_at: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.get("/api/state", async (_req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT state_key, state_value, updated_at FROM app_state ORDER BY state_key ASC"
        );

        const data = {};
        for (const row of rows) {
            data[row.state_key] = {
                value: safeJsonParse(row.state_value, row.state_value),
                updated_at: row.updated_at
            };
        }

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html"));
});

async function start() {
    await ensureDatabase();
    pool = mysql.createPool({
        ...dbConfig,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    await ensureTables();

    app.listen(PORT, () => {
        console.log(`Chill n Fill server running at http://localhost:${PORT}`);
        console.log(`MySQL: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    });
}

start().catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
});
