/**
 * Bakong KHQR Dynamic & Static Generator (EMVCo Standard)
 * Supports USD (840) and KHR (116) with automatic CRC16-CCITT checksum
 */

// CRC16-CCITT (Polynomial 0x1021, Initial 0xFFFF)
export function crc16Ccitt(str) {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= (str.charCodeAt(c) << 8);
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Format EMVCo Tag-Length-Value (TLV)
export function formatTlv(tag, value) {
  if (value == null || value === '') return '';
  const valStr = String(value);
  const lenStr = String(valStr.length).padStart(2, '0');
  return `${tag}${lenStr}${valStr}`;
}

/**
 * Generate official Bakong KHQR string
 * @param {Object} options
 * @param {string} options.bakongAccountId - e.g. "sengsoveasna@aba" or phone "0967205522@aba"
 * @param {string} options.merchantName - Store or Merchant Name (e.g. "SABAY LUK")
 * @param {string} [options.merchantCity="Phnom Penh"] - City
 * @param {number} [options.amount] - Payment amount (if present, produces Dynamic KHQR Tag 01=12)
 * @param {string} [options.currency="USD"] - "USD" or "KHR"
 * @param {string} [options.billNumber] - Order ID or Bill Number
 * @param {string} [options.mobileNumber] - Contact phone number
 * @param {string} [options.storeLabel] - Store title
 */
export function generateKhqrString(options = {}) {
  const {
    bakongAccountId = 'sengsoveasna@aba',
    merchantName = 'SABAY LUK',
    merchantCity = 'Phnom Penh',
    amount,
    currency = 'USD',
    billNumber = '',
    mobileNumber = '',
    storeLabel = 'SABAY LUK'
  } = options;

  const isDynamic = amount != null && Number(amount) > 0;
  const currencyCode = currency.toUpperCase() === 'KHR' ? '116' : '840';

  // Tag 00: Payload Format Indicator (Fixed '01')
  let khqr = formatTlv('00', '01');

  // Tag 01: Point of Initiation Method ('12' = Dynamic with amount, '11' = Static)
  khqr += formatTlv('01', isDynamic ? '12' : '11');

  // Tag 29: Merchant Account Information (Bakong Individual / Merchant)
  // Sub-tag 00: Bakong Account ID
  const cleanAccountId = bakongAccountId.trim() || 'sengsoveasna@aba';
  let tag29Value = formatTlv('00', cleanAccountId);
  if (storeLabel) {
    tag29Value += formatTlv('01', storeLabel.slice(0, 25));
  }
  khqr += formatTlv('29', tag29Value);

  // Tag 52: Merchant Category Code ('5999' = Miscellaneous & Specialty Retail Stores)
  khqr += formatTlv('52', '5999');

  // Tag 53: Transaction Currency ('840' for USD, '116' for KHR)
  khqr += formatTlv('53', currencyCode);

  // Tag 54: Transaction Amount (Only if dynamic)
  if (isDynamic) {
    const formattedAmount = currencyCode === '840' 
      ? Number(amount).toFixed(2) 
      : String(Math.round(Number(amount)));
    khqr += formatTlv('54', formattedAmount);
  }

  // Tag 58: Country Code ('KH')
  khqr += formatTlv('58', 'KH');

  // Tag 59: Merchant Name
  const cleanMerchantName = (merchantName || 'SABAY LUK').trim().slice(0, 25);
  khqr += formatTlv('59', cleanMerchantName);

  // Tag 60: Merchant City
  khqr += formatTlv('60', (merchantCity || 'Phnom Penh').trim().slice(0, 15));

  // Tag 62: Additional Data Field Template
  let tag62Value = '';
  if (billNumber) {
    tag62Value += formatTlv('01', String(billNumber).slice(0, 25));
  }
  if (mobileNumber) {
    tag62Value += formatTlv('02', String(mobileNumber).replace(/\s+/g, '').slice(0, 25));
  }
  if (storeLabel) {
    tag62Value += formatTlv('07', String(storeLabel).slice(0, 25));
  }
  if (tag62Value) {
    khqr += formatTlv('62', tag62Value);
  }

  // Tag 63: CRC Checksum (Calculated over string + '6304')
  const toChecksum = `${khqr}6304`;
  const checksum = crc16Ccitt(toChecksum);

  return `${toChecksum}${checksum}`;
}

/**
 * Returns QR code image URL encoded with high error correction
 * @param {string} khqrString 
 * @param {number} [size=320]
 */
export function getKhqrQrImageUrl(khqrString, size = 320) {
  if (!khqrString) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&ecc=M&data=${encodeURIComponent(khqrString)}`;
}

/**
 * Returns deep link for Bakong App
 */
export function getBakongDeepLink(khqrString) {
  if (!khqrString) return '#';
  return `https://bakong.nbc.org.kh/pay?qr=${encodeURIComponent(khqrString)}`;
}

/**
 * Returns deep link for ABA Mobile
 */
export function getAbaDeepLink(khqrString) {
  if (!khqrString) return '#';
  return `aba://payment?qr=${encodeURIComponent(khqrString)}`;
}
