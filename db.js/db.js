const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads", { recursive: true });
if (!fs.existsSync("./public/img")) fs.mkdirSync("./public/img", { recursive: true });

const db = new sqlite3.Database("./database.db");

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        email TEXT UNIQUE,
        senha TEXT
    )`);
    db.run(`INSERT OR IGNORE INTO usuarios(id, nome, email, senha)
            VALUES(1,'Admin','admin@athia.com','123')`);

    db.run(`CREATE TABLE IF NOT EXISTS clientes(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS filiais(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        cliente_id INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS equipamentos(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        modelo TEXT,
        marca TEXT,
        tipo TEXT,
        potencia TEXT,
        ultima TEXT,
        proxima TEXT,
        responsavel TEXT,
        executou TEXT,
        foto TEXT,
        filial_id INTEGER
    )`);
});

module.exports = db;