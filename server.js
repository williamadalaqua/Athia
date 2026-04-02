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
if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads", { recursive: true });
if (!fs.existsSync("./public/img")) fs.mkdirSync("./public/img", { recursive: true });

// ===================
// BANCO DE DADOS
// ===================
const db = new sqlite3.Database("./database.db");
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        senha TEXT
    )`);
    db.run(`INSERT OR IGNORE INTO usuarios(id,email,senha) VALUES(1,'admin@email.com','123')`);

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
        tipo TEXT,
        marca TEXT,
        potencia TEXT,
        ultima TEXT,
        proxima TEXT,
        responsavel TEXT,
        executor TEXT,
        foto TEXT,
        filial_id INTEGER
    )`);
});

// ===================
// MIDDLEWARE
// ===================
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
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
    filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname)
});
const upload = multer({ storage });

// ===================
// AUTENTICAÇÃO
// ===================
function auth(req, res, next) {
    if (req.session.logado) next();
    else res.redirect("/login");
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
            body { 
                background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('/img/bg.jpeg'); 
                background-size: cover; color: white; 
            }
            .navbar { background: rgba(255,255,255,0.9); }
            .nav-link, .dropdown-item { color: black !important; }
            .dropdown-menu { background: white; }
            .card { background: white; color: black; border-radius: 15px; padding:20px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); margin-bottom:20px; }
            .logo { height: 40px; }
            table { color:black; }
            img.preview { max-width: 150px; margin-top: 10px; border-radius:5px; }
        </style>
    </head>
    <body>
        <nav class="navbar navbar-expand-lg p-3 d-flex justify-content-between">
            <img src="/img/logo.jpeg" class="logo">
            <div class="collapse navbar-collapse">
                ${titulo !== "Login" && titulo !== "Cadastrar" ? `
                <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                    <li class="nav-item"><a class="nav-link btn btn-light btn-sm mx-1" href="/dashboard">Dashboard</a></li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle btn btn-light btn-sm mx-1" href="#" data-bs-toggle="dropdown">Clientes</a>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="/clientes">Todos os Clientes</a></li>
                            <li><a class="dropdown-item" href="/clientes/novo">Novo Cliente</a></li>
                        </ul>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle btn btn-light btn-sm mx-1" href="#" data-bs-toggle="dropdown">Filiais</a>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="/filiais">Todas as Filiais</a></li>
                            <li><a class="dropdown-item" href="/filiais/novo">Nova Filial</a></li>
                        </ul>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle btn btn-light btn-sm mx-1" href="#" data-bs-toggle="dropdown">Equipamentos</a>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="/equipamentos">Todos os Equipamentos</a></li>
                            <li><a class="dropdown-item" href="/equipamentos/novo">Novo Equipamento</a></li>
                        </ul>
                    </li>
                    <li class="nav-item"><a class="nav-link btn btn-warning btn-sm mx-1" href="/relatorio">Relatório</a></li>
                </ul>
                <a href="/logout" class="btn btn-danger btn-sm">Sair</a>` : ""}
            </div>
        </nav>
        <div class="container mt-4">${conteudo}</div>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    </html>
    `;
}

// ===================
// LOGIN/CADASTRO/LOGOUT
// ===================
app.get("/", (req,res)=>res.send(layout("Página Inicial",`
    <h1 style="text-align:center;margin-top:50px;">Sistema HVAC Athia</h1>
    <div style="text-align:center;">
        <a href="/login" class="btn btn-primary">Entrar</a>
        <a href="/cadastrar" class="btn btn-success">Cadastrar</a>
    </div>
