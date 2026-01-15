import jsPDF from 'jspdf';
import type { Budget, CompanyInfo } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';

type GeneratePdfParams = {
  budget: Budget;
  company: CompanyInfo;
};

const sanitizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '');

const safe = (value: string | undefined | null) =>
  value ? sanitizeText(String(value)) : '';

const buildPdfContent = (doc: jsPDF, budget: Budget, company: CompanyInfo) => {
  let cursorY = 20;

  doc.setFontSize(18);
  doc.text(safe(company.logoTexto ?? company.nome), 14, cursorY);
  doc.setFontSize(11);
  doc.text(safe(company.email), 14, cursorY + 6);
  doc.text(safe(company.telefone), 14, cursorY + 12);
  if (company.endereco) {
    doc.text(safe(company.endereco), 14, cursorY + 18);
  }

  cursorY += 30;

  doc.setFontSize(16);
  doc.text('Orcamento de servicos', 14, cursorY);
  doc.setFontSize(11);
  doc.text(safe(`Numero: ${budget.numeroPedido}`), 14, cursorY + 6);
  doc.text(safe(`Data: ${formatDateTime(budget.data)}`), 14, cursorY + 12);

  cursorY += 24;
  doc.setFontSize(13);
  doc.text('Dados do cliente', 14, cursorY);
  doc.setFontSize(10);
  doc.text(safe(`Nome: ${budget.cliente.nome}`), 14, cursorY + 6);
  doc.text(safe(`Email: ${budget.cliente.email}`), 14, cursorY + 12);
  doc.text(safe(`Empresa: ${budget.cliente.empresa}`), 14, cursorY + 18);
  doc.text(safe(`Telefone: ${budget.cliente.telefone}`), 14, cursorY + 24);
  if (budget.cliente.cnpjCpf) {
    doc.text(safe(`CNPJ/CPF: ${budget.cliente.cnpjCpf}`), 14, cursorY + 30);
    cursorY += 12;
  }

  cursorY += 36;
  doc.setFontSize(13);
  doc.text('Itens selecionados', 14, cursorY);
  cursorY += 4;

  doc.setFontSize(10);
  doc.text('Produto', 14, cursorY + 6);
  doc.text('Qtd.', 110, cursorY + 6);
  doc.text('Unitario', 140, cursorY + 6);
  doc.text('Subtotal', 180, cursorY + 6);
  cursorY += 10;
  doc.line(14, cursorY, 196, cursorY);

  budget.itens.forEach((item) => {
    cursorY += 8;
    if (cursorY > 270) {
      doc.addPage();
      cursorY = 20;
    }
    doc.text(safe(item.produto.nome), 14, cursorY);
    doc.text(safe(String(item.quantidade)), 110, cursorY);
    doc.text(safe(formatCurrency(item.produto.preco)), 140, cursorY, {
      align: 'right',
    });
    doc.text(safe(formatCurrency(item.subtotal)), 196, cursorY, {
      align: 'right',
    });
  });

  cursorY += 12;
  doc.line(14, cursorY, 196, cursorY);
  cursorY += 8;
  doc.setFontSize(12);
  doc.text('Total do orcamento:', 120, cursorY);
  doc.text(safe(formatCurrency(budget.total)), 196, cursorY, {
    align: 'right',
  });

  if (budget.observacoes) {
    cursorY += 16;
    doc.setFontSize(11);
    doc.text('Observacoes:', 14, cursorY);
    const textLines = doc.splitTextToSize(
      sanitizeText(budget.observacoes),
      180,
    );
    doc.text(textLines, 14, cursorY + 6);
  }

  cursorY += 24;
  doc.setFontSize(10);
  doc.text(
    'Documento gerado automaticamente. Em caso de duvidas, responda este e-mail.',
    14,
    cursorY,
  );
};

export const createBudgetPdf = async ({
  budget,
  company,
}: GeneratePdfParams) => {
  const doc = new jsPDF();

  doc.setFont('helvetica', 'normal');

  buildPdfContent(doc, budget, company);
  return doc;
};

export const downloadBudgetPdf = async (params: GeneratePdfParams) => {
  const doc = await createBudgetPdf(params);
  const filename = `Orcamento-${params.budget.numeroPedido}.pdf`;
  const saveResult = (doc.save as unknown as (
    name?: string,
    options?: { returnPromise?: boolean },
  ) => Promise<void> | void);

  const maybePromise = saveResult.call(doc, filename, { returnPromise: true });
  if (maybePromise instanceof Promise) {
    await maybePromise;
  }
  return doc;
};
