const formidable = require('formidable');
const fs = require('fs');
const nodemailer = require('nodemailer');

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const form = formidable({ maxFileSize: 5 * 1024 * 1024, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(400).json({ error: 'Não consegui processar o formulário: ' + err.message });
      return;
    }

    const get = (v) => String((Array.isArray(v) ? v[0] : v) || '').trim();
    const nome = get(fields.nome);
    const local = get(fields.local);
    const preferencia = get(fields.preferencia);
    const whatsapp = get(fields.whatsapp);
    const email = get(fields.email);

    if (!nome || !local) {
      res.status(400).json({ error: 'Preencha nome e local da obra.' });
      return;
    }

    const arquivo = Array.isArray(files.arquivo) ? files.arquivo[0] : files.arquivo;
    const anexos = [];
    if (arquivo && arquivo.size > 0) {
      anexos.push({
        filename: arquivo.originalFilename || 'anexo',
        content: fs.readFileSync(arquivo.filepath),
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      await transporter.sendMail({
        from: `"Construtora Fowles" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        subject: 'Novo Pedido de Orçamento - ' + nome,
        html: `
          <h2>Novo Pedido de Orçamento</h2>
          <p><strong>Nome:</strong> ${esc(nome)}</p>
          <p><strong>Local da Obra:</strong> ${esc(local)}</p>
          <p><strong>Preferência de Contato:</strong> ${esc(preferencia)}</p>
          <p><strong>WhatsApp:</strong> ${esc(whatsapp)}</p>
          <p><strong>E-mail:</strong> ${esc(email)}</p>
        `,
        attachments: anexos,
      });

      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Erro ao enviar: ' + e.message });
    }
  });
}

handler.config = { api: { bodyParser: false } };
module.exports = handler;
