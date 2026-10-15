/**
 * Point 74: Fake / Spam Order Prevention (RTO Guard for high-risk COD)
 * Intelligent Risk Engine evaluating address integrity, order value, and past RTO history.
 */

const SUSPICIOUS_KEYWORDS = [
  'test',
  'fake',
  'dummy',
  'spam',
  'unknown',
  'asdf',
  'xyz',
  'demo',
  'null',
  'undefined',
  'qwerty',
  'temp',
  'sample',
  'nowhere',
  'none',
];

function calculateRtoRisk({
  customer = {},
  shippingAddress = {},
  totalAmount = 0,
  paymentMethod = 'COD',
  pastOrders = [],
}) {
  let score = 0;
  const reasons = [];

  const street = (shippingAddress.street || '').trim().toLowerCase();
  const recipientName = (shippingAddress.recipientName || customer.name || '').trim().toLowerCase();
  const city = (shippingAddress.city || '').trim().toLowerCase();
  const pincode = (shippingAddress.pincode || '').trim();
  const phone = (shippingAddress.phone || customer.phone || '').trim().replace(/\D/g, '');

  // 1. Address Integrity Analysis
  let keywordFound = false;
  for (const kw of SUSPICIOUS_KEYWORDS) {
    if (street.includes(kw) || recipientName.includes(kw) || city.includes(kw)) {
      keywordFound = true;
      score += 35;
      reasons.push(`Suspicious keyword '${kw}' detected in shipping address/name`);
      break;
    }
  }

  if (street.length < 8) {
    score += 25;
    reasons.push(`Incomplete/too short street address (${street.length} chars)`);
  }

  if (!pincode || !/^\d{6}$/.test(pincode)) {
    score += 30;
    reasons.push(`Invalid or non-standard 6-digit postal pincode ('${pincode}')`);
  }

  // 2. Phone Number Pattern & Repetition Check
  if (!phone || phone.length < 10) {
    score += 35;
    reasons.push('Phone number is missing or less than 10 digits');
  } else {
    // Check all identical digits (e.g. 9999999999, 1111111111)
    const isAllSame = /^(\d)\1{9,}$/.test(phone);
    // Check sequential digits (e.g. 1234567890, 0123456789)
    const isSequential = phone.includes('1234567890') || phone.includes('0123456789');

    if (isAllSame || isSequential) {
      score += 40;
      reasons.push(`Dummy or repetitive phone number detected ('${phone}')`);
    }
  }

  // 3. Payment Method & COD High Value Thresholds
  const isCod = (paymentMethod || '').toUpperCase() === 'COD';
  const amount = Number(totalAmount) || 0;

  if (isCod) {
    if (amount >= 20000) {
      score += 55;
      reasons.push(`Very high COD order value (₹${amount.toLocaleString('en-IN')}) exceeding ₹20,000 threshold`);
    } else if (amount >= 10000) {
      score += 40;
      reasons.push(`High COD order value (₹${amount.toLocaleString('en-IN')}) exceeding ₹10,000 threshold`);
    } else if (amount >= 5000) {
      score += 25;
      reasons.push(`Elevated COD order value (₹${amount.toLocaleString('en-IN')}) exceeding ₹5,000 threshold`);
    }
  } else {
    // Prepaid orders get natural risk discount (-20 points)
    score = Math.max(0, score - 20);
  }

  // 4. Past Customer Delivery & RTO History
  if (Array.isArray(pastOrders) && pastOrders.length > 0) {
    let rtoCount = 0;
    let cancelCount = 0;

    for (const ord of pastOrders) {
      const status = (ord.status || '').toUpperCase();
      if (status === 'RTO' || status === 'FAILED' || ord.deliveryAttempts?.length >= 3) {
        rtoCount++;
      } else if (status === 'CANCELLED') {
        cancelCount++;
      }
    }

    if (rtoCount > 0) {
      const penalty = Math.min(60, rtoCount * 30);
      score += penalty;
      reasons.push(`Customer has ${rtoCount} past RTO/failed delivery record(s) (+${penalty} risk)`);
    }

    if (cancelCount >= 3) {
      score += 20;
      reasons.push(`Customer has high cancellation frequency (${cancelCount} prior cancellations)`);
    }
  }

  // Clamp risk score to 0 - 100
  const finalScore = Math.min(100, Math.max(0, Math.round(score)));

  let level = 'LOW';
  if (finalScore >= 70) {
    level = 'HIGH';
  } else if (finalScore >= 30) {
    level = 'MEDIUM';
  }

  const isHighRisk = level === 'HIGH';
  // Automated OTP/deposit verification required if COD and high risk (or risk score >= 70)
  const verificationRequired = isCod && isHighRisk;

  return {
    score: finalScore,
    level,
    reasons: reasons.length > 0 ? reasons : ['Clean address syntax, verified phone, and standard order value.'],
    isHighRisk,
    verificationRequired,
  };
}

module.exports = {
  calculateRtoRisk,
  SUSPICIOUS_KEYWORDS,
};
