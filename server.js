const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const sqlite3 = require("sqlite3");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 7500;

// ===================
// PASTAS
// ===================
if (!fs.existsSync("./uploads"))
    fs.mkdirSync("./uploads", { recursive: true });

if (!fs.existsSync("./public/img"))
    fs.mkdirSync("./public/img", { recursive: true });

// ===================
// BANCO DE DADOS
// ===================
const db = new sqlite3.Database("./database.db");

db.serialize(() => {

    // ===== USUÁRIOS =====
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            senha TEXT
        )
    `);

    db.run(`
        INSERT OR IGNORE INTO usuarios(id,email,senha)
        VALUES(1,'admin@email.com','123')
    `);

    // ===== CLIENTES =====
    db.run(`
        CREATE TABLE IF NOT EXISTS clientes(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT
        )
    `);

    // ===== FILIAIS =====
    db.run(`
        CREATE TABLE IF NOT EXISTS filiais(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            cliente_id INTEGER
        )
    `);

    db.run(`CREATE TABLE IF NOT EXISTS equipamentos(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ambiente TEXT,
    tipo TEXT,
    marca TEXT,
    idade TEXT,
    potencia TEXT,
    ultima TEXT,
    proxima TEXT,
    foto TEXT,
    filial_id INTEGER
)`);

// Garantir coluna idade
db.all("PRAGMA table_info(equipamentos);", [], (err, cols) => {
    if (err) return console.error(err);

    const colNames = cols.map(c => c.name);

    if (!colNames.includes("idade")) {
        db.run("ALTER TABLE equipamentos ADD COLUMN idade TEXT");
        console.log("Coluna idade adicionada!");
    }

    if (!colNames.includes("responsavel")) {
        db.run("ALTER TABLE equipamentos ADD COLUMN responsavel TEXT");
        console.log("Coluna responsavel adicionada!");
    }
});

    // ===== CHAMADOS =====
    db.run(`
        CREATE TABLE IF NOT EXISTS chamados(
            id INTEGER PRIMARY KEY AUTOINCREMENT
        )
    `);

    db.all("PRAGMA table_info(chamados);", [], (err, cols) => {
        if (err) return console.log(err);

        const nomes = cols.map(c => c.name);

        if (!nomes.includes("filial_id"))
            db.run("ALTER TABLE chamados ADD COLUMN filial_id INTEGER");

        if (!nomes.includes("equipamento_id"))
            db.run("ALTER TABLE chamados ADD COLUMN equipamento_id INTEGER");

        if (!nomes.includes("ambiente"))
            db.run("ALTER TABLE chamados ADD COLUMN ambiente TEXT");

        if (!nomes.includes("tipo_defeito"))
            db.run("ALTER TABLE chamados ADD COLUMN tipo_defeito TEXT");

        if (!nomes.includes("data_hora_chamado"))
            db.run("ALTER TABLE chamados ADD COLUMN data_hora_chamado TEXT");

        if (!nomes.includes("descricao"))
            db.run("ALTER TABLE chamados ADD COLUMN descricao TEXT");

        if (!nomes.includes("data_hora_resolucao"))
            db.run("ALTER TABLE chamados ADD COLUMN data_hora_resolucao TEXT");
    });

    // ===== HISTÓRICO DE MANUTENÇÕES =====
    db.run(`
        CREATE TABLE IF NOT EXISTS manutencoes(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipamento_id INTEGER,
            data TEXT,
            tipo TEXT,
            descricao TEXT,
            responsavel TEXT
        )
    `);
});

// ===================
// MIDDLEWARE
// ===================
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static("public")); 

app.use("/uploads", express.static("uploads"));
app.use("/img", express.static("public/img"));

app.use(session({
    secret: "segredo",
    resave: false,
    saveUninitialized: false
}));

// ===================
// UPLOAD DE FOTOS
// ===================
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "_" + file.originalname);
    }
});

const upload = multer({ storage });

// ===================
// AUTENTICAÇÃO
// ===================
function auth(req, res, next) {
    if (req.session.logado) {
        next();
    } else {
        res.redirect("/login");
    }
}

// ===================
// LAYOUT
// ===================
function layout(titulo, conteudo) {
    return `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <title>${titulo}</title>

        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

        <style>
            body{
                background:
                linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)),
                url('/img/WhatsApp Image 2026-05-11 at 10.50.42.jpeg');
                background-size:cover;
                color:white;
            }

            .navbar{
                background:rgba(255,255,255,0.9);
            }

            .nav-link,
            .dropdown-item{
                color:black !important;
            }

            .dropdown-menu{
                background:white;
            }

            .card{
                background:white;
                color:black;
                border-radius:15px;
                padding:20px;
                box-shadow:0 10px 30px rgba(0,0,0,0.3);
                margin-bottom:20px;
            }

            .logo{
                height:40px;
            }

            table{
                color:black;
            }

            img.preview{
                max-width:150px;
                margin-top:10px;
                border-radius:5px;
            }
        </style>
    </head>

    <body>

        <nav class="navbar navbar-expand-lg p-3 d-flex justify-content-between">
            

            <div class="collapse navbar-collapse">

            ${
                titulo !== "Login" && titulo !== "Cadastrar"
                ? `
                <ul class="navbar-nav me-auto">

                    <li class="nav-item">
                        <a class="nav-link btn btn-light btn-sm mx-1"
                           href="/dashboard">Dashboard</a>
                    </li>

                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle btn btn-light btn-sm mx-1"
                           data-bs-toggle="dropdown">
                           Clientes
                        </a>

                        <ul class="dropdown-menu">
                            <li>
                                <a class="dropdown-item"
                                   href="/clientes">
                                   Todos os Clientes
                                </a>
                            </li>

                            <li>
                                <a class="dropdown-item"
                                   href="/clientes/novo">
                                   Novo Cliente
                                </a>
                            </li>
                        </ul>
                    </li>

                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle btn btn-light btn-sm mx-1"
                           data-bs-toggle="dropdown">
                           Filiais
                        </a>

                        <ul class="dropdown-menu">
                            <li>
                                <a class="dropdown-item"
                                   href="/filiais">
                                   Todas as Filiais
                                </a>
                            </li>

                            <li>
                                <a class="dropdown-item"
                                   href="/filiais/novo">
                                   Nova Filial
                                </a>
                            </li>
                        </ul>
                    </li>

                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle btn btn-light btn-sm mx-1"
                           data-bs-toggle="dropdown">
                           Equipamentos
                        </a>

                        <ul class="dropdown-menu">
                            <li>
                                <a class="dropdown-item"
                                   href="/equipamentos">
                                   Todos os Equipamentos
                                </a>
                            </li>

                            <li>
                                <a class="dropdown-item"
                                   href="/equipamentos/novo">
                                   Novo Equipamento
                                </a>
                            </li>

                            <li>
                                <a class="dropdown-item"
                                   href="/relatorio">
                                   Relatório
                                </a>
                            </li>
                        </ul>
                    </li>

                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle btn btn-info btn-sm mx-1"
                           data-bs-toggle="dropdown">
                           Chamados
                        </a>

                        <ul class="dropdown-menu">
                            <li>
                                <a class="dropdown-item"
                                   href="/chamados">
                                   Abrir Chamados
                                </a>
                            </li>

                            <li>
                                <a class="dropdown-item"
                                   href="/relatorio-chamados">
                                   Relatório de Chamados
                                </a>
                            </li>
                        </ul>
                    </li>

                </ul>

                <a href="/logout" class="btn btn-danger btn-sm">
                    Sair
                </a>
                `
                : ""
            }

            </div>
        </nav>

        <div class="container mt-4">
            ${conteudo}
        </div>

        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    </body>
    </html>
    `;
}

// ===================
// LOGIN
// ===================
app.get("/", (req, res) => {
    res.send(layout("Página Inicial", `
        <h1 style="text-align:center;margin-top:50px;">
            Sistema HVAC Athia
        </h1>

        <div style="text-align:center;">
            <a href="/login" class="btn btn-primary">
                Entrar
            </a>

            <a href="/cadastrar" class="btn btn-success">
                Cadastrar
            </a>
        </div>
    `));
});

app.get("/login", (req, res) => {
    res.send(layout("Login", `
        <div class="card">
            <h3>Login</h3>

            <form method="POST">
                <input
                    name="email"
                    class="form-control mb-2"
                    placeholder="Email"
                    required>

                <input
                    type="password"
                    name="senha"
                    class="form-control mb-2"
                    placeholder="Senha"
                    required>

                <button class="btn btn-primary">
                    Entrar
                </button>
            </form>
        </div>
    `));
});

app.post("/login", (req, res) => {
    const { email, senha } = req.body;

    db.get(
        "SELECT * FROM usuarios WHERE email=? AND senha=?",
        [email, senha],
        (err, row) => {
            if (row) {
                req.session.logado = true;
                res.redirect("/dashboard");
            } else {
                res.send("Login inválido");
            }
        }
    );
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});
//----------- DASHBOARD----------//
app.get("/dashboard", auth, (req,res)=>{

    db.all("SELECT * FROM clientes", [], (err, clientes)=>{
        db.all("SELECT * FROM filiais", [], (err2, filiais)=>{
            db.all("SELECT * FROM equipamentos", [], (err3, equipamentos)=>{

                const hoje = new Date();

                let atrasados = 0;
                let vencendo = 0;

                equipamentos.forEach(eq => {
                    if(eq.proxima){
                        const dataProxima = new Date(eq.proxima);
                        const diffDias = Math.ceil(
                            (dataProxima - hoje) / (1000*60*60*24)
                        );

                        if(diffDias < 0){
                            atrasados++;
                        } else if(diffDias <= 30){
                            vencendo++;
                        }
                    }
                });

                res.send(layout("Dashboard", `
                    <style>
                        .stats-container{
                            display:flex;
                            gap:20px;
                            flex-wrap:wrap;
                            justify-content:center;
                        }

                        .card-box{
                            background:white;
                            color:black;
                            padding:20px;
                            border-radius:12px;
                            width:220px;
                            text-align:center;
                            box-shadow:0 4px 10px rgba(0,0,0,0.2);
                        }

                        .numero{
                            font-size:32px;
                            font-weight:bold;
                        }

                        .alerta-vermelho{
                            background:#ffdddd;
                            border-left:6px solid red;
                        }

                        .alerta-amarelo{
                            background:#fff5cc;
                            border-left:6px solid orange;
                        }
                    </style>

                    <h2 class="text-center mb-4">
                        Dashboard
                    </h2>

                    <div class="stats-container">

                        <div class="card-box">
                            <h4>Clientes</h4>
                            <div class="numero">${clientes.length}</div>
                        </div>

                        <div class="card-box">
                            <h4>Filiais</h4>
                            <div class="numero">${filiais.length}</div>
                        </div>

                        <div class="card-box">
                            <h4>Equipamentos</h4>
                            <div class="numero">${equipamentos.length}</div>
                        </div>

                        <div class="card-box alerta-amarelo">
                            <h4>Vencendo</h4>
                            <div class="numero">${vencendo}</div>
                        </div>

                        <div class="card-box alerta-vermelho">
                            <h4>Atrasados</h4>
                            <div class="numero">${atrasados}</div>
                        </div>

                    </div>

                    <div class="text-center mt-4">
                        <a href="/relatorio" class="btn btn-primary">
                            Ver Relatório
                        </a>
                    </div>
                `));

            });
        });
    });

});


// ===================
// CLIENTES CRUD (atualizado)
// ===================
app.get("/clientes", auth, (req,res)=>{
    res.redirect("/clientes/novo");
});

app.get("/clientes/novo", auth, (req,res)=>{
    res.send(layout("Novo Cliente",`
        <div class="card">
            <h3>Novo Cliente</h3>
            <form id="clienteForm">
                <input name="nome" class="form-control mb-2" placeholder="Nome" required>
                <button class="btn btn-success">Salvar</button>
            </form>
        </div>

        <div class="card mt-4">
            <h3>Clientes Cadastrados</h3>
            <table class="table table-bordered" id="clientesTable">
                <tr><th>ID</th><th>Nome</th><th>Ações</th></tr>
            </table>
        </div>

        <script>
        async function carregarClientes() {
            const res = await fetch('/clientes/lista');
            const html = await res.text();
            document.getElementById('clientesTable').innerHTML = html;
        }

        document.getElementById('clienteForm').addEventListener('submit', async e => {
            e.preventDefault();
            const data = new URLSearchParams(new FormData(e.target));
            const res = await fetch('/clientes/novo', { method: 'POST', body: data });
            if(res.ok) {
                e.target.reset();
                carregarClientes();
            }
        });

        window.onload = carregarClientes;
        </script>
    `));
});

// Inserir cliente via POST
app.post("/clientes/novo", auth, (req,res)=>{
    const { nome } = req.body;
    db.run("INSERT INTO clientes(nome) VALUES(?)",[nome],()=>res.sendStatus(200));
});

// Listar clientes para a tabela dinâmica
app.get("/clientes/lista", auth, (req,res)=>{
    db.all("SELECT * FROM clientes", [], (err, rows)=>{
        const html = rows.map(r=>`
            <tr>
                <td>${r.id}</td>
                <td>${r.nome}</td>
                <td>
                    <a href="/clientes/editar/${r.id}" class="btn btn-sm btn-primary">Editar</a>
                    <a href="/clientes/excluir/${r.id}" class="btn btn-sm btn-danger">Excluir</a>
                </td>
            </tr>`).join('');
        res.send(html);
    });
});

app.get("/clientes/editar/:id", auth, (req,res)=>{
    db.get("SELECT * FROM clientes WHERE id=?",[req.params.id],(err,row)=>{
        res.send(layout("Editar Cliente",`
            <div class="card">
                <h3>Editar Cliente</h3>
                <form method="POST">
                    <input name="nome" class="form-control mb-2" value="${row.nome}" required>
                    <button class="btn btn-success">Salvar</button>
                </form>
            </div>
        `));
    });
});

app.post("/clientes/editar/:id", auth, (req,res)=>{
    db.run("UPDATE clientes SET nome=? WHERE id=?",[req.body.nome,req.params.id],()=>res.redirect("/clientes/novo"));
});

app.get("/clientes/excluir/:id", auth, (req,res)=>{
    db.run("DELETE FROM clientes WHERE id=?",[req.params.id],()=>res.redirect("/clientes/novo"));
});


// ===================
// RELATÓRIO (sem clientes)
// ===================
app.get("/relatorio", auth, (req, res) => {
    db.all("SELECT * FROM filiais", [], (err, filiais) => {
        res.send(layout("Relatório", `
            <div class="card">
                <h3>Filtrar Relatório</h3>
                <form method="GET" id="filtroForm">
                    <div class="row">
                        <div class="col-md-6">
                            <select name="filial_id" class="form-control mb-2">
                                <option value="">Todas as Filiais</option>
                                ${filiais.map(f => `<option value="${f.id}">${f.nome}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-6">
                            <button class="btn btn-primary mb-2">Filtrar</button>
                            <button type="button" id="imprimirBtn" class="btn btn-warning mb-2">Imprimir</button>
                            
                        </div>
                    </div>
                </form>
                <div id="resultado"></div>
            </div>

            <script>
                const form = document.getElementById('filtroForm');
                const resultado = document.getElementById('resultado');

                async function carregarRelatorio() {
                    const params = new URLSearchParams(new FormData(form));
                    const res = await fetch('/relatorio/dados?' + params.toString());
                    const html = await res.text();
                    resultado.innerHTML = html;
                }

                form.addEventListener('submit', e => { e.preventDefault(); carregarRelatorio(); });
                window.onload = carregarRelatorio;

                document.getElementById('imprimirBtn').addEventListener('click', () => {
                    const conteudo = document.getElementById('resultado').innerHTML;
                    const win = window.open('', '', 'width=800,height=600');
                    win.document.write(conteudo);
                    win.print();
                    win.close();
                });

                
            </script>
        `));
    });
});