`)));

app.get("/cadastrar",(req,res)=>{
    res.send(layout("Cadastrar",`
        <div class="card">
            <h3>Cadastrar Usuário</h3>
            <form method="POST" id="cadForm">
                <input name="email" type="email" class="form-control mb-2" placeholder="Email" required>
                <input name="senha" type="password" class="form-control mb-2" placeholder="Senha" required>
                <input name="senha2" type="password" class="form-control mb-2" placeholder="Confirmar Senha" required>
                <button class="btn btn-success">Cadastrar</button>
            </form>
            <div id="msg" class="mt-2 text-danger"></div>
        </div>
        <script>
            const form = document.getElementById('cadForm');
            form.addEventListener('submit', async e=>{
                e.preventDefault();
                const data = new URLSearchParams(new FormData(form));
                const res = await fetch('/cadastrar',{method:'POST',body:data});
                const text = await res.text();
                document.getElementById('msg').innerHTML=text;
                if(text==='ok') window.location.href='/login';
            });
        </script>
    `));
});

app.post("/cadastrar",(req,res)=>{
    const {email,senha,senha2}=req.body;
    if(senha!==senha2) return res.send("Senhas não conferem!");
    db.run("INSERT INTO usuarios(email,senha) VALUES(?,?)",[email,senha],err=>{if(err) return res.send("Email já cadastrado!"); res.send("ok");});
});

app.get("/login",(req,res)=>res.send(layout("Login",`
    <div class="card">
        <h3>Login</h3>
        <form method="POST" id="loginForm">
            <input name="email" class="form-control mb-2" placeholder="Email" required>
            <input type="password" name="senha" class="form-control mb-2" placeholder="Senha" required>
            <button class="btn btn-primary">Entrar</button>
        </form>
        <div id="msg" class="mt-2 text-danger"></div>
    </div>
    <script>
        const form = document.getElementById('loginForm');
        form.addEventListener('submit', async e=>{
            e.preventDefault();
            const data=new URLSearchParams(new FormData(form));
            const res=await fetch('/login',{method:'POST',body:data});
            const text=await res.text();
            if(text==='ok') window.location.href='/dashboard';
            else document.getElementById('msg').innerHTML=text;
        });
    </script>
