const express = require("express");
const cors = require("cors");
const { MercadoPagoConfig, Preference } = require("mercadopago");

const app = express();

app.use(express.json());
app.use(cors());

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

const preferenceClient = new Preference(client);

app.post("/criar-pagamento", async (req, res) => {
  try {
    const { pacote, email } = req.body;

    if (!pacote || !email) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const valores = {
      "Básico": 5,
      "Premium": 12,
      "Ultra": 20
    };

    const valor = valores[pacote];

    if (!valor) {
      return res.status(400).json({ error: "Pacote inválido" });
    }

    const response = await preferenceClient.create({
      body: {
        items: [
          {
            title: `Pacote ${pacote}`,
            unit_price: valor,
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
        },
        auto_return: "approved"
      }
    });

    res.json({
      id: response.id,
      init_point: response.init_point
    });

  } catch (error) {
    console.error("ERRO AO CRIAR PAGAMENTO:", error);
    res.status(500).json({ error: "Erro ao criar pagamento" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});