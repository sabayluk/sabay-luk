import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Creates an official, high-resolution PDF Invoice for SABAY LUK SHOES STORE.
 * Compatible with Telegram sendDocument & direct browser download.
 */
export async function generateInvoicePdf(order = {}, storeSettings = {}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 (595.28 x 841.89 points)
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Palettes
  const primaryColor = rgb(0.12, 0.15, 0.25); // Slate 900
  const accentColor = rgb(0.55, 0.23, 0.85); // Purple 600
  const grayLight = rgb(0.95, 0.95, 0.97);
  const grayText = rgb(0.45, 0.45, 0.50);
  const darkText = rgb(0.1, 0.1, 0.12);
  const borderGray = rgb(0.85, 0.85, 0.88);
  const greenPaid = rgb(0.08, 0.60, 0.35);

  // 1. Top Header Banner
  page.drawRectangle({
    x: 0,
    y: height - 110,
    width: width,
    height: 110,
    color: primaryColor,
  });

  // Store Brand in Header
  const storeName = (storeSettings.storeName || 'SABAY LUK SHOES STORE').toUpperCase();
  page.drawText(storeName, {
    x: 40,
    y: height - 48,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('OFFICIAL SALES INVOICE & TAX RECEIPT', {
    x: 40,
    y: height - 68,
    size: 9,
    font: fontRegular,
    color: rgb(0.75, 0.80, 0.90),
  });

  page.drawText('GENUINE SHOES • BEST QUALITY • FAST DELIVERY', {
    x: 40,
    y: height - 82,
    size: 7.5,
    font: fontOblique,
    color: rgb(0.60, 0.65, 0.75),
  });

  // Invoice Number Badge in Header Right
  const orderId = order.order_id || order.id || 'INV-20261114-001';
  page.drawRectangle({
    x: width - 210,
    y: height - 85,
    width: 170,
    height: 52,
    color: rgb(0.18, 0.22, 0.35),
    borderColor: rgb(0.3, 0.35, 0.5),
    borderWidth: 1,
  });

  page.drawText('INVOICE NO:', {
    x: width - 200,
    y: height - 50,
    size: 8,
    font: fontBold,
    color: rgb(0.8, 0.85, 0.95),
  });

  page.drawText(orderId, {
    x: width - 200,
    y: height - 68,
    size: 13,
    font: fontBold,
    color: rgb(1, 0.8, 0.2), // Gold
  });

  // 2. Info Boxes: Store Info (Left) & Customer Info (Right)
  let curY = height - 130;

  // Left Column: Store Details
  page.drawText('ISSUED BY (STORE INFO):', {
    x: 40,
    y: curY,
    size: 8.5,
    font: fontBold,
    color: accentColor,
  });
  curY -= 14;
  page.drawText(storeSettings.storeName || 'SABAY LUK CO., LTD.', { x: 40, y: curY, size: 9, font: fontBold, color: darkText });
  curY -= 13;
  page.drawText(`Address: ${storeSettings.address || 'Street 271, Phnom Penh, Cambodia'}`, { x: 40, y: curY, size: 8, font: fontRegular, color: grayText });
  curY -= 12;
  page.drawText(`Phone: ${storeSettings.phone || '096 720 5522'} | Telegram: @${(storeSettings.telegram || 'Sabayluk').replace(/^@/, '')}`, { x: 40, y: curY, size: 8, font: fontRegular, color: grayText });
  curY -= 12;
  page.drawText(`VAT TIN: ${storeSettings.vatTin || 'K001-902345678'}`, { x: 40, y: curY, size: 8, font: fontBold, color: grayText });

  // Right Column: Customer Details (Same vertical level)
  let custY = height - 130;
  const rightX = 320;
  page.drawText('BILLED TO (CUSTOMER):', {
    x: rightX,
    y: custY,
    size: 8.5,
    font: fontBold,
    color: accentColor,
  });
  custY -= 14;
  const custName = (order.customer_name || order.customer || 'General Customer').toUpperCase();
  page.drawText(custName, { x: rightX, y: custY, size: 9, font: fontBold, color: darkText });
  custY -= 13;
  page.drawText(`Phone: ${order.phone || order.phone_number || 'N/A'}`, { x: rightX, y: custY, size: 8, font: fontRegular, color: grayText });
  custY -= 12;
  const deliveryAddr = (order.delivery_address || order.address || 'Phnom Penh, Cambodia').slice(0, 42);
  page.drawText(`Address: ${deliveryAddr}`, { x: rightX, y: custY, size: 8, font: fontRegular, color: grayText });
  custY -= 12;
  const custTelegram = order.telegram ? `@${order.telegram.replace(/^@/, '')}` : (order.phone || 'N/A');
  page.drawText(`Telegram: ${custTelegram} | Method: ${order.payment_method || 'KHQR / Cash'}`, { x: rightX, y: custY, size: 8, font: fontRegular, color: grayText });

  // Divider Line
  curY = Math.min(curY, custY) - 15;
  page.drawLine({
    start: { x: 40, y: curY },
    end: { x: width - 40, y: curY },
    thickness: 1,
    color: borderGray,
  });

  // Order Meta Bar (Date, Cashier, Status)
  curY -= 18;
  const orderDate = order.created_at ? new Date(order.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString('en-US');
  const cashierName = order.cashier_name || 'Admin / Online System';
  page.drawText(`Date: ${orderDate}`, { x: 40, y: curY, size: 8, font: fontBold, color: darkText });
  page.drawText(`Cashier / Officer: ${cashierName}`, { x: 230, y: curY, size: 8, font: fontBold, color: darkText });
  page.drawText(`Payment Status: `, { x: 430, y: curY, size: 8, font: fontBold, color: darkText });
  page.drawText(`PAID / COMPLETED`, { x: 495, y: curY, size: 8, font: fontBold, color: greenPaid });

  // 3. Items Table
  curY -= 20;
  const tableHeaderY = curY;
  page.drawRectangle({
    x: 40,
    y: tableHeaderY - 5,
    width: width - 80,
    height: 22,
    color: grayLight,
  });

  page.drawText('#', { x: 50, y: tableHeaderY + 2, size: 8, font: fontBold, color: darkText });
  page.drawText('ITEM DESCRIPTION', { x: 75, y: tableHeaderY + 2, size: 8, font: fontBold, color: darkText });
  page.drawText('VARIANT / SIZE', { x: 280, y: tableHeaderY + 2, size: 8, font: fontBold, color: darkText });
  page.drawText('PRICE', { x: 380, y: tableHeaderY + 2, size: 8, font: fontBold, color: darkText });
  page.drawText('QTY', { x: 440, y: tableHeaderY + 2, size: 8, font: fontBold, color: darkText });
  page.drawText('TOTAL', { x: 490, y: tableHeaderY + 2, size: 8, font: fontBold, color: darkText });

  curY -= 16;

  const items = Array.isArray(order.items) ? order.items.filter(it => !it.is_tax_meta) : [];
  items.slice(0, 15).forEach((item, index) => {
    curY -= 18;
    const isEven = index % 2 === 1;
    if (isEven) {
      page.drawRectangle({
        x: 40,
        y: curY - 4,
        width: width - 80,
        height: 18,
        color: rgb(0.98, 0.98, 0.99),
      });
    }

    const itemName = (item.name || 'Shoe Item').slice(0, 32);
    const variantStr = [item.size ? `Size ${item.size}` : '', item.color ? item.color : ''].filter(Boolean).join(' / ') || 'Standard';
    const price = parseFloat(item.price || 0);
    const qty = parseInt(item.qty || 1, 10);
    const itemTotal = price * qty;

    page.drawText(String(index + 1), { x: 50, y: curY, size: 8, font: fontRegular, color: grayText });
    page.drawText(itemName, { x: 75, y: curY, size: 8, font: fontBold, color: darkText });
    page.drawText(variantStr.slice(0, 20), { x: 280, y: curY, size: 7.5, font: fontRegular, color: grayText });
    page.drawText(`$${price.toFixed(2)}`, { x: 380, y: curY, size: 8, font: fontRegular, color: darkText });
    page.drawText(String(qty), { x: 445, y: curY, size: 8, font: fontBold, color: darkText });
    page.drawText(`$${itemTotal.toFixed(2)}`, { x: 490, y: curY, size: 8, font: fontBold, color: darkText });
  });

  // Table bottom border
  curY -= 10;
  page.drawLine({
    start: { x: 40, y: curY },
    end: { x: width - 40, y: curY },
    thickness: 1,
    color: borderGray,
  });

  // 4. Financial Summary (Subtotal, Discount, VAT, Total)
  curY -= 18;
  const summaryX = 350;
  const summaryValX = 490;

  const subtotal = parseFloat(order.subtotal || order.total_amount || order.total || 0);
  const discount = parseFloat(order.discount || 0);
  const tax = parseFloat(order.tax_amount || 0);
  const total = parseFloat(order.total_amount || order.total || 0);
  const exchangeRate = order.exchange_rate || storeSettings.exchangeRate || 4100;
  const totalKHR = Math.round(total * exchangeRate);

  // Subtotal
  page.drawText('Subtotal:', { x: summaryX, y: curY, size: 8.5, font: fontRegular, color: grayText });
  page.drawText(`$${subtotal.toFixed(2)}`, { x: summaryValX, y: curY, size: 8.5, font: fontBold, color: darkText });

  if (discount > 0) {
    curY -= 14;
    page.drawText(`Discount (${order.coupon_code || 'Promo'}):`, { x: summaryX, y: curY, size: 8.5, font: fontRegular, color: rgb(0.85, 0.2, 0.2) });
    page.drawText(`-$${discount.toFixed(2)}`, { x: summaryValX, y: curY, size: 8.5, font: fontBold, color: rgb(0.85, 0.2, 0.2) });
  }

  if (tax > 0) {
    curY -= 14;
    page.drawText('VAT (10%):', { x: summaryX, y: curY, size: 8.5, font: fontRegular, color: grayText });
    page.drawText(`+$${tax.toFixed(2)}`, { x: summaryValX, y: curY, size: 8.5, font: fontBold, color: darkText });
  }

  // Grand Total Box
  curY -= 28;
  page.drawRectangle({
    x: summaryX - 10,
    y: curY - 8,
    width: width - summaryX - 30,
    height: 34,
    color: primaryColor,
  });

  page.drawText('GRAND TOTAL:', {
    x: summaryX,
    y: curY + 9,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(`$${total.toFixed(2)}`, {
    x: summaryValX - 10,
    y: curY + 8,
    size: 13,
    font: fontBold,
    color: rgb(1, 0.85, 0.25),
  });

  page.drawText(`≈ ${totalKHR.toLocaleString()} KHR`, {
    x: summaryX,
    y: curY - 3,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.8, 0.85, 0.95),
  });

  // Left Note Box / Paid Stamp
  const stampBoxY = curY - 5;
  page.drawRectangle({
    x: 40,
    y: stampBoxY,
    width: 220,
    height: 60,
    color: rgb(0.94, 0.98, 0.95),
    borderColor: greenPaid,
    borderWidth: 1.5,
  });

  page.drawText('OFFICIAL DIGITAL RECEIPT', {
    x: 55,
    y: stampBoxY + 42,
    size: 8,
    font: fontBold,
    color: greenPaid,
  });

  page.drawText(`STATUS: PAID & CONFIRMED`, {
    x: 55,
    y: stampBoxY + 26,
    size: 9.5,
    font: fontBold,
    color: greenPaid,
  });

  page.drawText(`Authenticity Code: SABAY-SEC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, {
    x: 55,
    y: stampBoxY + 12,
    size: 6.5,
    font: fontRegular,
    color: grayText,
  });

  // 5. Footer & Terms
  page.drawLine({
    start: { x: 40, y: 80 },
    end: { x: width - 40, y: 80 },
    thickness: 0.5,
    color: borderGray,
  });

  page.drawText('THANK YOU FOR YOUR PURCHASE AT SABAY LUK SHOES STORE!', {
    x: 40,
    y: 65,
    size: 8,
    font: fontBold,
    color: darkText,
  });

  page.drawText('Terms & Conditions: Goods sold are returnable or exchangeable within 3 days in original condition with invoice.', {
    x: 40,
    y: 52,
    size: 6.5,
    font: fontRegular,
    color: grayText,
  });

  page.drawText(`Customer Service: ${storeSettings.phone || '096 720 5522'} • Telegram: @${(storeSettings.telegram || 'Sabayluk').replace(/^@/, '')} • Web: sabayluk.com`, {
    x: 40,
    y: 40,
    size: 6.5,
    font: fontOblique,
    color: grayText,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
