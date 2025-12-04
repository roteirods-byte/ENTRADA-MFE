// server.js
// Servidor do Painel MFE Posicional
// - Serve o index.html
// - Rota GET /api/mfe lendo o entrada.json real (POSICIONAL)
//   e convertendo para o formato do painel.

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 8082;

// Caminho do JSON já gerado pela automação antiga (blindada)
const ENTRADA_PATH =
  "/home/roteiro_ds/autotrader-planilhas-python/data/entrada.json";

// ---------- DADOS DE EXEMPLO (fallback) ----------
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
    preco: 0.62,
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

// ---------- CLASSIFICAÇÕES AUXILIARES ----------

// Universo alvo (50 moedas) – pode ser ajustado depois no backend
const UNIVERSO_50 = [
  "AAVE", "ADA", "APE", "APT", "ARB", "ATOM", "AVAX", "AXS", "BCH", "BNB",
  "BTC", "CHZ", "DOGE", "DOT", "ETH", "FET", "FIL", "FLUX", "FTM", "GALA",
  "GRT", "ICP", "INJ", "LDO", "LINK", "LTC", "MANA", "NEAR", "OP", "PEPE",
  "POL", "RNDR", "RUNE", "SAND", "SEI", "SHIB", "SOL", "STX", "SUI",
  "TIA", "TNSR", "TON", "TRX", "UNI", "WIF", "XLM", "XRP", "ZEC",
];

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
  if (ganho < 3) return "AMARELA"; // pouco ganho
  if (ganho <= 8) return "VERDE"; // zona ideal
  return "VERMELHA"; // muito agressivo
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

  // Se assertividade vier baixa, derruba prioridade
  if (typeof assertPct === "number" && assertPct < 65) {
    prioridade = "BAIXA";
  }

  return prioridade;
}

// Monta dados do painel a partir do entrada.json POSICIONAL
function montarPainelAPartirDeEntrada() {
  if (!fs.existsSync(ENTRADA_PATH)) {
    return null;
  }

  const raw = fs.readFileSync(ENTRADA_PATH, "utf-8");
  const json = JSON.parse(raw);

  // Estrutura esperada: { swing: [...], posicional: [...], ultima_atualizacao: "..." }
  const listaPosicional = Array.isArray(json.posicional) ? json.posicional : [];

  const saida = [];

  // Garante ordem pelo universo alvo (quando estiver completo com as 50)
  for (const par of UNIVERSO_50) {
    const item = listaPosicional.find((x) => x.par === par);
    if (!item) continue;

    // Esconde NAO_ENTRAR – só LONG/SHORT aparecem no painel
    if (item.side === "NAO_ENTRAR") continue;

    const risco = classificarRisco(item.par);
    const zona = classificarZona(item.ganho_pct || 0);
    const prioridade = classificarPrioridade(
      item.side,
      item.ganho_pct || 0,
      risco,
      item.assert_pct
    );

    saida.push({
      par: item.par,
      side: item.side,
      preco: item.preco,
      alvo: item.alvo, // já vem da automação MFE de entrada
      ganho_pct: item.ganho_pct,
      zona,
      risco,
      prioridade,
      data: item.data,
      hora: item.hora,
    });
  }

  // Se por algum motivo o universo de 50 ainda não estiver completo,
  // inclui qualquer moeda extra que tenha sinal POSICIONAL
  for (const item of listaPosicional) {
    if (
      !UNIVERSO_50.includes(item.par) &&
      item.side !== "NAO_ENTRAR"
    ) {
      const risco = classificarRisco(item.par);
      const zona = classificarZona(item.ganho_pct || 0);
      const prioridade = classificarPrioridade(
        item.side,
        item.ganho_pct || 0,
        risco,
        item.assert_pct
      );

      saida.push({
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
      });
    }
  }

  return {
    registros: saida,
    ultima_atualizacao: json.ultima_atualizacao || null,
  };
}

// ---------- MIDDLEWARES BÁSICOS ----------
app.use(express.json());

// Servir arquivos estáticos da raiz (index.html)
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
