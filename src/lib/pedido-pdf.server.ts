import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Item = { nome: string; preco: number; quantidade: number };

type ConfigEmpresa = {
  nome_empresa?: string | null;
  logo_url?: string | null;
  cor_header?: string | null;
  rodape_texto?: string | null;
  rodape_cnpj?: string | null;
  rodape_endereco?: string | null;
  rodape_email?: string | null;
  rodape_telefone?: string | null;
};

export type PedidoPdfInput = {
  numero: string;
  cliente: {
    nome: string;
    telefone: string;
    email?: string;
    endereco?: string;
    cidade?: string;
    cep?: string;
    observacoes?: string;
  };
  itens: Item[];
  total: number;
};

const BUCKET = "pedidos-pdf";

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function hexToRgb(hex?: string | null): { r: number; g: number; b: number } {
  const fallback = { r: 57 / 255, g: 124 / 255, b: 47 / 255 }; // #397c2f
  if (!hex) return fallback;
  const m = /^#?([a-f\d]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
}

function drawWrapped(
  page: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: any,
  size: number,
  color: any,
  lineHeight = 1.25,
): number {
  const words = text.split(/\s+/);
  let line = "";
  let cy = y;
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      page.drawText(line, { x, y: cy, size, font, color });
      cy -= size * lineHeight;
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) {
    page.drawText(line, { x, y: cy, size, font, color });
    cy -= size * lineHeight;
  }
  return cy;
}

async function fetchLogoBytes(url: string): Promise<{ bytes: Uint8Array; kind: "png" | "jpg" } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    const buf = new Uint8Array(await res.arrayBuffer());
    if (ct.includes("png") || url.toLowerCase().endsWith(".png")) return { bytes: buf, kind: "png" };
    if (ct.includes("jpeg") || ct.includes("jpg") || /\.jpe?g$/i.test(url)) return { bytes: buf, kind: "jpg" };
    return { bytes: buf, kind: "png" };
  } catch {
    return null;
  }
}

export async function gerarESalvarPedidoPdf(input: PedidoPdfInput): Promise<string | null> {
  const { data: cfg } = await supabaseAdmin
    .from("configuracoes_empresa")
    .select(
      "nome_empresa, logo_url, cor_header, rodape_texto, rodape_cnpj, rodape_endereco, rodape_email, rodape_telefone",
    )
    .limit(1)
    .maybeSingle();

  const config = (cfg || {}) as ConfigEmpresa;

  let bytes: Uint8Array;
  try {
    bytes = await gerarPdfComPdfLib(input, config);
  } catch (e) {
    console.error("[pedido-pdf] pdf-lib falhou, usando PDF simples:", e);
    bytes = gerarPdfSimples(input, config);
  }

  const path = `${input.numero}.pdf`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) {
    console.error("[pedido-pdf] upload falhou:", upErr);
    return null;
  }

  // Bucket é privado — sempre gerar signed URL (public URL retornaria 404 "Bucket not found").
  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signErr) {
    console.error("[pedido-pdf] signed url falhou:", signErr);
    return null;
  }
  return signed?.signedUrl ?? null;
}

