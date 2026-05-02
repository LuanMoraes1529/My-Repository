const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { MercadoPagoConfig, Preference } = require("mercadopago");
const pagamentosAprovados = new Set();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

const preferenceClient = new Preference(client);

// =======================
// CRIAR PAGAMENTO
// =======================
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
            quantity: 1,
            currency_id: "BRL"
          }
        ],
        payer: {
          email: email
        },

        external_reference: JSON.stringify({
        email: email,
        pacote: pacote
      }),

        payment_methods: {
          installments: 1
        },
        notification_url: "https://figurinhas-api.onrender.com/webhook",
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
// =======================
// DOWNLOAD PROTEGIDO
// =======================
app.get("/download", (req, res) => {
  const email = req.query.email;

  if (!email || !pagamentosAprovados.has(email)) {
    return res.status(403).send("Acesso negado");
  }

  res.download("pack.zip");
});
// =======================
// WEBHOOK
// =======================
app.post("/webhook", async (req, res) => {
  try {
    const data = req.body;

    console.log("Webhook recebido:", data);

    if (data.topic === "merchant_order") {
      
      const merchantOrder = await axios.get(data.resource, {
  headers: {
    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
  }
});

      const order = merchantOrder.data;

      // pega o primeiro pagamento aprovado
      const pagamento = order.payments.find(p => p.status === "approved");

      if (!pagamento) {
        return res.sendStatus(200);
      }
      const response = await axios.get(
    `https://api.mercadopago.com/v1/payments/${pagamento.id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
          }
        }
      );

      const payment = response.data;

  if (payment.status === "approved") {

    let email = null;
    let pacote = null;

    const rawRef = payment.external_reference;

    // 🔍 LOG PRA VER O QUE ESTÁ VINDO
    console.log("External Reference RAW:", rawRef);

    try {
      const ref = JSON.parse(rawRef);
      email = ref.email;
      pacote = ref.pacote;
    } catch (e) {
      console.log("Não é JSON, tentando como string simples");

      // fallback caso seja só o email
      if (typeof rawRef === "string" && rawRef.includes("@")) {
        email = rawRef;
      }
    }

    if (!email) {
      console.log("❌ Email não encontrado");
      return res.sendStatus(200);
    }
    pagamentosAprovados.add(email);


    const link = `https://figurinhas-api.onrender.com/download?email=${email}`;

    await axios.post("https://api.emailjs.com/api/v1.0/email/send", {
      service_id: "Luan_moraes1529",
      template_id: "template_ci75rde",
      user_id: "yd1DK2O1sQ9DDwBL9",
      accessToken: process.env.EMAILJS_PRIVATE_KEY,
      template_params: {
        email: email,
        pacote: pacote,
        link: link
      }
    });

    console.log("✅ Email enviado para:", email);
  }
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ Erro no webhook:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});