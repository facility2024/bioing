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
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias
type PdfPageLike = any;
type PdfFontLike = any;

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
  page: PdfPageLike,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PdfFontLike,
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
    // Try png then jpg
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

  const { data: publicData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  if (publicData?.publicUrl) return publicData.publicUrl;

  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed?.signedUrl) {
    console.error("[pedido-pdf] signed url falhou:", signErr);
    return null;
  }

  return signed.signedUrl;
}

async function gerarPdfComPdfLib(input: PedidoPdfInput, config: ConfigEmpresa): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const headerColor = hexToRgb(config.cor_header);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const marginX = 40;

  // ============ HEADER ============
  const headerH = 110;
  page.drawRectangle({
    x: 0,
    y: height - headerH,
    width,
    height: headerH,
    color: rgb(headerColor.r, headerColor.g, headerColor.b),
  });

  // Logo
  let logoDrawn = false;
  if (config.logo_url) {
    const asset = await fetchLogoBytes(config.logo_url);
    if (asset) {
      try {
        const img =
          asset.kind === "png"
            ? await pdf.embedPng(asset.bytes)
            : await pdf.embedJpg(asset.bytes);
        const maxH = 70;
        const scale = Math.min(maxH / img.height, 180 / img.width);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, {
          x: marginX,
          y: height - headerH / 2 - h / 2,
          width: w,
          height: h,
        });
        logoDrawn = true;
      } catch {
        // ignore
      }
    }
  }
  if (!logoDrawn) {
    page.drawText(config.nome_empresa || "Ingredientes Bio", {
      x: marginX,
      y: height - headerH / 2 - 8,
      size: 22,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
  }

  // Right-side header text: "COMPROVANTE DE PEDIDO" + numero
  const rightLabel = "COMPROVANTE DE PEDIDO";
  const rightLabelW = fontBold.widthOfTextAtSize(rightLabel, 12);
  page.drawText(rightLabel, {
    x: width - marginX - rightLabelW,
    y: height - 50,
    size: 12,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  const numTxt = `Nº ${input.numero}`;
  const numW = fontBold.widthOfTextAtSize(numTxt, 16);
  page.drawText(numTxt, {
    x: width - marginX - numW,
    y: height - 75,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  const dateTxt = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const dateW = font.widthOfTextAtSize(dateTxt, 10);
  page.drawText(dateTxt, {
    x: width - marginX - dateW,
    y: height - 92,
    size: 10,
    font,
    color: rgb(1, 1, 1),
  });

  // ============ CLIENTE ============
  let y = height - headerH - 30;
  page.drawText("Dados do Cliente", { x: marginX, y, size: 13, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
  y -= 6;
  page.drawLine({
    start: { x: marginX, y },
    end: { x: width - marginX, y },
    thickness: 0.7,
    color: rgb(headerColor.r, headerColor.g, headerColor.b),
  });
  y -= 16;

  const info = (label: string, value?: string | null) => {
    if (!value) return;
    page.drawText(`${label}:`, { x: marginX, y, size: 10, font: fontBold, color: rgb(0.25, 0.25, 0.25) });
    page.drawText(value, { x: marginX + 70, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
    y -= 15;
  };
  info("Nome", input.cliente.nome);
  info("Telefone", input.cliente.telefone);
  info("E-mail", input.cliente.email);
  const enderecoTxt = [input.cliente.endereco, input.cliente.cidade, input.cliente.cep]
    .filter(Boolean)
    .join(" - ");
  info("Endereço", enderecoTxt || undefined);
  info("Observações", input.cliente.observacoes);

  // ============ ITENS ============
  y -= 10;
  page.drawText("Itens do Pedido", { x: marginX, y, size: 13, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
  y -= 6;
  page.drawLine({
    start: { x: marginX, y },
    end: { x: width - marginX, y },
    thickness: 0.7,
    color: rgb(headerColor.r, headerColor.g, headerColor.b),
  });
  y -= 18;

  // Table header
  page.drawRectangle({
    x: marginX,
    y: y - 4,
    width: width - marginX * 2,
    height: 20,
    color: rgb(headerColor.r, headerColor.g, headerColor.b),
  });
  page.drawText("Produto", { x: marginX + 8, y: y + 2, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Qtd", { x: marginX + 300, y: y + 2, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Unit.", { x: marginX + 350, y: y + 2, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  const totalHeaderTxt = "Total";
  const totalHeaderW = fontBold.widthOfTextAtSize(totalHeaderTxt, 10);
  page.drawText(totalHeaderTxt, {
    x: width - marginX - 8 - totalHeaderW,
    y: y + 2,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  y -= 22;

  let zebra = false;
  for (const it of input.itens) {
    if (zebra) {
      page.drawRectangle({
        x: marginX,
        y: y - 4,
        width: width - marginX * 2,
        height: 20,
        color: rgb(0.96, 0.98, 0.95),
      });
    }
    zebra = !zebra;
    const nomeTruncado =
      it.nome.length > 55 ? it.nome.slice(0, 52) + "..." : it.nome;
    page.drawText(nomeTruncado, { x: marginX + 8, y: y + 2, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
    page.drawText(String(it.quantidade), { x: marginX + 306, y: y + 2, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
    page.drawText(formatBRL(it.preco), { x: marginX + 350, y: y + 2, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
    const linha = formatBRL(it.preco * it.quantidade);
    const linhaW = font.widthOfTextAtSize(linha, 10);
    page.drawText(linha, {
      x: width - marginX - 8 - linhaW,
      y: y + 2,
      size: 10,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 20;
    if (y < 160) break; // safety — very long orders truncate
  }

  // ============ TOTAL ============
  y -= 10;
  page.drawLine({
    start: { x: marginX, y },
    end: { x: width - marginX, y },
    thickness: 1,
    color: rgb(headerColor.r, headerColor.g, headerColor.b),
  });
  y -= 22;
  const totalLabel = "TOTAL DO PEDIDO";
  const totalValor = formatBRL(input.total);
  const totalValorW = fontBold.widthOfTextAtSize(totalValor, 16);
  page.drawText(totalLabel, { x: marginX, y, size: 12, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
  page.drawText(totalValor, {
    x: width - marginX - totalValorW,
    y: y - 1,
    size: 16,
    font: fontBold,
    color: rgb(headerColor.r, headerColor.g, headerColor.b),
  });

  // ============ RODAPÉ (verde) ============
  const footerH = 85;
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height: footerH,
    color: rgb(headerColor.r, headerColor.g, headerColor.b),
  });

  const rodapeLinhas = [
    config.rodape_texto || config.nome_empresa,
    config.rodape_cnpj ? `CNPJ: ${config.rodape_cnpj}` : null,
    config.rodape_endereco,
    [config.rodape_telefone, config.rodape_email].filter(Boolean).join(" · ") || null,
  ].filter(Boolean) as string[];

  let fy = footerH - 18;
  for (let i = 0; i < rodapeLinhas.length; i++) {
    const line = rodapeLinhas[i];
    const size = i === 0 ? 11 : 9;
    const f = i === 0 ? fontBold : font;
    fy = drawWrapped(page, line, marginX, fy, width - marginX * 2, f, size, rgb(1, 1, 1), 1.2);
    fy -= 2;
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
  const lines: string[] = [];
  const add = (text = "") => lines.push(sanitizePdfText(text));

  add(config.nome_empresa || "Ingredientes Bio");
  add(`COMPROVANTE DE PEDIDO - ${input.numero}`);
  add(new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }));
  add("");
  add("DADOS DO CLIENTE");
  add(`Nome: ${input.cliente.nome}`);
  add(`Telefone: ${input.cliente.telefone}`);
  if (input.cliente.email) add(`E-mail: ${input.cliente.email}`);
  const endereco = [input.cliente.endereco, input.cliente.cidade, input.cliente.cep].filter(Boolean).join(" - ");
  if (endereco) add(`Endereco: ${endereco}`);
  if (input.cliente.observacoes) add(`Observacoes: ${input.cliente.observacoes}`);
  add("");
  add("ITENS DO PEDIDO");
  for (const item of input.itens.slice(0, 26)) {
    add(`${item.quantidade}x ${item.nome} - ${formatBRL(item.preco * item.quantidade)}`);
  }
  if (input.itens.length > 26) add(`... e mais ${input.itens.length - 26} item(ns)`);
  add("");
  add(`TOTAL DO PEDIDO: ${formatBRL(input.total)}`);

  const contentLines = [
    "q",
    rgbFill,
    "0 732 595 110 re f",
    "0 0 595 85 re f",
    "Q",
    "BT /F1 18 Tf 40 790 Td 1 1 1 rg (" + sanitizePdfText(config.nome_empresa || "Ingredientes Bio") + ") Tj ET",
    "BT /F1 12 Tf 380 790 Td 1 1 1 rg (" + sanitizePdfText(input.numero) + ") Tj ET",
  ];

  let y = 700;
  lines.forEach((line, index) => {
    const size = index === 0 ? 14 : line === "DADOS DO CLIENTE" || line === "ITENS DO PEDIDO" ? 12 : 10;
    const color = line === "" ? "0 0 0 rg" : "0.12 0.12 0.12 rg";
    if (line) contentLines.push(`BT /F1 ${size} Tf 40 ${y} Td ${color} (${line}) Tj ET`);
    y -= line === "" ? 12 : 17;
  });

  const footer = [
    config.rodape_texto || config.nome_empresa || "Ingredientes Bio",
    config.rodape_cnpj ? `CNPJ: ${config.rodape_cnpj}` : "",
    config.rodape_endereco || "",
    [config.rodape_telefone, config.rodape_email].filter(Boolean).join(" - "),
  ].filter(Boolean);
  footer.forEach((line, index) => {
    contentLines.push(`BT /F1 ${index === 0 ? 10 : 8} Tf 40 ${58 - index * 14} Td 1 1 1 rg (${sanitizePdfText(line)}) Tj ET`);
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