async function gerarPdfComPdfLib(input: PedidoPdfInput, config: ConfigEmpresa): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const header = hexToRgb(config.cor_header);
  const headerColor = rgb(header.r, header.g, header.b);
  const headerColorDark = rgb(header.r * 0.75, header.g * 0.75, header.b * 0.75);
  const textDark = rgb(0.12, 0.14, 0.12);
  const textMuted = rgb(0.42, 0.45, 0.42);
  const lineSoft = rgb(0.88, 0.9, 0.88);
  const zebraBg = rgb(0.965, 0.98, 0.965);
  const white = rgb(1, 1, 1);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const marginX = 40;

  // ============ HEADER ============
  const headerH = 120;
  page.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: headerColor });
  // Thin dark strip on bottom of header
  page.drawRectangle({ x: 0, y: height - headerH - 3, width, height: 3, color: headerColorDark });

  // Logo (centered vertically on left). No fallback store-name text — logo já representa a marca.
  if (config.logo_url) {
    const asset = await fetchLogoBytes(config.logo_url);
    if (asset) {
      try {
        const img =
          asset.kind === "png" ? await pdf.embedPng(asset.bytes) : await pdf.embedJpg(asset.bytes);
        const maxH = 78;
        const maxW = 220;
        const scale = Math.min(maxH / img.height, maxW / img.width);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, {
          x: marginX,
          y: height - headerH / 2 - h / 2,
          width: w,
          height: h,
        });
      } catch {
        /* ignore */
      }
    }
  }

  // Right header block
  const rightLabel = "COMPROVANTE DE PEDIDO";
  const rightLabelW = fontBold.widthOfTextAtSize(rightLabel, 11);
  page.drawText(rightLabel, {
    x: width - marginX - rightLabelW,
    y: height - 42,
    size: 11,
    font: fontBold,
    color: white,
  });
  const numTxt = input.numero;
  const numW = fontBold.widthOfTextAtSize(numTxt, 22);
  page.drawText(numTxt, {
    x: width - marginX - numW,
    y: height - 72,
    size: 22,
    font: fontBold,
    color: white,
  });
  const dateTxt = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const dateW = font.widthOfTextAtSize(dateTxt, 10);
  page.drawText(dateTxt, {
    x: width - marginX - dateW,
    y: height - 92,
    size: 10,
    font,
    color: white,
  });

  // ============ CLIENTE ============
  let y = height - headerH - 34;

  const sectionTitle = (title: string) => {
    // small colored bar + title
    page.drawRectangle({ x: marginX, y: y - 2, width: 4, height: 14, color: headerColor });
    page.drawText(title.toUpperCase(), {
      x: marginX + 12,
      y: y,
      size: 11,
      font: fontBold,
      color: textDark,
    });
    y -= 10;
    page.drawLine({
      start: { x: marginX, y },
      end: { x: width - marginX, y },
      thickness: 0.6,
      color: lineSoft,
    });
    y -= 16;
  };

  sectionTitle("Dados do Cliente");

  // Two-column info layout
  const colGap = 20;
  const colW = (width - marginX * 2 - colGap) / 2;
  const leftX = marginX;
  const rightX = marginX + colW + colGap;

  const infoPairs: Array<[string, string | undefined]> = [
    ["Nome", input.cliente.nome],
    ["Telefone", input.cliente.telefone],
    ["E-mail", input.cliente.email],
    [
      "Endereço",
      [input.cliente.endereco, input.cliente.cidade, input.cliente.cep].filter(Boolean).join(" - ") || undefined,
    ],
  ];

  const drawInfoCell = (x: number, cy: number, label: string, value: string) => {
    page.drawText(label.toUpperCase(), { x, y: cy, size: 7.5, font: fontBold, color: textMuted });
    drawWrapped(page, value, x, cy - 12, colW, font, 10.5, textDark, 1.25);
  };

  let rowY = y;
  for (let i = 0; i < infoPairs.length; i += 2) {
    const [l1, v1] = infoPairs[i];
    const pair2 = infoPairs[i + 1];
    if (v1) drawInfoCell(leftX, rowY, l1, v1);
    if (pair2 && pair2[1]) drawInfoCell(rightX, rowY, pair2[0], pair2[1]);
    rowY -= 34;
  }
  y = rowY;

  if (input.cliente.observacoes) {
    drawInfoCell(leftX, y, "Observações", input.cliente.observacoes);
    y -= 34;
  }

  // ============ ITENS ============
  y -= 4;
  sectionTitle("Itens do Pedido");

  // Column x positions
  const colQtdX = width - marginX - 250;
  const colUnitX = width - marginX - 170;
  const colTotalRight = width - marginX - 8;
  const rowH = 22;

  // Table header
  page.drawRectangle({
    x: marginX,
    y: y - 6,
    width: width - marginX * 2,
    height: rowH,
    color: headerColor,
  });
  const headTextY = y + 1;
  page.drawText("PRODUTO", { x: marginX + 10, y: headTextY, size: 9.5, font: fontBold, color: white });
  page.drawText("QTD", { x: colQtdX, y: headTextY, size: 9.5, font: fontBold, color: white });
  page.drawText("UNIT.", { x: colUnitX, y: headTextY, size: 9.5, font: fontBold, color: white });
  const th = "TOTAL";
  const thW = fontBold.widthOfTextAtSize(th, 9.5);
  page.drawText(th, { x: colTotalRight - thW, y: headTextY, size: 9.5, font: fontBold, color: white });
  y -= rowH + 2;

  let zebra = false;
  for (const it of input.itens) {
    if (y < 180) break; // safety
    if (zebra) {
      page.drawRectangle({
        x: marginX,
        y: y - 6,
        width: width - marginX * 2,
        height: rowH,
        color: zebraBg,
      });
    }
    zebra = !zebra;

    const maxNomeW = colQtdX - marginX - 20;
    let nome = it.nome;
    while (font.widthOfTextAtSize(nome, 10) > maxNomeW && nome.length > 4) {
      nome = nome.slice(0, -2);
    }
    if (nome !== it.nome) nome = nome.slice(0, -1) + "…";

    page.drawText(nome, { x: marginX + 10, y: y + 1, size: 10, font, color: textDark });
    page.drawText(String(it.quantidade), { x: colQtdX + 6, y: y + 1, size: 10, font, color: textDark });
    page.drawText(formatBRL(it.preco), { x: colUnitX, y: y + 1, size: 10, font, color: textDark });
    const linha = formatBRL(it.preco * it.quantidade);
    const linhaW = fontBold.widthOfTextAtSize(linha, 10);
    page.drawText(linha, { x: colTotalRight - linhaW, y: y + 1, size: 10, font: fontBold, color: textDark });
    y -= rowH;
  }

  // ============ TOTAL ============
  y -= 10;
  page.drawLine({
    start: { x: marginX, y },
    end: { x: width - marginX, y },
    thickness: 1,
    color: headerColor,
  });
  y -= 30;

  // Total pill on the right
  const totalValor = formatBRL(input.total);
  const boxW = 240;
  const boxH = 44;
  const boxX = width - marginX - boxW;
  const boxY = y - 8;
  page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, color: headerColor });
  page.drawText("TOTAL DO PEDIDO", {
    x: boxX + 14,
    y: boxY + boxH - 16,
    size: 9,
    font: fontBold,
    color: white,
  });
  const tvSize = 20;
  const tvW = fontBold.widthOfTextAtSize(totalValor, tvSize);
  page.drawText(totalValor, {
    x: boxX + boxW - 14 - tvW,
    y: boxY + 12,
    size: tvSize,
    font: fontBold,
    color: white,
  });

  // ============ RODAPÉ ============
  const footerH = 80;
  page.drawRectangle({ x: 0, y: 0, width, height: footerH, color: headerColor });
  page.drawRectangle({ x: 0, y: footerH, width, height: 3, color: headerColorDark });

  const rodapeLinhas = [
    config.rodape_texto || config.nome_empresa,
    config.rodape_cnpj ? `CNPJ: ${config.rodape_cnpj}` : null,
    config.rodape_endereco,
    [config.rodape_telefone, config.rodape_email].filter(Boolean).join("  ·  ") || null,
  ].filter(Boolean) as string[];

  let fy = footerH - 18;
  for (let i = 0; i < rodapeLinhas.length; i++) {
    const line = rodapeLinhas[i];
    const size = i === 0 ? 10.5 : 8.5;
    const f = i === 0 ? fontBold : font;
    fy = drawWrapped(page, line, marginX, fy, width - marginX * 2, f, size, white, 1.25);
    fy -= 1;
  }

  return pdf.save();
}