`)));

app.post("/login",(req,res)=>{
    const {email,senha}=req.body;
    db.get("SELECT * FROM usuarios WHERE email=? AND senha=?",[email,senha],(err,row)=>{
        if(row){req.session.logado=true;res.send("ok");} else res.send("Email ou senha inválidos!");
    });
});

app.get("/logout",(req,res)=>{req.session.destroy();res.redirect("/");});

// ===================
// DASHBOARD
// ===================
// ===================
// DASHBOARD LIMPO SEM GRÁFICOS
// ===================
app.get("/dashboard", auth, (req,res)=>{
    db.all("SELECT * FROM clientes",[],(err,clientes)=>{
        db.all("SELECT * FROM filiais",[],(err2,filiais)=>{
            db.all("SELECT * FROM equipamentos",[],(err3,equipamentos)=>{

                res.send(layout("Dashboard",`
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #f0f2f5; color: #333; min-height:100vh; padding-bottom:50px; }
                        .card { background-color: #fff; color: #333; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
                        .card h3 { margin:0; font-size:1.2rem; }
                        .card span { font-size:1.5rem; font-weight:bold; }
                        .btn-report { background: linear-gradient(90deg,#ff7e5f,#feb47b); border:none; color:white; font-weight:bold; padding:10px 20px; border-radius:8px; text-decoration:none; }
                        .btn-report:hover { opacity:0.9; }
                        .stats-container { display:flex; gap:20px; flex-wrap:wrap; justify-content:center; margin-bottom:30px; }
                    </style>

                    <h2 style="text-align:center; margin-bottom:30px;">Dashboard</h2>
                    <div class="stats-container">
                        <div class="card" style="width:200px; text-align:center;"><h3>Clientes</h3><span>${clientes.length}</span></div>
                        <div class="card" style="width:200px; text-align:center;"><h3>Filiais</h3><span>${filiais.length}</span></div>
                        <div class="card" style="width:200px; text-align:center;"><h3>Equipamentos</h3><span>${equipamentos.length}</span></div>
                    </div>

                    <div style="text-align:center; margin-bottom:50px;">
                        <a href="/relatorio" class="btn-report"><i class="fas fa-print"></i> Gerar Relatórios</a>
                    </div>
                `));
            });
        });
    });
});

// ===================
// CLIENTES CRUD
// ===================
app.get("/clientes", auth, (req,res)=>{
    db.all("SELECT * FROM clientes",[],(err,rows)=>{
        let html = `
        <div class="card">
            <h3>Clientes</h3>
            <a href="/clientes/novo" class="btn btn-success mb-2">Novo Cliente</a>
            <table class="table table-bordered">
                <tr><th>ID</th><th>Nome</th><th>Ações</th></tr>
                ${rows.map(r=>`<tr>
                    <td>${r.id}</td>
                    <td>${r.nome}</td>
                    <td>
                        <a href="/clientes/editar/${r.id}" class="btn btn-sm btn-primary">Editar</a>
                        <a href="/clientes/excluir/${r.id}" class="btn btn-sm btn-danger">Excluir</a>
                    </td>
                </tr>`).join('')}
            </table>
        </div>`;
        res.send(layout("Clientes",html));
    });
});

app.get("/clientes/novo", auth, (req,res)=>{
    res.send(layout("Novo Cliente",`
        <div class="card">
            <h3>Novo Cliente</h3>
            <form method="POST">
                <input name="nome" class="form-control mb-2" placeholder="Nome" required>
                <button class="btn btn-success">Salvar</button>
            </form>
        </div>
    `));
});

app.post("/clientes/novo", auth, (req,res)=>{
    const { nome } = req.body;
    db.run("INSERT INTO clientes(nome) VALUES(?)",[nome],()=>res.redirect("/clientes"));
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
    db.run("UPDATE clientes SET nome=? WHERE id=?",[req.body.nome,req.params.id],()=>res.redirect("/clientes"));
});

app.get("/clientes/excluir/:id", auth, (req,res)=>{
    db.run("DELETE FROM clientes WHERE id=?",[req.params.id],()=>res.redirect("/clientes"));
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
    db.all(`SELECT e.*, f.nome as filial_nome, c.nome as cliente_nome 
            FROM equipamentos e 
            LEFT JOIN filiais f ON e.filial_id=f.id 
            LEFT JOIN clientes c ON f.cliente_id=c.id`,[],(err,rows)=>{
        let html = `
        <div class="card">
            <h3>Equipamentos</h3>
            <a href="/equipamentos/novo" class="btn btn-success mb-2">Novo Equipamento</a>
            <table class="table table-bordered">
                <tr><th>ID</th><th>Modelo</th><th>Tipo</th><th>Marca</th><th>Filial</th><th>Cliente</th><th>Ações</th></tr>
                ${rows.map(r=>`<tr>
                    <td>${r.id}</td>
                    <td>${r.modelo}</td>
                    <td>${r.tipo}</td>
                    <td>${r.marca}</td>
                    <td>${r.filial_nome||'-'}</td>
                    <td>${r.cliente_nome||'-'}</td>
                    <td>
                        <a href="/equipamentos/editar/${r.id}" class="btn btn-sm btn-primary">Editar</a>
                        <a href="/equipamentos/excluir/${r.id}" class="btn btn-sm btn-danger">Excluir</a>
                    </td>
                </tr>`).join('')}
            </table>
        </div>`;
        res.send(layout("Equipamentos",html));
    });
});

app.get("/equipamentos/novo", auth, (req,res)=>{
    db.all(`SELECT f.id as filial_id, f.nome as filial_nome, c.nome as cliente_nome 
            FROM filiais f 
            LEFT JOIN clientes c ON f.cliente_id = c.id`,[],(err,filiais)=>{
        res.send(layout("Novo Equipamento",`
            <div class="card">
                <h3>Novo Equipamento</h3>
                <form method="POST" enctype="multipart/form-data">
                    <input name="modelo" class="form-control mb-2" placeholder="Modelo" required>
                    <input name="tipo" class="form-control mb-2" placeholder="Tipo" required>
                    <input name="marca" class="form-control mb-2" placeholder="Marca" required>
                    <input name="potencia" class="form-control mb-2" placeholder="Potência" required>
                    <input name="ultima" class="form-control mb-2" type="date" placeholder="Última Manutenção" required>
                    <input name="proxima" class="form-control mb-2" type="date" placeholder="Próxima Manutenção" required>
                    <input name="responsavel" class="form-control mb-2" placeholder="Responsável" required>
                    <input name="executor" class="form-control mb-2" placeholder="Executor" required>
                    <select name="filial_id" class="form-control mb-2" required>
                        ${filiais.map(f=>`<option value="${f.filial_id}">${f.filial_nome} - ${f.cliente_nome || '-'}</option>`).join('')}
                    </select>
                    <input type="file" name="foto" class="form-control mb-2">
                    <button class="btn btn-success">Salvar</button>
                </form>
            </div>
        `));
    });
});

app.post("/equipamentos/novo", auth, upload.single("foto"), (req,res)=>{
    const { modelo,tipo,marca,potencia,ultima,proxima,responsavel,executor,filial_id } = req.body;
    const foto = req.file ? req.file.filename : null;
    db.run(`INSERT INTO equipamentos(modelo,tipo,marca,potencia,ultima,proxima,responsavel,executor,filial_id,foto)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)`,[modelo,tipo,marca,potencia,ultima,proxima,responsavel,executor,filial_id,foto],()=>res.redirect("/equipamentos"));
});

app.get("/equipamentos/editar/:id", auth, (req,res)=>{
    db.get("SELECT * FROM equipamentos WHERE id=?",[req.params.id],(err,row)=>{
        db.all("SELECT * FROM filiais",[],(err2,filiais)=>{
            res.send(layout("Editar Equipamento",`
                <div class="card">
                    <h3>Editar Equipamento</h3>
                    <form method="POST" enctype="multipart/form-data">
                        <input name="modelo" class="form-control mb-2" value="${row.modelo}" required>
                        <input name="tipo" class="form-control mb-2" value="${row.tipo}" required>
                        <input name="marca" class="form-control mb-2" value="${row.marca}" required>
                        <input name="potencia" class="form-control mb-2" value="${row.potencia}" required>
                        <input name="ultima" class="form-control mb-2" type="date" value="${row.ultima}" required>
                        <input name="proxima" class="form-control mb-2" type="date" value="${row.proxima}" required>
                        <input name="responsavel" class="form-control mb-2" value="${row.responsavel}" required>
                        <input name="executor" class="form-control mb-2" value="${row.executor}" required>
                        <select name="filial_id" class="form-control mb-2" required>
                            ${filiais.map(f=>`<option value="${f.id}" ${f.id===row.filial_id?'selected':''}>${f.nome}</option>`).join('')}
                        </select>
                        <input type="file" name="foto" class="form-control mb-2">
                        <button class="btn btn-success">Salvar</button>
                    </form>
                    ${row.foto?`<img src="/uploads/${row.foto}" class="preview">`:''}
                </div>
            `));
        });
    });
});

app.post("/equipamentos/editar/:id", auth, upload.single("foto"), (req,res)=>{
    const { modelo,tipo,marca,potencia,ultima,proxima,responsavel,executor,filial_id } = req.body;
    let fotoSql = req.file ? `, foto='${req.file.filename}'` : '';
    db.run(`UPDATE equipamentos SET modelo=?,tipo=?,marca=?,potencia=?,ultima=?,proxima=?,responsavel=?,executor=?,filial_id=? ${fotoSql} WHERE id=?`,
        [modelo,tipo,marca,potencia,ultima,proxima,responsavel,executor,filial_id,req.params.id],()=>res.redirect("/equipamentos"));
});

app.get("/equipamentos/excluir/:id", auth, (req,res)=>{
    db.run("DELETE FROM equipamentos WHERE id=?",[req.params.id],()=>res.redirect("/equipamentos"));
});

// ===================
// RELATÓRIOS
// ===================
app.get("/relatorio", auth, (req, res) => {
    // Pega clientes e filiais para filtros
    db.all("SELECT * FROM clientes", [], (err, clientes) => {
        db.all("SELECT f.id, f.nome, c.nome as cliente_nome FROM filiais f LEFT JOIN clientes c ON f.cliente_id=c.id", [], (err2, filiais) => {
            res.send(layout("Relatório", `
                <div class="card">
                    <h3>Filtrar Relatório</h3>
                    <form method="GET" id="filtroForm">
                        <div class="row">
                            <div class="col-md-4">
                                <select name="cliente_id" class="form-control mb-2">
                                    <option value="">Todos os Clientes</option>
                                    ${clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <select name="filial_id" class="form-control mb-2">
                                    <option value="">Todas as Filiais</option>
                                    ${filiais.map(f => `<option value="${f.id}">${f.cliente_nome} - ${f.nome}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <button class="btn btn-primary mb-2">Filtrar</button>
                                <button type="button" id="imprimirBtn" class="btn btn-warning mb-2">Imprimir</button>
                                <button type="button" id="pdfBtn" class="btn btn-success mb-2">Salvar PDF</button>
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

                    document.getElementById('pdfBtn').addEventListener('click', async () => {
                        const params = new URLSearchParams(new FormData(form));
                        const res = await fetch('/relatorio/pdf?' + params.toString());
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'relatorio.pdf';
                        a.click();
                        window.URL.revokeObjectURL(url);
                    });
                </script>
            `));
        });
    });
});

