import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const KHMER_COMMON_MAP = {
  'ស្បែកជើង': 'Shoes',
  'អាវ': 'Shirt',
  'ខោ': 'Pants',
  'កាបូប': 'Bag',
  'ខ្មៅ': 'Black',
  'ស': 'White',
  'ក្រហម': 'Red',
  'ខៀវ': 'Blue',
  'លឿង': 'Yellow',
  'បៃតង': 'Green',
  'ប្រផេះ': 'Gray',
  'ត្នោត': 'Brown',
  'អតិថិជនទូទៅ': 'General Customer',
  'អតិថិជន': 'Customer',
  'ភ្នំពេញ': 'Phnom Penh',
  'កម្ពុជា': 'Cambodia',
  'មុខហាង': 'POS Storefront',
  'ផ្លូវ': 'Street',
  'សង្កាត់': 'Sangkat',
  'ខណ្ឌ': 'Khan',
  'បឹងទំពុន': 'Boeng Tumpun',
  'មានជ័យ': 'Meanchey',
  'រាជធានី': 'Capital'
};

function cleanTextForPdf(str, fallback = '') {
  if (!str) return fallback;
  let s = String(str).trim();
  for (const [km, en] of Object.entries(KHMER_COMMON_MAP)) {
    s = s.replaceAll(km, en);
  }
  // Remove non-ASCII printable chars to prevent WinAnsi font encode crash
  const sanitized = s.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
  return sanitized || fallback;
}

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
  const rawStoreName = storeSettings.storeName || storeSettings.name || 'COMMERCIAL STORE';
  const storeName = cleanTextForPdf(rawStoreName, 'COMMERCIAL STORE').toUpperCase();
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

  const rawSlogan = storeSettings.slogan || storeSettings.storeSlogan || 'GENUINE PRODUCTS - BEST QUALITY - FAST DELIVERY';
  page.drawText(cleanTextForPdf(rawSlogan, 'BEST QUALITY - FAST DELIVERY'), {
    x: 40,
    y: height - 82,
    size: 7.5,
    font: fontOblique,
    color: rgb(0.60, 0.65, 0.75),
  });

  // Invoice Number Badge in Header Right
  const orderId = cleanTextForPdf(order.order_id || order.id, 'INV-001');
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
  page.drawText(storeName, { x: 40, y: curY, size: 9, font: fontBold, color: darkText });
  curY -= 13;
  const storeAddr = cleanTextForPdf(storeSettings.address, 'Phnom Penh, Cambodia');
  page.drawText(`Address: ${storeAddr}`, { x: 40, y: curY, size: 8, font: fontRegular, color: grayText });
  curY -= 12;
  const storePhone = cleanTextForPdf(storeSettings.phone, '');
  let storeTg = cleanTextForPdf(storeSettings.telegram, '').replace(/^@/, '');
  const contactParts = [];
  if (storePhone) contactParts.push(`Phone: ${storePhone}`);
  if (storeTg) contactParts.push(`Telegram: @${storeTg}`);
  const contactLine = contactParts.length > 0 ? contactParts.join(' | ') : 'Customer Care Service';
  page.drawText(contactLine, { x: 40, y: curY, size: 8, font: fontRegular, color: grayText });
  if (storeSettings.vatTin) {
    curY -= 12;
    page.drawText(`VAT TIN: ${cleanTextForPdf(storeSettings.vatTin, '')}`, { x: 40, y: curY, size: 8, font: fontBold, color: grayText });
  }

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
  const custName = cleanTextForPdf(order.customer_name || order.customer, 'General Customer').toUpperCase();
  page.drawText(custName, { x: rightX, y: custY, size: 9, font: fontBold, color: darkText });
  custY -= 13;
  page.drawText(`Phone: ${cleanTextForPdf(order.phone || order.phone_number, 'N/A')}`, { x: rightX, y: custY, size: 8, font: fontRegular, color: grayText });
  custY -= 12;
  const deliveryAddr = cleanTextForPdf(order.delivery_address || order.address, 'Phnom Penh, Cambodia').slice(0, 42);
  page.drawText(`Address: ${deliveryAddr}`, { x: rightX, y: custY, size: 8, font: fontRegular, color: grayText });
  custY -= 12;
  const custTelegram = order.telegram ? `@${cleanTextForPdf(order.telegram).replace(/^@/, '')}` : (cleanTextForPdf(order.phone) || 'N/A');
  const paymentMethodStr = cleanTextForPdf(order.payment_method, 'KHQR / Cash');
  page.drawText(`Telegram: ${custTelegram} | Method: ${paymentMethodStr}`, { x: rightX, y: custY, size: 8, font: fontRegular, color: grayText });

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
  const cashierName = cleanTextForPdf(order.cashier_name, 'Admin / Online System');
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

  const items = Array.isArray(order.items) ? order.items.filter(it => it && !it.is_tax_meta && !it.is_delivery_meta && (it.name || it.title)) : [];
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

    const itemName = cleanTextForPdf(item.name, 'Shoe Item').slice(0, 32);
    const variantRaw = [item.size ? `Size ${item.size}` : '', item.color ? item.color : ''].filter(Boolean).join(' / ');
    const variantStr = cleanTextForPdf(variantRaw, 'Standard').slice(0, 20);
    const price = parseFloat(item.price || 0);
    const qty = parseInt(item.qty || 1, 10);
    const itemTotal = price * qty;

    page.drawText(String(index + 1), { x: 50, y: curY, size: 8, font: fontRegular, color: grayText });
    page.drawText(itemName, { x: 75, y: curY, size: 8, font: fontBold, color: darkText });
    page.drawText(variantStr, { x: 280, y: curY, size: 7.5, font: fontRegular, color: grayText });
    page.drawText(`$${price.toFixed(2)}`, { x: 380, y: curY, size: 8, font: fontRegular, color: darkText });
    page.drawText(String(qty), { x: 445, y: curY, size: 8, font: fontBold, color: darkText });
    page.drawText(`$${itemTotal.toFixed(2)}`, { x: 490, y: curY, size: 8, font: fontBold, color: darkText });
  });

  // Table bottom border
  curY -= 12;
  const tableBottomY = curY;
  page.drawLine({
    start: { x: 40, y: tableBottomY },
    end: { x: width - 40, y: tableBottomY },
    thickness: 1,
    color: borderGray,
  });

  // 4. Financial Summary (Subtotal, Discount, Delivery, VAT, Total)
  // ⭐️ Generous whitespace below the table to guarantee zero overlap ⭐️
  curY = tableBottomY - 24;
  const summaryX = 340;
  const summaryValX = 490;

  const subtotal = parseFloat(order.subtotal || order.total_amount || order.total || 0);
  const discount = parseFloat(order.discount || 0);
  const delivery = parseFloat(order.delivery_fee || order.shipping_fee || 0);
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

  if (delivery > 0) {
    curY -= 14;
    page.drawText('Delivery / Shipping:', { x: summaryX, y: curY, size: 8.5, font: fontRegular, color: grayText });
    page.drawText(`+$${delivery.toFixed(2)}`, { x: summaryValX, y: curY, size: 8.5, font: fontBold, color: darkText });
  }

  if (tax > 0) {
    curY -= 14;
    page.drawText('VAT (10%):', { x: summaryX, y: curY, size: 8.5, font: fontRegular, color: grayText });
    page.drawText(`+$${tax.toFixed(2)}`, { x: summaryValX, y: curY, size: 8.5, font: fontBold, color: darkText });
  }

  // Grand Total Box
  curY -= 28;
  const grandTotalBoxY = curY - 8;
  const grandTotalBoxHeight = 36;
  page.drawRectangle({
    x: summaryX - 10,
    y: grandTotalBoxY,
    width: width - summaryX - 30,
    height: grandTotalBoxHeight,
    color: primaryColor,
  });

  page.drawText('GRAND TOTAL:', {
    x: summaryX,
    y: curY + 10,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(`$${total.toFixed(2)}`, {
    x: summaryValX - 10,
    y: curY + 9,
    size: 13,
    font: fontBold,
    color: rgb(1, 0.85, 0.25),
  });

  page.drawText(`~ ${totalKHR.toLocaleString()} KHR`, {
    x: summaryX,
    y: curY - 2,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.8, 0.85, 0.95),
  });

  // Left Note Box / Paid Stamp (Official Digital Receipt)
  // ⭐️ Spacious, perfectly positioned below table with ample breathing room, aligned with Grand Total ⭐️
  const stampBoxHeight = 52;
  const stampBoxY = grandTotalBoxY; // Exactly aligns bottom line with Grand Total Box
  page.drawRectangle({
    x: 40,
    y: stampBoxY,
    width: 230,
    height: stampBoxHeight,
    color: rgb(0.95, 0.985, 0.96),
    borderColor: greenPaid,
    borderWidth: 1.5,
  });

  page.drawText('OFFICIAL DIGITAL RECEIPT', {
    x: 52,
    y: stampBoxY + 36,
    size: 8,
    font: fontBold,
    color: greenPaid,
  });

  page.drawText(`STATUS: PAID & CONFIRMED`, {
    x: 52,
    y: stampBoxY + 22,
    size: 9.5,
    font: fontBold,
    color: greenPaid,
  });

  page.drawText(`Authenticity Code: SABAY-SEC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, {
    x: 52,
    y: stampBoxY + 9,
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

  page.drawText(`THANK YOU FOR YOUR PURCHASE AT ${storeName}!`, {
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

  const footerParts = [];
  if (storeSettings.phone) footerParts.push(`Customer Service: ${storeSettings.phone}`);
  if (storeSettings.telegram) footerParts.push(`Telegram: @${storeSettings.telegram.replace(/^@/, '')}`);
  const footerServiceStr = cleanTextForPdf(footerParts.length > 0 ? footerParts.join(' | ') : `Store Customer Care • ${storeName}`, 'Customer Service');
  page.drawText(footerServiceStr, {
    x: 40,
    y: 40,
    size: 6.5,
    font: fontOblique,
    color: grayText,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
