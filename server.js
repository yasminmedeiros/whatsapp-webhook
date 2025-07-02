/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT } = process.env;


app.post("/webhook", async (req, res) => {
  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  const message = value?.messages?.[0];
  const contact = value?.contacts?.[0];

  if (message?.type === "text") {
    const senderPhoneNumber = contact?.wa_id || message.from; // número do usuário
    const senderName = contact?.profile?.name || "Desconhecido";
    const messageText = message.text?.body;

    console.log("📩 Nova mensagem recebida:");
    console.log("🧾 Texto:", messageText);
    console.log("📱 Número:", senderPhoneNumber);
    console.log("👤 Nome:", senderName);

    // Se quiser responder de verdade
    const phoneNumberId = value.metadata.phone_number_id;

    await axios.post(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: senderPhoneNumber,
        text: { body: `Olá, ${senderName}! Você disse: "${messageText}"` },
      },
      {
        headers: {
          Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        },
      }
    );

    // Marcar a mensagem como lida
    await axios.post(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: message.id,
      },
      {
        headers: {
          Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        },
      }
    );
  }

  res.sendStatus(200);
});

// accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // check the mode and token sent are correct
  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    // respond with 200 OK and challenge token from the request
    res.status(200).send(challenge);
    console.log("Webhook verified successfully!");
  } else {
    // respond with '403 Forbidden' if verify tokens do not match
    res.sendStatus(403);
  }
});

app.get("/", (req, res) => {
  res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});

app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});
