function layout(titulo, conteudo, logado = false) {
    let menu = '';
    if (logado) {
        menu = `
        <nav class="navbar p-3 d-flex justify-content-between" style="background:rgba(0,0,0,0.8); color:white;">
            <div>
                <a href="/dashboard" class="btn btn-light btn-sm">Dashboard</a>
                <a href="/clientes" class="btn btn-light btn-sm">Clientes</a>
                <a href="/logout" class="btn btn-danger btn-sm">Sair</a>
            </div>
        </nav>`;
    }

    return `
    <html>
    <head>
        <title>${titulo}</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body style="background:#f5f5f5;color:black;">
        ${menu}
        <div class="container mt-4">${conteudo}</div>
    </body>
    </html>
    `;
}

module.exports = { layout };