import nodemailer from "nodemailer";
import { convert } from "html-to-text";

export const sendEmail = async (to: string, subject: string, html: string) => {
  const transporter = nodemailer.createTransport({
    host: "mail.eesast.com",
    port: 587,
    secure: false, // will actually use TLS
    auth: {
      user: process.env.NO_REPLY_EMAIL,
      pass: process.env.NO_REPLY_PASS,
    },
    dkim: {
      domainName: "eesast.com",
      keySelector: "mail",
      privateKey: process.env.DKIM_KEY!,
    },
  });

  const info = await transporter.sendMail({
    from: "EESAST <noreply@eesast.com>",
    to,
    subject,
    text: convert(html),
    html,
  });

  console.log("Email %s sent to %s", info.messageId, to);
};