// ===================
// Dados do relatório filtrado
// ===================
app.get("/relatorio/dados", auth, (req, res) => {
    let sql = `SELECT e.*, f.nome as filial_nome, c.nome as cliente_nome
               FROM equipamentos e
               LEFT JOIN filiais f ON e.filial_id=f.id
               LEFT JOIN clientes c ON f.cliente_id=c.id WHERE 1=1`;
    const params = [];
    if (req.query.cliente_id) { sql += " AND c.id=?"; params.push(req.query.cliente_id); }
    if (req.query.filial_id) { sql += " AND f.id=?"; params.push(req.query.filial_id); }

    db.all(sql, params, (err, rows) => {
        if (err) return res.send("Erro ao gerar relatório");
        let html = `<table class="table table-bordered">
                        <tr>
                            <th>ID</th><th>Modelo</th><th>Tipo</th><th>Marca</th>
                            <th>Filial</th><th>Cliente</th><th>Responsável</th><th>Executor</th>
                            <th>Última</th><th>Próxima</th>
                        </tr>
                        ${rows.map(r => `<tr>
                            <td>${r.id}</td><td>${r.modelo}</td><td>${r.tipo}</td><td>${r.marca}</td>
                            <td>${r.filial_nome||'-'}</td><td>${r.cliente_nome||'-'}</td>
                            <td>${r.responsavel||'-'}</td><td>${r.executor||'-'}</td>
                            <td>${r.ultima||'-'}</td><td>${r.proxima||'-'}</td>
                        </tr>`).join('')}
                    </table>`;
        res.send(html);
    });
});

