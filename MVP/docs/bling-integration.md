# Integração com Bling

Use este passo a passo para enviar os orçamentos como pedidos de rascunho no Bling.

## 1. Criar credenciais
1. Acesse o painel do Bling como administrador.
2. Vá em **Preferências → Integrações → API**.
3. Crie uma nova aplicação (ou gere uma API Key, se sua conta ainda suporta).
   - **API Key:** copie o token exibido.
   - **OAuth2:** anote `client_id`, `client_secret` e configure um `redirect_uri`. Depois troque pelo token de acesso.

> No backend deste projeto, basta colocar o token em `BLING_API_TOKEN` (arquivo `server/.env`). Se optar por OAuth, crie um job que renove o token e exponha-o para o serviço.

## 2. Configurar o backend
1. No diretório `server/`, abra `.env` e defina:
   ```
   BLING_API_TOKEN=seu_token
   BLING_API_URL=https://www.bling.com.br/Api/v3/pedidos
   ```
2. Use o serviço `sendOrderToBling` (`server/src/services/blingService.ts`) para enviar o pedido. Ele já monta o payload com cliente, itens e observações.

## 3. Expor um endpoint interno
1. Crie uma rota (ex.: `POST /api/bling/orders`) que receba o orçamento do frontend.
2. Nessa rota, chame `sendOrderToBling` passando o objeto do pedido.
3. Retorne para o frontend se deu certo ou não.

## 4. Configurar o frontend
1. No `.env` da raiz, defina `VITE_BLING_WEBHOOK_URL` apontando para o endpoint do seu backend (por exemplo, `http://localhost:4000/api/bling/orders`).
2. No resumo do pedido (`/resumo`), use o novo botão “Enviar para o Bling”. Ele dispara uma requisição `POST` para esse endpoint com os dados do orçamento.

Com isso, cada orçamento pode ser enviado manualmente ao Bling, enquanto o botão padrão continua enviando por e-mail via EmailJS.
