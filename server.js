// server.js
// Servidor do Painel MFE Posicional
// - Serve o index.html
// - GET /api/mfe: lê o POSICIONAL de entrada.json e monta os campos do painel

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 8082;

// Caminho do JSON já gerado pela automação (painel antigo, blindado)
const ENTRADA_PATH =
  "/home/roteiro_ds/autotrader-planilhas-python/data/entrada.json";

// ---------- DADOS DE EXEMPLO (apenas se der erro) ----------
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
];

// ---------- CLASSIFICAÇÕES AUXILIARES ----------

const RISCO_BAIXO = new Set([
  "BTC", "ETH", "BNB", "XRP", "ADA", "SOL", "TRX", "LTC",
  "LINK", "ATOM", "NEAR", "OP", "UNI", "POL", "TIA",
]);

const RISCO_ALTO = new Set([
  "ICP", "FET", "FLUX", "PEPE", "WIF", "GALA", "MANA",
  "SAND", "TNSR", "SEI", "AXS", "RUNE",
]);

function classificarRisco(par) {
  if (RISCO_BAIXO.has(par)) return "BAIXO";
  if (RISCO_ALTO.has(par)) return "ALTO";
  return "MÉDIO";
}

function classificarZona(ganho) {
  if (ganho <= 0) return "-";
  if (ganho < 3) return "AMARELA";   // pouco ganho
  if (ganho <= 8) return "VERDE";    // zona ideal
  return "VERMELHA";                 // muito agressivo
}

function classificarPrioridade(side, ganho, risco, assertPct) {
  if (side === "NAO_ENTRAR") return "NÃO OPERAR";

  let prioridade = "BAIXA";

  if (ganho >= 3 && ganho <= 8 && (risco === "BAIXO" || risco === "MÉDIO")) {
    prioridade = "MÉDIA";
  }
  if (ganho >= 4 && risco === "BAIXO") {
    prioridade = "ALTA";
  }
  if (ganho >= 6 && risco === "BAIXO") {
    prioridade = "ALTA";
  }

  if (typeof assertPct === "number" && assertPct < 65) {
    prioridade = "BAIXA";
  }

  return prioridade;
}

// Lê o POSICIONAL do entrada.json e monta a lista para o painel
function montarPainelAPartirDeEntrada() {
  if (!fs.existsSync(ENTRADA_PATH)) {
    return null;
  }

  const raw = fs.readFileSync(ENTRADA_PATH, "utf-8");
  const json = JSON.parse(raw);

  // Estrutura esperada: { swing: [...], posicional: [...], ultima_atualizacao: "..." }
  const listaPosicional = Array.isArray(json.posicional) ? json.posicional : [];

  const saida = listaPosicional.map((item) => {
    const risco = classificarRisco(item.par);
    const zona = classificarZona(item.ganho_pct || 0);
    const prioridade = classificarPrioridade(
      item.side,
      item.ganho_pct || 0,
      risco,
      item.assert_pct
    );

    return {
      par: item.par,
      side: item.side,
      preco: item.preco,
      alvo: item.alvo,
      ganho_pct: item.ganho_pct,
      zona,
      risco,
      prioridade,
      data: item.data,
      hora: item.hora,
    };
  });

  return {
    registros: saida,
    ultima_atualizacao: json.ultima_atualizacao || null,
  };
}

// ---------- MIDDLEWARES ----------
app.use(express.json());
const publicDir = path.join(__dirname);
app.use(express.static(publicDir));

// ---------- ROTA API /api/mfe ----------
app.get("/api/mfe", (req, res) => {
  try {
    const resultado = montarPainelAPartirDeEntrada();
    if (!resultado || resultado.registros.length === 0) {
      // fallback para dados de exemplo
      return res.json(dadosExemplo);
    }
    return res.json(resultado.registros);
  } catch (err) {
    console.error("Erro em /api/mfe:", err);
    return res.json(dadosExemplo);
  }
});

// ---------- ROTA RAIZ ----------
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// ---------- START ----------
app.listen(PORT, () => {
  console.log(`Painel MFE rodando na porta ${PORT}`);
});
