# Integração Bling – checklist de dados e acessos necessários

Para ligar o MVP ao Bling (pedidos, estoque, clientes e faturamento), preciso que você preencha ou confirme os itens abaixo.

## Autenticação e ambiente
- Token/API Key do Bling (formato exato de uso: header `Authorization: Bearer ...` ou `apikey=...` na URL).
- Ambiente que vamos usar para testes (produção mesmo? há sandbox?).
- Limites de rate e restrições conhecidas (se houver).

## URLs e rotas
- Endpoint base da API (ex.: `https://bling.com.br/Api/v3`).
- Endpoints confirmados que usaremos:
  - Criar pedido de venda.
  - Buscar/atualizar produto.
  - Consultar/atualizar estoque (se for outro endpoint).
  - Criar/consultar cliente/contato.
  - Gerar cobrança/boleto (se for por API).

## Produtos e estoque
- Qual identificador usar no Bling para casar com nosso catálogo? (código/SKU ou ID gerado pelo Bling).
- Se o preço deve vir do Bling ou permanecer o do nosso catálogo.
- Regra de estoque: puxar saldo do Bling e só permitir reservar se houver quantidade? Devo lançar baixa de estoque ao criar pedido?
- Categorias: precisamos manter categorias/variantes iguais às do Bling?

## Clientes
- Campos obrigatórios para criar/associar cliente: nome, email, telefone, CNPJ/CPF, inscrição estadual, endereço completo (rua, número, bairro, cidade, UF, CEP).
- Alguma validação específica (ex.: sempre usar CNPJ para PJ, CPF para PF)?
- Como identificar cliente existente: por email, CNPJ/CPF ou ID do Bling?

## Pedidos/orçamentos
- Status desejado ao criar pedido no Bling (ex.: rascunho/aberto/aguardando faturamento).
- Campos adicionais que precisam ser enviados (transportadora, frete, observações padrão).
- Algum campo livre/observação fixa para identificar que veio do site?
- Referência numérica: podemos usar nosso `orderNumber` como `numero`/`numeroLoja`?

## Cobrança/Boleto (se for usar)
- Endpoint e formato para gerar boleto/PIX via Bling.
- Campos obrigatórios (vencimento, multa/juros, instruções).
- Precisamos armazenar URL/linha digitável de retorno?

## Webhooks (retorno do Bling)
- URL que vamos expor para receber webhooks de status de pedido/faturamento/estoque.
- Como o Bling assina ou autentica webhook? (token secreto/cabecalho de verificação).
- Eventos que devemos ouvir (ex.: pedido faturado, nota emitida, estoque atualizado).

## Anexos/PDF
- Devemos enviar um PDF de orçamento junto ao pedido? Se sim, existe campo específico ou apenas observação/link?

## Dados de teste
- Um produto de teste válido no Bling (código/SKU) e quantidade em estoque.
- Um cliente de teste (com CNPJ/CPF) para evitarmos poluir base real.
- Exemplo de payload aceito para pedido/cliente/estoque (se tiver).

Preencha este arquivo com os valores/decisões para seguirmos com a implementação.***
