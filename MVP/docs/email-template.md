# EmailJS Template (`template_k92m6oe`)

Guia para configurar o template no painel do EmailJS.

## Assunto
```
Orcamento {{order_number}} - {{client_name}}
```

## Corpo (HTML)
```html
<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; color: #0f172a;">
  <tr>
    <td>
      <h2>Olá, {{client_name}}!</h2>
      <p>Recebemos o seu pedido e já montamos o orçamento abaixo.</p>

      <h3>Resumo</h3>
      <ul>
        <li><strong>Número:</strong> {{order_number}}</li>
        <li><strong>Total:</strong> {{order_total}}</li>
      </ul>

      <h3>Itens</h3>
      <pre style="background:#f8fafc;padding:12px;border-radius:8px;font-family:'Courier New',monospace;">{{items}}</pre>

      <h3>Observações</h3>
      <p>{{observations}}</p>

      <p>
        Qualquer dúvida responda este e-mail ou chame no WhatsApp
        <strong>(11) 99788-7652</strong>.
      </p>
      <p>Atenciosamente,<br />% Duo International</p>
    </td>
  </tr>
</table>
```

## Corpo (Texto)
```
Olá, {{client_name}}!

Número: {{order_number}}
Total: {{order_total}}

Itens:
{{items}}

Observações:
{{observations}}

Qualquer dúvida responda este e-mail ou chame no WhatsApp (11) 99788-7652.
% Duo International
```

> No painel, mantenha **To email** e **Reply To** como `{{client_email}}`. Use `atendimento@efish.com.br` em Bcc caso queira receber cópia. Nenhum campo usa `order_date`, então não há variáveis faltantes no payload.
