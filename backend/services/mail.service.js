const nodemailer = require("nodemailer");

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: Number(SMTP_PORT) === 465,
  ...(SMTP_USER && SMTP_PASSWORD ? { auth: { user: SMTP_USER, pass: SMTP_PASSWORD } } : {})
});

async function sendOrderConfirmation({ to, orderId, items, totalPrice }) {
  if (!to) {
    throw new Error("Missing recipient email address");
  }

  const textItems = items
    .map(
      (item) => `- ${item.name || `Produkt ${item.product_id}`} x${item.quantity}: ${Number(item.price_at_purchase).toFixed(2)} €`
    )
    .join("\n");

  const message = {
    from: SMTP_FROM || "no-reply@webshop.local",
    to,
    subject: `Ihre Bestellbestätigung #${orderId}`,
    text: `Vielen Dank für Ihren Einkauf!\n\nBestellnummer: ${orderId}\n\nArtikel:\n${textItems}\n\nGesamtpreis: ${Number(totalPrice).toFixed(2)} €\n\nWir wünschen Ihnen viel Freude mit Ihrer Bestellung.\n\nIhr Webshop-Team`
  };

  return transporter.sendMail(message);
}

module.exports = {
  sendOrderConfirmation
};
