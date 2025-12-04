// server.js
// Servidor simples para o Painel MFE Posicional
// - Serve o index.html
// - Expõe GET /api/mfe com dados de exemplo (por enquanto)

const express = require("express");
const path = require("path");
const app = express();

const PORT = process.env.PORT || 8082;

// ---------- DADOS DE EXEMPLO (mesmos do index.html) ----------
const dadosExemplo = [
  {
    par: "BTC",
    side: "SHORT",
    preco: 95000.123,
    alvo: 91200.456,
    ganho_pct: 4.0,
    zona: "VERDE",
    risco: "BAIXO",
    prioridade: "ALTA",
    data: "2025-12-03",
    hora: "19:05",
  },
  {
    par: "ETH",
    side: "LONG",
    preco: 3800.456,
    alvo: 3940.234,
    ganho_pct: 3.7,
    zona: "VERDE",
    risco: "BAIXO",
    prioridade: "ALTA",
    data: "2025-12-03",
    hora: "19:05",
  },
  {
    par: "ADA",
    side: "SHORT",
    preco: 0.620,
    alvo: 0.582,
    ganho_pct: 6.1,
    zona: "VERDE",
    risco: "MÉDIO",
    prioridade: "ALTA",
    data: "2025-12-03",
    hora: "19:05",
  },
  {
    par: "ICP",
    side: "LONG",
    preco: 15.8,
    alvo: 17.9,
    ganho_pct: 13.3,
    zona: "VERMELHA",
    risco: "ALTO",
    prioridade: "MÉDIA",
    data: "2025-12-03",
    hora: "19:05",
  },
  {
    par: "FLUX",
    side: "NAO_ENTRAR",
    preco: 0.95,
    alvo: 0.0,
    ganho_pct: 0.0,
    zona: "-",
    risco: "ALTO",
    prioridade: "NÃO OPERAR",
    data: "2025-12-03",
    hora: "19:05",
  },
];

// ---------- MIDDLEWARES BÁSICOS ----------
app.use(express.json());

// Servir arquivos estáticos da raiz (index.html)
const publicDir = path.join(__dirname);
app.use(express.static(publicDir));

// ---------- ROTA API /api/mfe ----------
app.get("/api/mfe", (req, res) => {
  // Por enquanto, devolve apenas os dados de exemplo.
  // Depois vamos trocar para ler de um JSON gerado pela automação (loop 5 minutos).
  res.json(dadosExemplo);
});

// ---------- ROTA RAIZ ----------
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// ---------- START ----------
app.listen(PORT, () => {
  console.log(`Painel MFE rodando na porta ${PORT}`);
});
