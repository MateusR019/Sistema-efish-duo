# Sistema de Orcamento MVP

Aplicacao web responsiva onde clientes preenchem seus dados, escolhem servicos de um catalogo, revisam o orcamento, geram um PDF e enviam tudo por email.

## Funcionalidades principais
- Tela de login/cadastro simples (dados no localStorage) liberando o catalogo somente apos autenticacao.
- Credenciais sao armazenadas com hash SHA-256 (via Web Crypto) e administradores sao marcados explicitamente.
- Formulario de identificacao com validacoes basicas.
- Tela de perfil para revisar/editar dados.
- Catalogo com busca, filtro por categoria, cards com CTA, imagem/placeholder e painel lateral do orcamento.
- Ajuste de quantidades, remocao de itens e calculo automatico de totais.
- Tela de revisao com observacoes, geracao de PDF (jsPDF) e envio por EmailJS com anexo.
- Feedback visual de sucesso/erro e redirecionamento apos finalizar.
- Tela "Adicionar produto" com upload ou URL de imagem (somente administradores).
- PDF utiliza fonte Roboto embarcada para suportar acentos/UTF-8.

## Perfis e permissoes
- Qualquer usuario autenticado consegue montar orcamentos (as senhas nunca sao salvas em texto puro).
- Apenas o administrador cujo email contenha `mateusrogerio777` visualiza o botao **Adicionar produto** e acessa `/produtos/novo` (flag salva no cadastro).
- Tentativas de acessar a rota sem ser admin redirecionam para o catalogo.

## Stack
- React + Vite + TypeScript
- React Router
- Tailwind CSS
- jsPDF
- EmailJS

## Backend local
Para centralizar usuarios, produtos e orcamentos existe uma API Node/Express em `server/` (armazenamento em arquivo JSON por enquanto, ideal para rodar local e expor via tunel). Passos:
```bash
cd server
npm install
npm run dev
```
Variaveis suportadas (`server/.env`):
```env
PORT=4000
JWT_SECRET=super-secret-key
ADMIN_EMAILS=mateusrogerio777@example.com
DATA_FILE=./data/database.json
```
Endpoints basicos:
- `POST /api/auth/register` e `POST /api/auth/login` retornam token JWT.
- `GET /api/products` e `POST /api/products` (admin) centralizam o catalogo.
- `POST /api/orders` registra pedidos do cliente e `GET /api/orders` lista para admins.
Use `npm run build && npm start` dentro de `server` para subir em modo producao no host local que sera exposto via tunel.

## Como executar
```bash
npm install
npm run dev
```
Acesse http://localhost:5173.

Build de producao:
```bash
npm run build
```

## Configuracao obrigatoria
1. **Informacoes da empresa**: editar `src/config/company.ts` com nome, email, telefone, endereco/logo textual.
2. **Administradores**: liste os e-mails autorizados em `src/config/auth.ts`. Apenas os enderecos definidos ali enxergam o fluxo de novos produtos. Adicione, remova ou ajuste conforme o time interno.
3. **EmailJS**:
   - Crie um servico e um template.
   - No template, inclua variaveis como `order_number`, `order_total`, `items`, `client_name`, `observations`.
   - Cadastre um attachment vazio para habilitar anexos e mapeie a variavel `attachments`.
   - Crie `.env` na raiz:
     ```env
     VITE_EMAILJS_SERVICE_ID=seu_service_id
     VITE_EMAILJS_TEMPLATE_ID=seu_template_id
     VITE_EMAILJS_PUBLIC_KEY=sua_public_key
     ```
   - Reinicie `npm run dev`.
4. **Envio para Bling (opcional)**: configure o endpoint que irá receber o orçamento via `VITE_BLING_WEBHOOK_URL` no `.env`. Esse endpoint deve aceitar um `POST` com os dados do pedido e encaminhar para a API do Bling.
5. **Dados sensiveis**: abra o arquivo `Dados` na raiz e complete as pendencias listadas.

## Fluxo sugerido
1. Usuario se cadastra/loga.
2. Cliente preenche a identificacao.
3. Revisa o perfil.
4. Navega pelo catalogo e adiciona servicos.
5. (Opcional) Admin adiciona novos produtos com fotos.
6. Revisa o pedido, adiciona observacoes e escolhe entre baixar PDF ou enviar automaticamente.

## Adicionar novos produtos com fotos (apenas admin)
- Clique em **Adicionar produto** apos logar como administrador.
- Informe nome, descricao, preco e selecione/registre uma categoria.
- Preencha URL de imagem ou envie um arquivo (armazenado em Base64 no navegador).
- Salve para disponibilizar imediatamente no catalogo local.

## Converter sua tabela para `src/data/produtos.json`
1. Exporte a tabela (Excel/Sheets) para CSV com colunas `nome,descricao,preco,categoria,imagem`.
2. Rode:
   ```bash
   node -e "const fs=require('fs');const [,,file]=process.argv;const data=fs.readFileSync(file,'utf8').trim().split(/\r?\n/);const [header,...rows]=data;const cols=header.split(',');const items=rows.map((row,i)=>{const values=row.split(',');const obj={};cols.forEach((col,idx)=>obj[col.trim()]=values[idx]?.trim());return {id:`prd-${String(i+1).padStart(3,'0')}`,nome:obj.nome,descricao:obj.descricao,preco:Number(obj.preco),categoria:obj.categoria||undefined,imagem:obj.imagem||undefined};});fs.writeFileSync('src/data/produtos.json',JSON.stringify(items,null,2));" caminho/do/arquivo.csv
   ```
3. Verifique o JSON e ajuste valores/acentos se necessario.
4. Execute `npm run validate:assets` para garantir que todas as imagens referenciadas existem em `public/pre_order_imagens`.
5. Reinicie o servidor para carregar o novo catalogo.

## Scripts auxiliares
- `npm run validate:assets`: confere se cada entrada `imagem/imagens` em `src/data/produtos.json` possui arquivo correspondente em `public/pre_order_imagens`.

## Tratamento de estados
- Cliente, carrinho, observacoes, autenticacao e produtos customizados ficam no `localStorage`. As senhas sao salvas com hash e o flag de administrador faz parte do registro do usuario.
- Ao fazer logout o carrinho/dados sao limpos, mas os produtos customizados permanecem neste navegador (MVP).

## Proximos passos (opcionais)
- Persistir autenticacao e catalogo em backend real.
- Enviar email de confirmacao para o cliente.
- Adicionar preview do PDF antes do download.
- Criar painel interno para acompanhar orcamentos.
