// Sebi
const nodemailer = require("nodemailer");

let transporter;

function getMailTransporter() {
  if (!transporter) {
    const smtpUser = process.env.SMTP_USER || undefined;
    const smtpPassword = process.env.SMTP_PASSWORD || undefined;

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "maildev",
      port: Number(process.env.SMTP_PORT || 1025),
      secure: process.env.SMTP_SECURE === "true",
      auth: smtpUser && smtpPassword ? { user: smtpUser, pass: smtpPassword } : undefined
    });
  }

  return transporter;
}

function getMailFrom() {
  return process.env.SMTP_FROM || "no-reply@webshop.local";
}

async function sendMail({ to, subject, text, html }) {
  await getMailTransporter().sendMail({
    from: getMailFrom(),
    to,
    subject,
    text,
    html
  });
}

module.exports = {
  sendMail
};