function sanitizePdfText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[•✅👋🚀📄🛒👤📱✉️📍📝💰]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function gerarPdfSimples(input: PedidoPdfInput, config: ConfigEmpresa): Uint8Array {
  const header = hexToRgb(config.cor_header);
  const rgbFill = `${header.r.toFixed(3)} ${header.g.toFixed(3)} ${header.b.toFixed(3)} rg`;
  const contentLines: string[] = [
    "q",
    rgbFill,
    "0 722 595 120 re f",
    "0 0 595 80 re f",
    "Q",
    "BT /F1 11 Tf 380 795 Td 1 1 1 rg (COMPROVANTE DE PEDIDO) Tj ET",
    "BT /F1 20 Tf 440 770 Td 1 1 1 rg (" + sanitizePdfText(input.numero) + ") Tj ET",
    "BT /F1 10 Tf 440 750 Td 1 1 1 rg (" +
      sanitizePdfText(new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })) +
      ") Tj ET",
  ];

  let y = 690;
  const section = (title: string) => {
    contentLines.push(`BT /F1 11 Tf 40 ${y} Td 0.12 0.14 0.12 rg (${sanitizePdfText(title.toUpperCase())}) Tj ET`);
    y -= 18;
  };
  const line = (text: string, size = 10) => {
    contentLines.push(`BT /F1 ${size} Tf 40 ${y} Td 0.12 0.14 0.12 rg (${sanitizePdfText(text)}) Tj ET`);
    y -= size + 5;
  };

  section("Dados do Cliente");
  line(`Nome: ${input.cliente.nome}`);
  line(`Telefone: ${input.cliente.telefone}`);
  if (input.cliente.email) line(`E-mail: ${input.cliente.email}`);
  const endereco = [input.cliente.endereco, input.cliente.cidade, input.cliente.cep].filter(Boolean).join(" - ");
  if (endereco) line(`Endereco: ${endereco}`);
  if (input.cliente.observacoes) line(`Obs: ${input.cliente.observacoes}`);
  y -= 8;
  section("Itens do Pedido");
  for (const item of input.itens.slice(0, 22)) {
    line(`${item.quantidade}x ${item.nome} - ${formatBRL(item.preco * item.quantidade)}`);
  }
  if (input.itens.length > 22) line(`... e mais ${input.itens.length - 22} item(ns)`);
  y -= 10;
  contentLines.push(`BT /F1 14 Tf 40 ${y} Td 0.12 0.14 0.12 rg (TOTAL DO PEDIDO: ${sanitizePdfText(formatBRL(input.total))}) Tj ET`);

  const footer = [
    config.rodape_texto || config.nome_empresa || "",
    config.rodape_cnpj ? `CNPJ: ${config.rodape_cnpj}` : "",
    config.rodape_endereco || "",
    [config.rodape_telefone, config.rodape_email].filter(Boolean).join(" - "),
  ].filter(Boolean);
  footer.forEach((l, index) => {
    contentLines.push(`BT /F1 ${index === 0 ? 10 : 8} Tf 40 ${58 - index * 14} Td 1 1 1 rg (${sanitizePdfText(l)}) Tj ET`);
  });

  const stream = contentLines.join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefAt = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}