// ===================
// Gerar PDF
// ===================
const PDFDocument = require('pdfkit');
app.get("/relatorio/pdf", auth, (req, res) => {
    let sql = `SELECT e.*, f.nome as filial_nome, c.nome as cliente_nome
               FROM equipamentos e
               LEFT JOIN filiais f ON e.filial_id=f.id
               LEFT JOIN clientes c ON f.cliente_id=c.id WHERE 1=1`;
    const params = [];
    if (req.query.cliente_id) { sql += " AND c.id=?"; params.push(req.query.cliente_id); }
    if (req.query.filial_id) { sql += " AND f.id=?"; params.push(req.query.filial_id); }

    db.all(sql, params, (err, rows) => {
        if (err) return res.send("Erro ao gerar PDF");

        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=relatorio.pdf');
        doc.pipe(res);

        doc.fontSize(16).text('Relatório de Equipamentos', { align: 'center' });
        doc.moveDown();

        rows.forEach(r => {
            doc.fontSize(12)
                .text(`ID: ${r.id} | Modelo: ${r.modelo} | Tipo: ${r.tipo} | Marca: ${r.marca}`)
                .text(`Filial: ${r.filial_nome||'-'} | Cliente: ${r.cliente_nome||'-'}`)
                .text(`Responsável: ${r.responsavel||'-'} | Executor: ${r.executor||'-'}`)
                .text(`Última: ${r.ultima||'-'} | Próxima: ${r.proxima||'-'}`)
                .moveDown();
        });

        doc.end();
    });
});
// ===================
// RODAR SERVIDOR
// ===================
app.listen(PORT,()=>console.log(`Servidor rodando em http://localhost:${PORT}`));
