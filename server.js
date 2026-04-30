const express = require("express");
const cors = require("cors");

// Mercado Pago SDK nova
const { MercadoPagoConfig, Preference } = require("mercadopago");

const app = express();

app.use(express.json());
app.use(cors());

// 🔑 SEU TOKEN (recomendado depois mover pra .env)
const client = new MercadoPagoConfig({
  accessToken: "APP_USR-3489663102794585-042921-c651502865c786f57c0ce2e78df7a64a-3369421766"
});

const preferenceClient = new Preference(client);

// 🔥 ROTA DE PAGAMENTO
app.post("/criar-pagamento", async (req, res) => {
  try {
    const { pacote, email } = req.body;

    let valor = 0;

    if (pacote === "Básico") valor = 5;
    if (pacote === "Premium") valor = 12;
    if (pacote === "Ultra") valor = 20;

    // cria preferência no Mercado Pago
    const response = await preferenceClient.create({
    body: {
        items: [
        {
            title: `Pacote ${pacote}`,
            unit_price: Number(valor),
            quantity: 1
        }
        ],
        payer: {
        email: email
        },
        back_urls: {
        success: "https://packfigurinhaultra.netlify.app/?status=approved",
        failure: "https://packfigurinhaultra.netlify.app/?status=failure",
        pending: "https://packfigurinhaultra.netlify.app/?status=pending"
        }
    }
    });

    // 🔥 ESSENCIAL: responder pro frontend
    res.json({
      id: response.id,
      init_point: response.init_point
    });

  } catch (error) {
    console.error("ERRO AO CRIAR PAGAMENTO:", error);
    res.status(500).json({
      error: "Erro ao criar pagamento"
    });
  }
});

// 🚀 START SERVER
app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});