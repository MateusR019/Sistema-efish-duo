// Geracao de PDF do pedido.
import jsPDF from 'jspdf';
import type { Budget, CompanyInfo } from '../types';
import { formatDocument } from '../utils/format';
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

const loadLogoData = (() => {
  let logoPromise: Promise<string | null> | null = null;

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result?.toString() ?? '');
      reader.onerror = () => reject(new Error('Failed to read logo'));
      reader.readAsDataURL(blob);
    });

  const fetchLogo = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to load logo');
    }
    const blob = await response.blob();
    return blobToDataUrl(blob);
  };

  return () => {
    if (logoPromise) return logoPromise;
    if (typeof window === 'undefined') {
      return Promise.resolve(null);
    }
    logoPromise = (async () => {
      const candidates = [
        new URL('duo-logo.png', window.location.href).toString(),
        `${window.location.origin}/duo-logo.png`,
      ];
      for (const candidate of candidates) {
        try {
          return await fetchLogo(candidate);
        } catch {
          // try next
        }
      }
      return null;
    })();
    return logoPromise;
  };
})();

const buildPdfContent = (
  doc: jsPDF,
  budget: Budget,
  company: CompanyInfo,
  logoData: string | null,
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const rightX = pageWidth - marginX;
  const contentWidth = rightX - marginX;
  const bottomLimit = pageHeight - 18;

  const slate900 = [15, 23, 42] as const;
  const slate600 = [71, 85, 105] as const;
  const slate200 = [226, 232, 240] as const;
  const slate100 = [241, 245, 249] as const;
  const slate50 = [248, 250, 252] as const;

  let cursorY = 16;
  let logoHeight = 0;

  if (logoData) {
    const logoType = logoData.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
    const props = doc.getImageProperties(logoData);
    const logoWidth = 28;
    logoHeight = (props.height / props.width) * logoWidth;
    doc.addImage(logoData, logoType, marginX, cursorY - 6, logoWidth, logoHeight);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...slate900);
  doc.text(safe(company.logoTexto ?? company.nome), rightX, cursorY, {
    align: 'right',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...slate600);
  if (company.email) {
    doc.text(safe(company.email), rightX, cursorY + 5, { align: 'right' });
  }
  if (company.telefone) {
    doc.text(safe(company.telefone), rightX, cursorY + 10, { align: 'right' });
  }
  if (company.endereco) {
    doc.text(safe(company.endereco), rightX, cursorY + 15, { align: 'right' });
  }

  const headerHeight = Math.max(logoHeight, 18);
  cursorY += headerHeight + 6;
  doc.setDrawColor(...slate200);
  doc.line(marginX, cursorY, rightX, cursorY);
  cursorY += 8;

  doc.setFillColor(...slate50);
  doc.roundedRect(marginX, cursorY, contentWidth, 16, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...slate900);
  doc.text('Orcamento de servicos', marginX + 4, cursorY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...slate600);
  doc.text(safe(`Numero: ${budget.numeroPedido}`), rightX - 4, cursorY + 6, {
    align: 'right',
  });
  doc.text(safe(`Data: ${formatDateTime(budget.data)}`), rightX - 4, cursorY + 11, {
    align: 'right',
  });
  cursorY += 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...slate900);
  doc.text('Dados do cliente', marginX, cursorY);
  cursorY += 4;

  const clientLines = [
    `Nome: ${budget.cliente.nome}`,
    `Email: ${budget.cliente.email}`,
    `Empresa: ${budget.cliente.empresa}`,
    `Telefone: ${budget.cliente.telefone}`,
  ];
  if (budget.cliente.cnpjCpf) {
    clientLines.push(`CNPJ/CPF: ${formatDocument(budget.cliente.cnpjCpf)}`);
  }

  const clientBoxHeight = clientLines.length * 5 + 6;
  doc.setDrawColor(...slate200);
  doc.roundedRect(marginX, cursorY, contentWidth, clientBoxHeight, 3, 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...slate900);
  clientLines.forEach((line, index) => {
    doc.text(safe(line), marginX + 4, cursorY + 5 + index * 5);
  });

  cursorY += clientBoxHeight + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...slate900);
  doc.text('Itens selecionados', marginX, cursorY);
  cursorY += 4;

  const colProductX = marginX + 2;
  const colQtyX = rightX - 70;
  const colUnitX = rightX - 36;
  const colSubtotalX = rightX;
  const productWidth = colQtyX - colProductX - 4;

  const drawTableHeader = () => {
    doc.setFillColor(...slate100);
    doc.rect(marginX, cursorY, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...slate600);
    doc.text('Produto', colProductX, cursorY + 5);
    doc.text('Qtd.', colQtyX, cursorY + 5, { align: 'right' });
    doc.text('Unitario', colUnitX, cursorY + 5, { align: 'right' });
    doc.text('Subtotal', colSubtotalX, cursorY + 5, { align: 'right' });
    cursorY += 10;
    doc.setDrawColor(...slate200);
    doc.line(marginX, cursorY, rightX, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate900);
  };

  drawTableHeader();

  budget.itens.forEach((item) => {
    const productLines = doc.splitTextToSize(
      safe(item.produto.nome),
      productWidth,
    );
    const rowHeight = Math.max(productLines.length * 5, 6);
    if (cursorY + rowHeight + 6 > bottomLimit) {
      doc.addPage();
      cursorY = 20;
      drawTableHeader();
    }

    doc.text(productLines, colProductX, cursorY + 5);
    doc.text(safe(String(item.quantidade)), colQtyX, cursorY + 5, {
      align: 'right',
    });
    doc.text(safe(formatCurrency(item.produto.preco)), colUnitX, cursorY + 5, {
      align: 'right',
    });
    doc.text(safe(formatCurrency(item.subtotal)), colSubtotalX, cursorY + 5, {
      align: 'right',
    });
    cursorY += rowHeight + 4;
  });

  doc.setDrawColor(...slate200);
  doc.line(marginX, cursorY, rightX, cursorY);
  cursorY += 8;

  if (cursorY + 16 > bottomLimit) {
    doc.addPage();
    cursorY = 20;
  }

  const totalBoxWidth = 70;
  const totalBoxX = rightX - totalBoxWidth;
  doc.setFillColor(...slate900);
  doc.roundedRect(totalBoxX, cursorY, totalBoxWidth, 12, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('Total', totalBoxX + 4, cursorY + 8);
  doc.text(safe(formatCurrency(budget.total)), rightX - 4, cursorY + 8, {
    align: 'right',
  });
  doc.setTextColor(...slate900);
  cursorY += 18;

  if (budget.observacoes) {
    const textLines = doc.splitTextToSize(
      sanitizeText(budget.observacoes),
      contentWidth - 8,
    );
    const boxHeight = textLines.length * 5 + 8;
    if (cursorY + boxHeight + 10 > bottomLimit) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Observacoes', marginX, cursorY);
    cursorY += 4;
    doc.setDrawColor(...slate200);
    doc.roundedRect(marginX, cursorY, contentWidth, boxHeight, 3, 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(textLines, marginX + 4, cursorY + 5);
    cursorY += boxHeight + 8;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slate600);
  doc.text(
    'Documento gerado automaticamente. Em caso de duvidas, responda este e-mail.',
    marginX,
    pageHeight - 10,
  );
};

export const createBudgetPdf = async ({
  budget,
  company,
}: GeneratePdfParams) => {
  const doc = new jsPDF();

  doc.setFont('helvetica', 'normal');

  const logoData = await loadLogoData();
  buildPdfContent(doc, budget, company, logoData);
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