// ===================
// RELATÓRIO DE CHAMADOS COM AVISO DE MANUTENÇÃO
// ===================
app.get("/chamados/relatorio", auth, (req, res) => {
    let sql = `
        SELECT ch.*, f.nome as filial_nome, e.ambiente as equipamento_ambiente, e.proxima as proxima_manutencao
        FROM chamados ch
        LEFT JOIN filiais f ON ch.filial_id=f.id
        LEFT JOIN equipamentos e ON ch.equipamento_id=e.id
        ORDER BY ch.data_hora_chamado DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.send("Erro ao gerar relatório de chamados: " + err.message);

        const hoje = new Date();
        let html = `
        <div class="card">
            <h3 class="card-header">Relatório de Chamados</h3>
            <div class="card-body">
            <table class="table table-bordered table-striped">
                <thead>
                    <tr>
                        <th>ID</th><th>Filial</th><th>Equipamento</th><th>Ambiente</th>
                        <th>Tipo de Defeito</th><th>Data/Hora Chamado</th><th>Descrição/Resolução</th>
                        <th>Próxima Manutenção</th><th>Aviso</th>
                    </tr>
                </thead>
                <tbody>
        `;

        rows.forEach(r => {
            let aviso = '';
            if (r.proxima_manutencao) {
                const proxManut = new Date(r.proxima_manutencao);
                const diffTime = proxManut - hoje;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 30 && diffDays >= 0) {
                    aviso = `<span class="badge bg-danger">Vence em ${diffDays} dias!</span>`;
                } else if (diffDays < 0) {
                    aviso = `<span class="badge bg-secondary">Atrasado!</span>`;
                }
            }

            html += `<tr>
                <td>${r.id}</td>
                <td>${r.filial_nome || '-'}</td>
                <td>${r.equipamento_ambiente || '-'}</td>
                <td>${r.ambiente || '-'}</td>
                <td>${r.tipo_defeito || '-'}</td>
                <td>${r.data_hora_chamado || '-'}</td>
                <td>${r.descricao || '-'}</td>
                <td>${r.proxima_manutencao || '-'}</td>
                <td>${aviso}</td>
            </tr>`;
        });

        html += `
                </tbody>
            </table>
            </div>
        </div>
        `;
        res.send(layout("Relatório de Chamados", html));
    });
});



// ===================
// FILIAIS CRUD
// ===================
app.get("/filiais", auth, (req,res)=>{
    db.all("SELECT f.id,f.nome,f.cliente_id,c.nome as cliente_nome FROM filiais f LEFT JOIN clientes c ON f.cliente_id=c.id",[],(err,rows)=>{
        let html = `
        <div class="card">
            <h3>Filiais</h3>
            <a href="/filiais/novo" class="btn btn-success mb-2">Nova Filial</a>
            <table class="table table-bordered">
                <tr><th>ID</th><th>Nome</th><th>Cliente</th><th>Ações</th></tr>
                ${rows.map(r=>`<tr>
                    <td>${r.id}</td>
                    <td>${r.nome}</td>
                    <td>${r.cliente_nome || '-'}</td>
                    <td>
                        <a href="/filiais/editar/${r.id}" class="btn btn-sm btn-primary">Editar</a>
                        <a href="/filiais/excluir/${r.id}" class="btn btn-sm btn-danger">Excluir</a>
                    </td>
                </tr>`).join('')}
            </table>
        </div>`;
        res.send(layout("Filiais",html));
    });
});

app.get("/filiais/novo", auth, (req,res)=>{
    db.all("SELECT * FROM clientes",[],(err,clientes)=>{
        res.send(layout("Nova Filial",`
            <div class="card">
                <h3>Nova Filial</h3>
                <form method="POST">
                    <input name="nome" class="form-control mb-2" placeholder="Nome" required>
                    <select name="cliente_id" class="form-control mb-2" required>
                        ${clientes.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}
                    </select>
                    <button class="btn btn-success">Salvar</button>
                </form>
            </div>
        `));
    });
});

app.post("/filiais/novo", auth, (req,res)=>{
    const { nome, cliente_id } = req.body;
    db.run("INSERT INTO filiais(nome,cliente_id) VALUES(?,?)",[nome,cliente_id],()=>res.redirect("/filiais"));
});

app.get("/filiais/editar/:id", auth, (req,res)=>{
    db.get("SELECT * FROM filiais WHERE id=?",[req.params.id],(err,row)=>{
        db.all("SELECT * FROM clientes",[],(err2,clientes)=>{
            res.send(layout("Editar Filial",`
                <div class="card">
                    <h3>Editar Filial</h3>
                    <form method="POST">
                        <input name="nome" class="form-control mb-2" value="${row.nome}" required>
                        <select name="cliente_id" class="form-control mb-2" required>
                            ${clientes.map(c=>`<option value="${c.id}" ${c.id===row.cliente_id?'selected':''}>${c.nome}</option>`).join('')}
                        </select>
                        <button class="btn btn-success">Salvar</button>
                    </form>
                </div>
            `));
        });
    });
});

app.post("/filiais/editar/:id", auth, (req,res)=>{
    const { nome, cliente_id } = req.body;
    db.run("UPDATE filiais SET nome=?,cliente_id=? WHERE id=?",[nome,cliente_id,req.params.id],()=>res.redirect("/filiais"));
});

app.get("/filiais/excluir/:id", auth, (req,res)=>{
    db.run("DELETE FROM filiais WHERE id=?",[req.params.id],()=>res.redirect("/filiais"));
});

// ===================
// EQUIPAMENTOS CRUD
// ===================

app.get("/equipamentos", auth, (req,res)=>{
    db.all(`
        SELECT e.*, f.nome as filial_nome, c.nome as cliente_nome
        FROM equipamentos e
        LEFT JOIN filiais f ON e.filial_id=f.id
        LEFT JOIN clientes c ON f.cliente_id=c.id
    `,[],(err,rows)=>{

        let html = `
        <div class="card">
            <h3>Equipamentos</h3>
            <a href="/equipamentos/novo" class="btn btn-success mb-2">Novo Equipamento</a>

            <table class="table table-bordered">
                <tr>
                    <th>ID</th>
                    <th>Ambiente</th>
                    <th>Tipo</th>
                    <th>Marca</th>
                    <th>Idade</th>
                    <th>Filial</th>
                    <th>Ações</th>
                </tr>

                ${rows.map(r=>`
                    <tr>
                        <td>${r.id}</td>
                        <td>${r.ambiente}</td>
                        <td>${r.tipo}</td>
                        <td>${r.marca}</td>
                        <td>${r.idade || "-"}</td>
                        <td>${r.filial_nome || "-"}</td>
                        <td>
                            <a href="/equipamentos/editar/${r.id}" class="btn btn-sm btn-primary">Editar</a>
                            <a href="/equipamentos/excluir/${r.id}" class="btn btn-sm btn-danger">Excluir</a>
                            <a href="/equipamentos/manutencao/${r.id}" class="btn btn-sm btn-warning">Manutenção</a>
                            <a href="/equipamentos/historico/${r.id}" class="btn btn-sm btn-info">Histórico</a>
                        </td>
                    </tr>
                `).join("")}
            </table>
        </div>
        `;

        res.send(layout("Equipamentos", html));
    });
});


app.get("/equipamentos/novo", auth, (req,res)=>{
    db.all("SELECT * FROM filiais",[],(err,filiais)=>{

        res.send(layout("Novo Equipamento",`
            <div class="card">
                <h3>Novo Equipamento</h3>

                <form method="POST" enctype="multipart/form-data">

                    <input name="ambiente" class="form-control mb-2" placeholder="Ambiente" required>

                    <input name="tipo" class="form-control mb-2" placeholder="Tipo" required>

                    <input name="marca" class="form-control mb-2" placeholder="Marca" required>

                    <input name="idade" class="form-control mb-2" placeholder="Idade do equipamento" required>

                    <input name="potencia" class="form-control mb-2" placeholder="Potência">

                    <input name="ultima" type="date" class="form-control mb-2" required>

                    <input name="proxima" type="date" class="form-control mb-2" required>

                    <input name="responsavel" class="form-control mb-2" placeholder="Responsável">

                    <select name="filial_id" class="form-control mb-2" required>
                        ${filiais.map(f=>`
                            <option value="${f.id}">
                                ${f.nome}
                            </option>
                        `).join("")}
                    </select>

                    <input type="file" name="foto" class="form-control mb-2">

                    <button class="btn btn-success">
                        Salvar
                    </button>
                </form>
            </div>
        `));
    });
});


app.post("/equipamentos/novo", auth, upload.single("foto"), (req,res)=>{

    const {
        ambiente,
        tipo,
        marca,
        idade,
        potencia,
        ultima,
        proxima,
        responsavel,
        filial_id
    } = req.body;

    const foto = req.file ? req.file.filename : null;

    db.run(`
        INSERT INTO equipamentos
        (
            ambiente,
            tipo,
            marca,
            idade,
            potencia,
            ultima,
            proxima,
            responsavel,
            filial_id,
            foto
        )
        VALUES(?,?,?,?,?,?,?,?,?,?)
    `,
    [
        ambiente,
        tipo,
        marca,
        idade,
        potencia,
        ultima,
        proxima,
        responsavel,
        filial_id,
        foto
    ],
    (err)=>{
        if(err) return res.send(err.message);

        res.redirect("/equipamentos");
    });
});


app.get("/equipamentos/editar/:id", auth, (req,res)=>{

    db.get("SELECT * FROM equipamentos WHERE id=?", [req.params.id], (err,row)=>{

        db.all("SELECT * FROM filiais",[],(err2,filiais)=>{

            res.send(layout("Editar Equipamento",`
                <div class="card">
                    <h3>Editar Equipamento</h3>

                    <form method="POST" enctype="multipart/form-data">

                        <input name="ambiente" class="form-control mb-2" value="${row.ambiente}" required>

                        <input name="tipo" class="form-control mb-2" value="${row.tipo}" required>

                        <input name="marca" class="form-control mb-2" value="${row.marca}" required>

                        <input name="idade" class="form-control mb-2" value="${row.idade}" required>

                        <input name="potencia" class="form-control mb-2" value="${row.potencia}">

                        <input name="ultima" type="date" class="form-control mb-2" value="${row.ultima}">

                        <input name="proxima" type="date" class="form-control mb-2" value="${row.proxima}">

                        <input name="responsavel" class="form-control mb-2" value="${row.responsavel}">

                        <select name="filial_id" class="form-control mb-2">
                            ${filiais.map(f=>`
                                <option value="${f.id}" ${f.id===row.filial_id ? "selected" : ""}>
                                    ${f.nome}
                                </option>
                            `).join("")}
                        </select>

                        <input type="file" name="foto" class="form-control mb-2">

                        <button class="btn btn-success">
                            Salvar
                        </button>
                    </form>

                    ${row.foto ? `<img src="/uploads/${row.foto}" class="preview">` : ""}
                </div>
            `));
        });
    });
});


app.post("/equipamentos/editar/:id", auth, upload.single("foto"), (req,res)=>{

    const {
        ambiente,
        tipo,
        marca,
        idade,
        potencia,
        ultima,
        proxima,
        responsavel,
        filial_id
    } = req.body;

    let fotoSql = "";

    if(req.file){
        fotoSql = `, foto='${req.file.filename}'`;
    }

    db.run(`
        UPDATE equipamentos SET
            ambiente=?,
            tipo=?,
            marca=?,
            idade=?,
            potencia=?,
            ultima=?,
            proxima=?,
            responsavel=?,
            filial_id=?
            ${fotoSql}
        WHERE id=?
    `,
    [
        ambiente,
        tipo,
        marca,
        idade,
        potencia,
        ultima,
        proxima,
        responsavel,
        filial_id,
        req.params.id
    ],
    ()=>{
        res.redirect("/equipamentos");
    });
});


app.get("/equipamentos/excluir/:id", auth, (req,res)=>{
    db.run(
        "DELETE FROM equipamentos WHERE id=?",
        [req.params.id],
        ()=>res.redirect("/equipamentos")
    );
});

// ===================
// DADOS DO RELATÓRIO
// ===================
app.get("/relatorio/dados", auth, (req, res) => {

    let sql = `
        SELECT e.*, f.nome as filial_nome, c.nome as cliente_nome
        FROM equipamentos e
        LEFT JOIN filiais f ON e.filial_id=f.id
        LEFT JOIN clientes c ON f.cliente_id=c.id
        WHERE 1=1
    `;

    const params = [];

    if(req.query.cliente_id){
        sql += " AND c.id=?";
        params.push(req.query.cliente_id);
    }

    if(req.query.filial_id){
        sql += " AND f.id=?";
        params.push(req.query.filial_id);
    }

    db.all(sql, params, (err, rows)=>{

        if(err) return res.send("Erro ao gerar relatório");

        let html = `
        <table class="table table-bordered">
            <tr>
                <th>ID</th>
                <th>Ambiente</th>
                <th>Tipo</th>
                <th>Marca</th>
                <th>Idade</th>
                <th>Filial</th>
                <th>Cliente</th>
                <th>Responsável</th>
                <th>Última</th>
                <th>Próxima</th>
            </tr>

            ${rows.map(r=>`
                <tr>
                    <td>${r.id}</td>
                    <td>${r.ambiente}</td>
                    <td>${r.tipo}</td>
                    <td>${r.marca}</td>
                    <td>${r.idade || "-"}</td>
                    <td>${r.filial_nome || "-"}</td>
                    <td>${r.cliente_nome || "-"}</td>
                    <td>${r.responsavel || "-"}</td>
                    <td>${r.ultima || "-"}</td>
                    <td>${r.proxima || "-"}</td>
                </tr>
            `).join("")}
        </table>
        `;

        res.send(html);
    });
});


// ===================
// NOVA MANUTENÇÃO
// ===================
app.get("/equipamentos/manutencao/:id", auth, (req,res)=>{

    res.send(layout("Nova Manutenção",`
        <div class="card">
            <h3>Registrar Manutenção</h3>

            <form method="POST">

                <input
                    name="tipo"
                    class="form-control mb-2"
                    placeholder="Tipo (Preventiva/Corretiva)"
                    required
                >

                <textarea
                    name="descricao"
                    class="form-control mb-2"
                    placeholder="Descrição"
                ></textarea>

                <input
                    name="responsavel"
                    class="form-control mb-2"
                    placeholder="Responsável"
                >

                <button class="btn btn-success">
                    Salvar
                </button>

            </form>
        </div>
    `));
});


app.post("/equipamentos/manutencao/:id", auth, (req,res)=>{

    const {
        tipo,
        descricao,
        responsavel
    } = req.body;

    const hoje = new Date();

    const ultima = hoje.toISOString().split("T")[0];

    const proximaDate = new Date();
    proximaDate.setDate(proximaDate.getDate() + 30);

    const proxima = proximaDate.toISOString().split("T")[0];

    // salva histórico
    db.run(`
        INSERT INTO manutencoes
        (
            equipamento_id,
            data,
            tipo,
            descricao,
            responsavel
        )
        VALUES(?,?,?,?,?)
    `,
    [
        req.params.id,
        ultima,
        tipo,
        descricao,
        responsavel
    ],
    (err)=>{

        if(err) return res.send(err.message);

        // atualiza equipamento
        db.run(`
            UPDATE equipamentos
            SET
                ultima=?,
                proxima=?,
                responsavel=?
            WHERE id=?
        `,
        [
            ultima,
            proxima,
            responsavel,
            req.params.id
        ],
        (err2)=>{

            if(err2) return res.send(err2.message);

            res.redirect("/equipamentos");
        });
    });
});


// ===================
// HISTÓRICO
// ===================
app.get("/equipamentos/historico/:id", auth, (req,res)=>{

    const equipamentoId = req.params.id;

    db.all(`
        SELECT
            id,
            data as data_evento,
            tipo,
            descricao,
            responsavel,
            'manutencao' as origem
        FROM manutencoes
        WHERE equipamento_id=?
    `,
    [equipamentoId],
    (err, manutencoes)=>{

        if(err) return res.send(err.message);

        db.all(`
            SELECT
                id,
                data_hora_chamado as data_evento,
                tipo_defeito as tipo,
                descricao,
                ambiente as responsavel,
                'chamado' as origem
            FROM chamados
            WHERE equipamento_id=?
        `,
        [equipamentoId],
        (err2, chamados)=>{

            if(err2) return res.send(err2.message);

            const historico = [
                ...manutencoes,
                ...chamados
            ];

            historico.sort((a,b)=>{
                return new Date(b.data_evento)
                    - new Date(a.data_evento);
            });

            let html = `
            <div class="card">
                <h3>Histórico Completo</h3>

                <table class="table table-bordered">
                    <tr>
                        <th>Data</th>
                        <th>Origem</th>
                        <th>Tipo</th>
                        <th>Descrição</th>
                        <th>Responsável / Ambiente</th>
                    </tr>

                    ${historico.map(h=>`
                        <tr
                            style="
                            background:
                            ${h.origem === "chamado"
                                ? "#ffecec"
                                : "#e8f5e9"};
                            "
                        >
                            <td>${h.data_evento || "-"}</td>

                            <td>
                                ${
                                    h.origem === "chamado"
                                    ? '<span class="badge bg-danger">Chamado</span>'
                                    : '<span class="badge bg-success">Manutenção</span>'
                                }
                            </td>

                            <td>${h.tipo || "-"}</td>

                            <td>${h.descricao || "-"}</td>

                            <td>${h.responsavel || "-"}</td>
                        </tr>
                    `).join("")}
                </table>
            </div>
            `;

            res.send(layout("Histórico", html));
        });
    });
});


app.get("/relatorio-chamados", auth, (req, res) => {
    db.all("SELECT * FROM filiais", [], (err, filiais) => {

        res.send(layout("Relatório de Chamados", `
            <div class="card">
                <h3>Relatório de Chamados</h3>

                <form id="filtroForm">
                    <div class="row">
                        <div class="col-md-3">
                            <select name="filial_id" class="form-control mb-2">
                                <option value="">Todas Filiais</option>
                                ${filiais.map(f => `<option value="${f.id}">${f.nome}</option>`).join('')}
                            </select>
                        </div>

                        <div class="col-md-3">
                            <input type="date" name="data_inicio" class="form-control mb-2">
                        </div>

                        <div class="col-md-3">
                            <input type="date" name="data_fim" class="form-control mb-2">
                        </div>

                        <div class="col-md-3">
                            <button class="btn btn-primary mb-2">Filtrar</button>
                            <button type="button" id="imprimirBtn" class="btn btn-warning mb-2">Imprimir</button>
                        </div>
                    </div>
                </form>

                <div id="resultado"></div>
            </div>

            <script>
                const form = document.getElementById('filtroForm');
                const resultado = document.getElementById('resultado');

                async function carregar() {
                    const params = new URLSearchParams(new FormData(form));
                    const res = await fetch('/relatorio-chamados/dados?' + params.toString());
                    const html = await res.text();
                    resultado.innerHTML = html;
                }

                form.addEventListener('submit', e => {
                    e.preventDefault();
                    carregar();
                });

                window.onload = carregar;

                document.getElementById('imprimirBtn').addEventListener('click', () => {
                    const conteudo = resultado.innerHTML;
                    const win = window.open('', '', 'width=800,height=600');
                    win.document.write(conteudo);
                    win.print();
                    win.close();
                });
            </script>
        `));
    });
});

app.get("/relatorio-chamados/dados", auth, (req, res) => {

    let sql = `
        SELECT ch.*, f.nome as filial_nome, e.ambiente as equipamento_ambiente
        FROM chamados ch
        LEFT JOIN filiais f ON ch.filial_id = f.id
        LEFT JOIN equipamentos e ON ch.equipamento_id = e.id
        WHERE 1=1
    `;

    const params = [];

    // filtro por filial
    if (req.query.filial_id) {
        sql += " AND ch.filial_id=?";
        params.push(req.query.filial_id);
    }

    // filtro por data
    if (req.query.data_inicio) {
        sql += " AND date(ch.data_hora_chamado) >= date(?)";
        params.push(req.query.data_inicio);
    }

    if (req.query.data_fim) {
        sql += " AND date(ch.data_hora_chamado) <= date(?)";
        params.push(req.query.data_fim);
    }

    sql += " ORDER BY ch.data_hora_chamado DESC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.send("Erro ao gerar relatório");

        let html = `
        <table class="table table-bordered">
            <tr>
                <th>ID</th>
                <th>Filial</th>
                <th>Equipamento</th>
                <th>Ambiente</th>
                <th>Defeito</th>
                <th>Data Chamado</th>
                <th>Descrição</th>
                <th>Resolvido em</th>
            </tr>

            ${rows.map(r => `
                <tr>
                    <td>${r.id}</td>
                    <td>${r.filial_nome || '-'}</td>
                    <td>${r.equipamento_ambiente || '-'}</td>
                    <td>${r.ambiente || '-'}</td>
                    <td>${r.tipo_defeito || '-'}</td>
                    <td>${r.data_hora_chamado || '-'}</td>
                    <td>${r.descricao || '-'}</td>
                    <td>${r.data_hora_resolucao || '-'}</td>
                </tr>
            `).join('')}
        </table>
        `;

        res.send(html);
    });
});

app.get("/chamados", auth, (req, res) => {
    db.all(`
        SELECT ch.*, f.nome as filial_nome, e.ambiente as equipamento_ambiente
        FROM chamados ch
        LEFT JOIN filiais f ON ch.filial_id=f.id
        LEFT JOIN equipamentos e ON ch.equipamento_id=e.id
        ORDER BY ch.data_hora_chamado DESC
    `, [], (err, rows) => {
        if(err) return res.send("Erro ao carregar chamados: " + err.message);

        let html = `
        <div class="card">
            <h3>Chamados</h3>
            <a href="/chamados/novo" class="btn btn-success mb-2">Novo Chamado</a>

            <table class="table table-bordered">
                <tr>
                    <th>ID</th>
                    <th>Filial</th>
                    <th>Equipamento</th>
                    <th>Ambiente</th>
                    <th>Defeito</th>
                    <th>Data</th>
                    <th>Ações</th>
                </tr>

                ${rows.map(r => `
                    <tr>
                        <td>${r.id}</td>
                        <td>${r.filial_nome || "-"}</td>
                        <td>${r.equipamento_ambiente || "-"}</td>
                        <td>${r.ambiente || "-"}</td>
                        <td>${r.tipo_defeito || "-"}</td>
                        <td>${r.data_hora_chamado || "-"}</td>
                        <td>
                            <a href="/chamados/editar/${r.id}" class="btn btn-sm btn-primary">Editar</a>
                            <a href="/chamados/excluir/${r.id}" class="btn btn-sm btn-danger">Excluir</a>
                        </td>
                    </tr>
                `).join("")}
            </table>
        </div>
        `;

        res.send(layout("Chamados", html));
    });
});

// ===================
// NOVO CHAMADO
// ===================
app.get("/chamados/novo", auth, (req, res) => {

    db.all("SELECT * FROM filiais", [], (err, filiais) => {

        if(err) return res.send("Erro ao carregar filiais");

        db.all("SELECT * FROM equipamentos", [], (err2, equipamentos) => {

            if(err2) return res.send("Erro ao carregar equipamentos");

            res.send(layout("Novo Chamado", `
                <div class="card">
                    <h3>Novo Chamado</h3>

                    <form method="POST">

                        <select name="filial_id" class="form-control mb-2" required>
                            <option value="">Selecione a filial</option>
                            ${filiais.map(f => `
                                <option value="${f.id}">
                                    ${f.nome}
                                </option>
                            `).join("")}
                        </select>

                        <select name="equipamento_id" class="form-control mb-2" required>
                            <option value="">Selecione o equipamento</option>
                            ${equipamentos.map(e => `
                                <option value="${e.id}">
                                    ${e.ambiente}
                                </option>
                            `).join("")}
                        </select>

                        <input
                            name="ambiente"
                            class="form-control mb-2"
                            placeholder="Ambiente"
                            required
                        >

                        <input
                            name="tipo_defeito"
                            class="form-control mb-2"
                            placeholder="Tipo do defeito"
                            required
                        >

                        <button class="btn btn-success">
                            Salvar
                        </button>

                    </form>
                </div>
            `));
        });
    });
});


// ===================
// SALVAR NOVO CHAMADO
// ===================
app.post("/chamados/novo", auth, (req, res) => {

    const {
        filial_id,
        equipamento_id,
        ambiente,
        tipo_defeito
    } = req.body;

    const data_hora_chamado =
        new Date().toLocaleString();

    db.run(`
        INSERT INTO chamados
        (
            filial_id,
            equipamento_id,
            ambiente,
            tipo_defeito,
            data_hora_chamado
        )
        VALUES(?,?,?,?,?)
    `,
    [
        filial_id,
        equipamento_id,
        ambiente,
        tipo_defeito,
        data_hora_chamado
    ],
    (err)=>{

        if(err){
            return res.send(
                "Erro ao salvar: " + err.message
            );
        }

        res.redirect("/chamados");
    });
});
// ===================
// RODAR SERVIDOR
// ===================
app.listen(PORT,()=>console.log(`Servidor rodando em http://localhost:${PORT}`));
