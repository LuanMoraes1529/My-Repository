const express = require("express");
const cors = require("cors");
const { MercadoPagoConfig, Preference } = require("mercadopago");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
          quantity: 1,
          currency_id: "BRL"
        }
      ],
      payer: {
        email: email
      },
      payment_methods: {
        installments: 1
      },
      notification_url: "https://figurinhas-api.onrender.com/webhook", // 👈 ESSA LINHA
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
const axios = require("axios");

app.post("/webhook", async (req, res) => {
  try {
    const data = req.body;

    console.log("Webhook recebido:", data);

    // Verifica se é notificação de pagamento
    if (data.type === "payment") {
      const paymentId = data.data.id;

      // Consulta o pagamento no Mercado Pago
      const response = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
          }
        }
      );

      const payment = response.data;

      // Só envia email se estiver aprovado
      if (payment.status === "approved") {

        const email = payment.payer.email;

        // Defina o pacote e link manualmente (teste inicial)
        const pacote = "Premium";
        const link = "https://seulink.com";

        // Enviar email via EmailJS
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