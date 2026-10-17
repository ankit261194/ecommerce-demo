const CodReconciliation = require('../models/CodReconciliation');
const DeliveryTask = require('../models/DeliveryTask');
const SubOrder = require('../models/SubOrder');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// @desc    Get Master COD Vault Telemetry & Summary
// @route   GET /api/cod-vault/summary
// @access  Private (Super Admin / Staff)
exports.getVaultSummary = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Cash currently inside Vault (verified but not yet deposited to bank)
    const vaultReconciliations = await CodReconciliation.find({
      status: 'VERIFIED',
      'bankDeposit.isDeposited': { $ne: true },
    });
    const cashInVault = vaultReconciliations.reduce((sum, r) => sum + (r.totalCounted || 0), 0);

    // 2. Cash currently in transit (Delivered COD tasks not yet verified)
    const inTransitTasks = await DeliveryTask.find({
      isCod: true,
      status: 'DELIVERED',
      $or: [
        { 'codReconciliation.status': { $in: ['PENDING', 'SUBMITTED'] } },
        { codReconciliation: { $exists: false } },
        { 'codReconciliation.status': { $exists: false } },
      ],
    });
    const cashInTransit = inTransitTasks.reduce((sum, t) => sum + (t.amountCollected || t.amountToCollect || 0), 0);

    // 3. Settled Today
    const todaySettlements = await CodReconciliation.find({
      status: { $in: ['VERIFIED', 'DEPOSITED_TO_BANK'] },
      verifiedAt: { $gte: todayStart },
    });
    const totalSettledToday = todaySettlements.reduce((sum, r) => sum + (r.totalCounted || 0), 0);

    // 4. Net Discrepancies (Shortages)
    const allReconciliations = await CodReconciliation.find({});
    const totalShortages = allReconciliations.reduce((sum, r) => {
      return r.discrepancy < 0 ? sum + Math.abs(r.discrepancy) : sum;
    }, 0);
    const totalExcess = allReconciliations.reduce((sum, r) => {
      return r.discrepancy > 0 ? sum + r.discrepancy : sum;
    }, 0);

    // 5. Total Deposited to Bank
    const bankDeposited = await CodReconciliation.find({
      $or: [{ status: 'DEPOSITED_TO_BANK' }, { 'bankDeposit.isDeposited': true }],
    });
    const totalDepositedToBank = bankDeposited.reduce((sum, r) => sum + (r.totalCounted || 0), 0);

    // 6. Counts
    const pendingHandoversCount = await CodReconciliation.countDocuments({ status: 'SUBMITTED' });
    const verifiedHandoversCount = await CodReconciliation.countDocuments({ status: 'VERIFIED' });

    // Distinct riders carrying unhanded cash
    const riderIdsWithCash = [...new Set(inTransitTasks.map((t) => t.deliveryPartner?.toString()).filter(Boolean))];

    res.status(200).json({
      success: true,
      data: {
        cashInVault,
        cashInTransit,
        totalSettledToday,
        totalShortages,
        totalExcess,
        totalDepositedToBank,
        pendingHandoversCount,
        verifiedHandoversCount,
        activeRidersWithCashCount: riderIdsWithCash.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List All COD Vault Settlements with Filters
// @route   GET /api/cod-vault/settlements
// @access  Private (Super Admin / Staff)
exports.getVaultSettlements = async (req, res, next) => {
  try {
    const { status, search, deliveryPartner } = req.query;
    const filter = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (deliveryPartner) {
      filter.deliveryPartner = deliveryPartner;
    }

    if (search && search.trim()) {
      filter.$or = [
        { reconciliationId: { $regex: search.trim(), $options: 'i' } },
        { depositSlipNumber: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const settlements = await CodReconciliation.find(filter)
      .populate('deliveryPartner', 'name phone email')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: settlements.length,
      data: settlements,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Detailed Pending Cash for Riders
// @route   GET /api/cod-vault/riders-pending-cash
// @access  Private (Super Admin / Staff)
exports.getPendingRidersWithCash = async (req, res, next) => {
  try {
    const tasks = await DeliveryTask.find({
      isCod: true,
      status: 'DELIVERED',
      $or: [
        { 'codReconciliation.status': { $in: ['PENDING', 'SUBMITTED'] } },
        { codReconciliation: { $exists: false } },
        { 'codReconciliation.status': { $exists: false } },
      ],
    })
      .populate('deliveryPartner', 'name phone email')
      .populate('subOrder', 'subOrderId totalAmount');

    const riderMap = {};

    tasks.forEach((t) => {
      const rider = t.deliveryPartner;
      if (!rider) return;
      const rId = rider._id.toString();

      if (!riderMap[rId]) {
        riderMap[rId] = {
          riderId: rId,
          name: rider.name || 'Courier Partner',
          phone: rider.phone || '',
          email: rider.email || '',
          totalPendingCash: 0,
          deliveredOrdersCount: 0,
          tasks: [],
        };
      }

      const amt = t.amountCollected || t.amountToCollect || 0;
      riderMap[rId].totalPendingCash += amt;
      riderMap[rId].deliveredOrdersCount += 1;
      riderMap[rId].tasks.push({
        taskId: t._id,
        orderNumber: t.subOrder?.subOrderId || `TASK-${t._id.toString().slice(-4)}`,
        amount: amt,
        deliveredAt: t.deliveredAt || t.updatedAt,
      });
    });

    const ridersList = Object.values(riderMap).sort((a, b) => b.totalPendingCash - a.totalPendingCash);

    res.status(200).json({
      success: true,
      count: ridersList.length,
      data: ridersList,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate Shift COD Cash Handover (Rider or Hub Dispatcher)
// @route   POST /api/cod-vault/handover/initiate
// @access  Private (Rider / Super Admin)
exports.initiateHandover = async (req, res, next) => {
  try {
    const {
      riderId,
      taskIds,
      denominations = {},
      depositMethod = 'HUB_CASH_DESK',
      depositSlipNumber = '',
      notes = '',
      hubCode = 'CENTRAL-VAULT',
    } = req.body;

    const partnerId = req.user.role === 'superadmin' && riderId ? riderId : req.user._id;

    // Calculate counted cash from currency denominations
    const d2000 = Math.max(0, parseInt(denominations.d2000 || 0, 10));
    const d500 = Math.max(0, parseInt(denominations.d500 || 0, 10));
    const d200 = Math.max(0, parseInt(denominations.d200 || 0, 10));
    const d100 = Math.max(0, parseInt(denominations.d100 || 0, 10));
    const d50 = Math.max(0, parseInt(denominations.d50 || 0, 10));
    const d20 = Math.max(0, parseInt(denominations.d20 || 0, 10));
    const d10 = Math.max(0, parseInt(denominations.d10 || 0, 10));
    const coins = Math.max(0, parseFloat(denominations.coins || 0));

    const totalCounted =
      d2000 * 2000 +
      d500 * 500 +
      d200 * 200 +
      d100 * 100 +
      d50 * 50 +
      d20 * 20 +
      d10 * 10 +
      coins;

    // Find associated tasks
    const taskQuery = {
      isCod: true,
      status: 'DELIVERED',
      deliveryPartner: partnerId,
    };

    if (Array.isArray(taskIds) && taskIds.length > 0) {
      taskQuery._id = { $in: taskIds };
    }

    const tasks = await DeliveryTask.find(taskQuery).populate('subOrder');

    const totalExpected = tasks.reduce(
      (sum, t) => sum + (t.amountCollected || t.amountToCollect || 0),
      0
    );

    const discrepancy = totalCounted - totalExpected;
    const reconciliationId = `COD-REC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const handoverOtp = Math.floor(1000 + Math.random() * 9000).toString();

    let varianceStatus = 'EXACT_MATCH';
    if (discrepancy < 0) varianceStatus = 'SHORTAGE_PENDING';
    else if (discrepancy > 0) varianceStatus = 'EXCESS_UNCLAIMED';

    const ordersAudit = tasks.map((t) => ({
      orderNumber: t.subOrder?.subOrderId || `TASK-${t._id.toString().slice(-6).toUpperCase()}`,
      subOrderNumber: t.subOrder?._id?.toString() || '',
      amount: t.amountCollected || t.amountToCollect || 0,
      customerName: t.dropLocation?.recipientName || 'Customer',
      deliveredAt: t.deliveredAt || new Date(),
    }));

    const settlement = await CodReconciliation.create({
      reconciliationId,
      deliveryPartner: partnerId,
      tasks: tasks.map((t) => t._id),
      denominations: { d2000, d500, d200, d100, d50, d20, d10, coins },
      totalExpected,
      totalCounted,
      discrepancy,
      varianceStatus,
      handoverOtp,
      depositMethod,
      depositSlipNumber: depositSlipNumber.trim(),
      notes: notes.trim(),
      status: 'SUBMITTED',
      ordersAudit,
      hubCode,
    });

    // Mark tasks as SUBMITTED
    if (tasks.length > 0) {
      await DeliveryTask.updateMany(
        { _id: { $in: tasks.map((t) => t._id) } },
        {
          $set: {
            'codReconciliation.status': 'SUBMITTED',
            'codReconciliation.submittedAt': new Date(),
            'codReconciliation.referenceCode': reconciliationId,
          },
        }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Cash handover initiated! Share the 4-digit Handover OTP with the Vault Manager.',
      data: {
        reconciliationId: settlement.reconciliationId,
        handoverOtp: settlement.handoverOtp,
        totalExpected: settlement.totalExpected,
        totalCounted: settlement.totalCounted,
        discrepancy: settlement.discrepancy,
        varianceStatus: settlement.varianceStatus,
        status: settlement.status,
        ordersCount: tasks.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Super Admin Verify Handover OTP & Accept Cash into Vault
// @route   POST /api/cod-vault/handover/verify-otp
// @access  Private (Super Admin)
exports.verifyHandoverOtp = async (req, res, next) => {
  try {
    const { reconciliationId, otp, adminRemarks = '' } = req.body;

    if (!reconciliationId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Reconciliation ID and 4-digit Handover OTP are required.',
      });
    }

    const settlement = await CodReconciliation.findOne({
      $or: [{ reconciliationId }, { _id: reconciliationId.match(/^[0-9a-fA-F]{24}$/) ? reconciliationId : null }],
    }).populate('deliveryPartner', 'name phone email');

    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement record not found.' });
    }

    if (settlement.status === 'VERIFIED' || settlement.status === 'DEPOSITED_TO_BANK') {
      return res.status(400).json({ success: false, message: 'Settlement is already verified and locked in vault.' });
    }

    if (settlement.handoverOtp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Handover OTP! Physical count verification rejected.',
      });
    }

    settlement.status = 'VERIFIED';
    settlement.adminRemarks = adminRemarks.trim();
    settlement.verifiedBy = req.user._id;
    settlement.verifiedAt = new Date();

    if (settlement.discrepancy === 0) settlement.varianceStatus = 'EXACT_MATCH';
    else if (settlement.discrepancy < 0) settlement.varianceStatus = 'SHORTAGE_PENDING';
    else if (settlement.discrepancy > 0) settlement.varianceStatus = 'EXCESS_UNCLAIMED';

    await settlement.save();

    // Mark delivery tasks as VERIFIED
    if (settlement.tasks && settlement.tasks.length > 0) {
      await DeliveryTask.updateMany(
        { _id: { $in: settlement.tasks } },
        {
          $set: {
            'codReconciliation.status': 'VERIFIED',
            'codReconciliation.reconciledAt': new Date(),
          },
        }
      );
    }

    // Check remaining cash-in-hand for rider and unlock if under limit
    if (settlement.deliveryPartner) {
      const remainingTasks = await DeliveryTask.find({
        deliveryPartner: settlement.deliveryPartner._id || settlement.deliveryPartner,
        isCod: true,
        status: 'DELIVERED',
        $or: [
          { 'codReconciliation.status': { $in: ['PENDING', 'SUBMITTED'] } },
          { codReconciliation: { $exists: false } },
          { 'codReconciliation.status': { $exists: false } },
        ],
      });
      const remainingCih = remainingTasks.reduce((sum, t) => sum + (t.amountCollected || t.amountToCollect || 0), 0);
      const riderUser = await User.findById(settlement.deliveryPartner._id || settlement.deliveryPartner);
      if (riderUser && remainingCih < (riderUser.cashInHandLimit || 10000)) {
        riderUser.isCashLimitLocked = false;
        await riderUser.save();
      }
    }

    // Audit Log entry
    await AuditLog.create({
      action: 'COD_SETTLEMENT_VERIFIED',
      performedBy: req.user._id,
      targetType: 'COD_SETTLEMENT',
      targetId: settlement.reconciliationId,
      details: {
        rider: settlement.deliveryPartner?.name,
        totalCounted: settlement.totalCounted,
        totalExpected: settlement.totalExpected,
        discrepancy: settlement.discrepancy,
        varianceStatus: settlement.varianceStatus,
      },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Handover verified! ₹${settlement.totalCounted.toLocaleString('en-IN')} locked into Vault.`,
      data: settlement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record Bank Deposit for Vault Cash
// @route   POST /api/cod-vault/bank-deposit/:id
// @access  Private (Super Admin)
exports.recordBankDeposit = async (req, res, next) => {
  try {
    const { bankName, accountNumber, transactionReference, notes = '' } = req.body;

    if (!bankName || !transactionReference) {
      return res.status(400).json({
        success: false,
        message: 'Bank Name and Transaction Reference / UTR Number are required.',
      });
    }

    const settlement = await CodReconciliation.findById(req.params.id);
    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement record not found.' });
    }

    settlement.bankDeposit = {
      isDeposited: true,
      bankName: bankName.trim(),
      accountNumber: (accountNumber || '').trim(),
      transactionReference: transactionReference.trim(),
      depositedAt: new Date(),
      depositedBy: req.user._id,
    };
    settlement.status = 'DEPOSITED_TO_BANK';
    if (notes) settlement.notes = `${settlement.notes ? settlement.notes + ' | ' : ''}Bank Deposit: ${notes.trim()}`;
    await settlement.save();

    // Log Audit
    await AuditLog.create({
      action: 'COD_BANK_DEPOSIT_RECORDED',
      performedBy: req.user._id,
      targetType: 'COD_SETTLEMENT',
      targetId: settlement.reconciliationId,
      details: {
        bankName,
        transactionReference,
        amount: settlement.totalCounted,
      },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Bank deposit recorded! ₹${settlement.totalCounted.toLocaleString('en-IN')} credited via ${bankName} (Ref: ${transactionReference}).`,
      data: settlement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate Printable Cash Settlement Slip (4x6 / A4)
// @route   GET /api/cod-vault/slip/:id
// @access  Public (Slip Viewer / Print)
exports.getPrintableSettlementSlip = async (req, res, next) => {
  try {
    const settlement = await CodReconciliation.findOne({
      $or: [{ reconciliationId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    })
      .populate('deliveryPartner', 'name phone email')
      .populate('verifiedBy', 'name email');

    if (!settlement) {
      return res.status(404).send('<h1>Settlement slip not found</h1>');
    }

    const d = settlement.denominations || {};
    const notesBreakdown = [
      { note: '₹2000', count: d.d2000 || 0, subtotal: (d.d2000 || 0) * 2000 },
      { note: '₹500', count: d.d500 || 0, subtotal: (d.d500 || 0) * 500 },
      { note: '₹200', count: d.d200 || 0, subtotal: (d.d200 || 0) * 200 },
      { note: '₹100', count: d.d100 || 0, subtotal: (d.d100 || 0) * 100 },
      { note: '₹50', count: d.d50 || 0, subtotal: (d.d50 || 0) * 50 },
      { note: '₹20', count: d.d20 || 0, subtotal: (d.d20 || 0) * 20 },
      { note: '₹10', count: d.d10 || 0, subtotal: (d.d10 || 0) * 10 },
      { note: 'Coins', count: '-', subtotal: d.coins || 0 },
    ].filter((item) => item.subtotal > 0 || item.count > 0);

    const isMismatch = settlement.discrepancy !== 0;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>COD Cash Handover Slip - ${settlement.reconciliationId}</title>
  <style>
    @page { size: 105mm 148mm; margin: 6mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 12px; color: #0f172a; font-size: 11px; line-height: 1.3; }
    .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 8px; margin-bottom: 8px; }
    .title { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
    .sub { font-size: 10px; color: #64748b; font-weight: bold; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-weight: 900; font-size: 9px; text-transform: uppercase; margin-top: 4px; }
    .badge-verified { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .badge-pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; }
    .box-title { font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; }
    .box-val { font-size: 11px; font-weight: 900; color: #0f172a; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 8px; font-size: 10px; }
    th { background: #f1f5f9; padding: 4px 6px; text-align: left; font-weight: 900; border-bottom: 1px solid #cbd5e1; font-size: 9px; text-transform: uppercase; }
    td { padding: 4px 6px; border-bottom: 1px solid #f1f5f9; }
    .text-right { text-align: right; }
    .total-row { font-weight: 900; background: #f8fafc; border-top: 1px solid #cbd5e1; }
    .mismatch-box { padding: 6px; border-radius: 6px; margin-bottom: 8px; font-size: 10px; }
    .mismatch-short { background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; }
    .mismatch-exact { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; padding-top: 8px; border-top: 1px dashed #cbd5e1; text-align: center; }
    .sig-line { border-top: 1px solid #94a3b8; margin-top: 24px; padding-top: 2px; font-size: 9px; font-weight: bold; }
    .footer { text-align: center; font-size: 8px; color: #94a3b8; margin-top: 10px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 10px; text-align: right;">
    <button onclick="window.print()" style="padding: 6px 14px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
      🖨️ Print Cash Slip
    </button>
  </div>

  <div class="header">
    <div class="title">AuraMarket • Cash Reconciliation Slip</div>
    <div class="sub">COD Shift Handover & Vault Receipt</div>
    <span class="badge ${settlement.status === 'VERIFIED' || settlement.status === 'DEPOSITED_TO_BANK' ? 'badge-verified' : 'badge-pending'}">
      ${settlement.status}
    </span>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-title">Settlement Ref #</div>
      <div class="box-val font-mono">${settlement.reconciliationId}</div>
    </div>
    <div class="box">
      <div class="box-title">Handover OTP</div>
      <div class="box-val font-mono">${settlement.handoverOtp}</div>
    </div>
    <div class="box">
      <div class="box-title">Delivery Rider</div>
      <div class="box-val">${settlement.deliveryPartner?.name || 'Courier Partner'}</div>
      <div style="font-size: 9px; color: #64748b;">${settlement.deliveryPartner?.phone || 'N/A'}</div>
    </div>
    <div class="box">
      <div class="box-title">Vault / Hub</div>
      <div class="box-val">${settlement.hubCode || 'CENTRAL-VAULT'}</div>
      <div style="font-size: 9px; color: #64748b;">${new Date(settlement.shiftDate).toLocaleDateString('en-IN')}</div>
    </div>
  </div>

  <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #475569; margin-top: 4px;">
    Currency Denomination Count
  </div>
  <table>
    <thead>
      <tr>
        <th>Note Denomination</th>
        <th class="text-right">Count</th>
        <th class="text-right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${notesBreakdown
        .map(
          (n) => `<tr>
        <td><strong>${n.note}</strong></td>
        <td class="text-right">${n.count}</td>
        <td class="text-right">₹${n.subtotal.toLocaleString('en-IN')}</td>
      </tr>`
        )
        .join('')}
      <tr class="total-row">
        <td>TOTAL PHYSICAL CASH COUNTED</td>
        <td class="text-right">-</td>
        <td class="text-right">₹${settlement.totalCounted.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>Expected COD from Orders</td>
        <td class="text-right">-</td>
        <td class="text-right">₹${settlement.totalExpected.toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>

  <div class="mismatch-box ${isMismatch ? 'mismatch-short' : 'mismatch-exact'}">
    <strong>Auditor Verdict:</strong>
    ${
      settlement.discrepancy === 0
        ? '✅ Exact Match! Zero discrepancy in physical cash handover.'
        : settlement.discrepancy < 0
        ? `⚠️ Cash Shortage: -₹${Math.abs(settlement.discrepancy).toLocaleString('en-IN')} pending rider adjustment.`
        : `⚡ Excess Cash: +₹${settlement.discrepancy.toLocaleString('en-IN')} submitted.`
    }
    ${settlement.adminRemarks ? `<div style="margin-top: 3px; font-style: italic;">Remarks: "${settlement.adminRemarks}"</div>` : ''}
  </div>

  <div class="signatures">
    <div>
      <div style="font-weight: bold; font-size: 9px;">${settlement.deliveryPartner?.name || 'Rider'}</div>
      <div class="sig-line">Rider Signature</div>
    </div>
    <div>
      <div style="font-weight: bold; font-size: 9px;">${settlement.verifiedBy?.name || 'Vault Admin'}</div>
      <div class="sig-line">Admin Vault Stamp</div>
    </div>
  </div>

  <div class="footer">
    AuraMarket Multi-Vendor Commerce Platform • Immutable Audit Record • Point #45
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Rider Live Cash-in-Hand Telemetry & Threshold Status (Point #45)
// @route   GET /api/cod-vault/rider/cash-in-hand
// @access  Private (Rider / Super Admin / Admin)
exports.getRiderCashInHandTelemetry = async (req, res, next) => {
  try {
    const riderId = req.user.role === 'delivery' ? req.user._id : (req.query.riderId || req.user._id);

    const rider = await User.findById(riderId).select('name phone email cashInHandLimit isCashLimitLocked cashLimitLockedAt');
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    const unremittedTasks = await DeliveryTask.find({
      deliveryPartner: rider._id,
      isCod: true,
      status: 'DELIVERED',
      $or: [
        { 'codReconciliation.status': { $in: ['PENDING', 'SUBMITTED'] } },
        { codReconciliation: { $exists: false } },
        { 'codReconciliation.status': { $exists: false } },
      ],
    })
      .populate('subOrder', 'subOrderId totalAmount')
      .sort({ deliveredAt: -1 });

    const currentCashInHand = unremittedTasks.reduce((sum, t) => sum + (t.amountCollected || t.amountToCollect || 0), 0);
    const cashInHandLimit = rider.cashInHandLimit || 10000;
    const utilizationPercentage = Math.min(100, Math.round((currentCashInHand / cashInHandLimit) * 100));
    const isLimitExceeded = currentCashInHand >= cashInHandLimit;
    const isWarning = currentCashInHand >= cashInHandLimit * 0.8;

    // Auto-lock if threshold breached and not already locked
    let isLocked = Boolean(rider.isCashLimitLocked);
    if (isLimitExceeded && !isLocked) {
      rider.isCashLimitLocked = true;
      rider.cashLimitLockedAt = new Date();
      await rider.save();
      isLocked = true;
    }

    const remainingAllowance = Math.max(0, cashInHandLimit - currentCashInHand);

    const ordersBreakdown = unremittedTasks.map((t) => ({
      taskId: t._id,
      orderNumber: t.subOrder?.subOrderId || `TASK-${t._id.toString().slice(-6).toUpperCase()}`,
      amount: t.amountCollected || t.amountToCollect || 0,
      customerName: t.dropLocation?.recipientName || 'Customer',
      deliveredAt: t.deliveredAt || t.updatedAt,
      reconciliationStatus: t.codReconciliation?.status || 'PENDING',
    }));

    res.status(200).json({
      success: true,
      data: {
        riderId: rider._id,
        riderName: rider.name,
        riderPhone: rider.phone,
        currentCashInHand,
        cashInHandLimit,
        utilizationPercentage,
        isLimitExceeded,
        isWarning,
        isCashLimitLocked: isLocked,
        cashLimitLockedAt: rider.cashLimitLockedAt,
        remainingAllowance,
        unremittedTasksCount: unremittedTasks.length,
        ordersBreakdown,
        canAcceptNewCodOrders: !isLocked && !isLimitExceeded,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Riders Cash-in-Hand Threshold Radar (Point #45)
// @route   GET /api/cod-vault/riders-limit-monitor
// @access  Private (Super Admin / Admin)
exports.getRidersLimitMonitor = async (req, res, next) => {
  try {
    const riders = await User.find({
      role: 'delivery',
      isActive: true,
    }).select('name phone email cashInHandLimit isCashLimitLocked cashLimitLockedAt dutyStatus');

    const tasks = await DeliveryTask.find({
      isCod: true,
      status: 'DELIVERED',
      $or: [
        { 'codReconciliation.status': { $in: ['PENDING', 'SUBMITTED'] } },
        { codReconciliation: { $exists: false } },
        { 'codReconciliation.status': { $exists: false } },
      ],
    });

    const cashByRider = {};
    const taskCountByRider = {};

    tasks.forEach((t) => {
      const rId = t.deliveryPartner?.toString();
      if (!rId) return;
      const amt = t.amountCollected || t.amountToCollect || 0;
      cashByRider[rId] = (cashByRider[rId] || 0) + amt;
      taskCountByRider[rId] = (taskCountByRider[rId] || 0) + 1;
    });

    let totalCashOnRoad = 0;
    let breachedCount = 0;
    let warningCount = 0;

    const ridersList = riders.map((r) => {
      const rId = r._id.toString();
      const currentCash = cashByRider[rId] || 0;
      const limit = r.cashInHandLimit || 10000;
      const utilPct = Math.min(100, Math.round((currentCash / limit) * 100));
      const isBreached = currentCash >= limit || r.isCashLimitLocked;
      const isWarn = currentCash >= limit * 0.8 && !isBreached;

      totalCashOnRoad += currentCash;
      if (isBreached) breachedCount += 1;
      if (isWarn) warningCount += 1;

      return {
        riderId: r._id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        dutyStatus: r.dutyStatus,
        cashInHandLimit: limit,
        isCashLimitLocked: Boolean(r.isCashLimitLocked),
        cashLimitLockedAt: r.cashLimitLockedAt,
        currentCashInHand: currentCash,
        utilizationPercentage: utilPct,
        unremittedTasksCount: taskCountByRider[rId] || 0,
        status: isBreached ? 'BREACHED_LOCKED' : (isWarn ? 'WARNING' : 'NORMAL'),
      };
    });

    ridersList.sort((a, b) => b.currentCashInHand - a.currentCashInHand);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRiders: riders.length,
          totalRidersWithCash: Object.keys(cashByRider).length,
          totalCashOnRoad,
          breachedRidersCount: breachedCount,
          warningRidersCount: warningCount,
        },
        riders: ridersList,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Rider Cash-in-Hand Limit or Unlock (Point #45)
// @route   PUT /api/cod-vault/riders/:id/cash-limit
// @access  Private (Super Admin)
exports.updateRiderCashLimit = async (req, res, next) => {
  try {
    const { cashInHandLimit, isCashLimitLocked } = req.body;
    const rider = await User.findById(req.params.id);
    if (!rider || rider.role !== 'delivery') {
      return res.status(404).json({ success: false, message: 'Delivery rider not found' });
    }

    if (cashInHandLimit !== undefined) {
      rider.cashInHandLimit = Math.max(1000, Number(cashInHandLimit));
    }
    if (isCashLimitLocked !== undefined) {
      rider.isCashLimitLocked = Boolean(isCashLimitLocked);
      rider.cashLimitLockedAt = rider.isCashLimitLocked ? new Date() : null;
    }

    await rider.save();

    await AuditLog.create({
      action: 'COD_RIDER_LIMIT_UPDATED',
      module: 'LOGISTICS',
      description: `Rider ${rider.name} COD limit updated to ₹${rider.cashInHandLimit}${rider.isCashLimitLocked ? ' (Locked)' : ' (Unlocked)'}`,
      performedBy: req.user._id,
      targetType: 'USER',
      targetId: rider._id.toString(),
      details: {
        riderName: rider.name,
        cashInHandLimit: rider.cashInHandLimit,
        isCashLimitLocked: rider.isCashLimitLocked,
      },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Rider ${rider.name} cash limit updated to ₹${rider.cashInHandLimit.toLocaleString('en-IN')}${rider.isCashLimitLocked ? ' (Locked)' : ' (Unlocked)'}!`,
      data: {
        riderId: rider._id,
        name: rider.name,
        cashInHandLimit: rider.cashInHandLimit,
        isCashLimitLocked: rider.isCashLimitLocked,
        cashLimitLockedAt: rider.cashLimitLockedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Raise Variance Dispute on COD Settlement (Point #45)
// @route   POST /api/cod-vault/settlements/:id/dispute
// @access  Private (Rider / Super Admin)
exports.raiseDispute = async (req, res, next) => {
  try {
    const { reason = '' } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Dispute reason is required.' });
    }

    const settlement = await CodReconciliation.findOne({
      $or: [{ reconciliationId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    }).populate('deliveryPartner', 'name phone email');

    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement record not found.' });
    }

    settlement.status = 'DISPUTED';
    settlement.varianceStatus = 'DISPUTE_RAISED';
    settlement.dispute = {
      isDisputed: true,
      reason: reason.trim(),
      raisedBy: req.user._id,
      raisedAt: new Date(),
      resolution: '',
      resolvedBy: null,
      resolvedAt: null,
      adjustmentAmount: 0,
      recoveryMode: 'NONE',
    };

    await settlement.save();

    await AuditLog.create({
      action: 'COD_DISPUTE_RAISED',
      module: 'LOGISTICS',
      description: `Dispute raised on COD settlement ${settlement.reconciliationId}: ${reason.trim()}`,
      performedBy: req.user._id,
      targetType: 'COD_SETTLEMENT',
      targetId: settlement.reconciliationId,
      details: {
        reconciliationId: settlement.reconciliationId,
        discrepancy: settlement.discrepancy,
        reason: reason.trim(),
      },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Dispute raised for settlement ${settlement.reconciliationId}. Pending audit resolution.`,
      data: settlement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve Discrepancy Dispute & Adjust Variance (Point #45)
// @route   POST /api/cod-vault/settlements/:id/resolve-dispute
// @access  Private (Super Admin)
exports.resolveDispute = async (req, res, next) => {
  try {
    const { resolution, adjustmentAmount = 0, recoveryMode = 'NONE' } = req.body;
    if (!resolution || !resolution.trim()) {
      return res.status(400).json({ success: false, message: 'Dispute resolution description is required.' });
    }

    const settlement = await CodReconciliation.findOne({
      $or: [{ reconciliationId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    }).populate('deliveryPartner', 'name phone email');

    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement record not found.' });
    }

    settlement.status = 'VERIFIED';
    settlement.varianceStatus = 'DISPUTE_RESOLVED';
    settlement.verifiedBy = req.user._id;
    settlement.verifiedAt = new Date();
    settlement.adminRemarks = `${settlement.adminRemarks ? settlement.adminRemarks + ' | ' : ''}Dispute Resolved: ${resolution.trim()} (Mode: ${recoveryMode})`;

    settlement.dispute = {
      ...settlement.dispute,
      isDisputed: false,
      resolution: resolution.trim(),
      resolvedBy: req.user._id,
      resolvedAt: new Date(),
      adjustmentAmount: Number(adjustmentAmount) || 0,
      recoveryMode,
    };

    await settlement.save();

    // Mark delivery tasks as VERIFIED
    if (settlement.tasks && settlement.tasks.length > 0) {
      await DeliveryTask.updateMany(
        { _id: { $in: settlement.tasks } },
        {
          $set: {
            'codReconciliation.status': 'VERIFIED',
            'codReconciliation.reconciledAt': new Date(),
          },
        }
      );
    }

    // Re-check rider lock status
    if (settlement.deliveryPartner) {
      const remainingTasks = await DeliveryTask.find({
        deliveryPartner: settlement.deliveryPartner._id || settlement.deliveryPartner,
        isCod: true,
        status: 'DELIVERED',
        $or: [
          { 'codReconciliation.status': { $in: ['PENDING', 'SUBMITTED'] } },
          { codReconciliation: { $exists: false } },
          { 'codReconciliation.status': { $exists: false } },
        ],
      });
      const remainingCih = remainingTasks.reduce((sum, t) => sum + (t.amountCollected || t.amountToCollect || 0), 0);
      const riderUser = await User.findById(settlement.deliveryPartner._id || settlement.deliveryPartner);
      if (riderUser && remainingCih < (riderUser.cashInHandLimit || 10000)) {
        riderUser.isCashLimitLocked = false;
        await riderUser.save();
      }
    }

    await AuditLog.create({
      action: 'COD_DISPUTE_RESOLVED',
      module: 'LOGISTICS',
      description: `Dispute resolved on COD settlement ${settlement.reconciliationId}: ${resolution.trim()} (Mode: ${recoveryMode})`,
      performedBy: req.user._id,
      targetType: 'COD_SETTLEMENT',
      targetId: settlement.reconciliationId,
      details: {
        reconciliationId: settlement.reconciliationId,
        resolution: resolution.trim(),
        adjustmentAmount,
        recoveryMode,
      },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Dispute resolved successfully! Settlement locked into vault with mode: ${recoveryMode}.`,
      data: settlement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record Physical Cash Remittance Drop into Hub Vault (Point #45)
// @route   POST /api/cod-vault/handover/vault-drop
// @access  Private (Super Admin / Admin)
exports.recordVaultRemittanceDrop = async (req, res, next) => {
  try {
    const { reconciliationId, bagSealNumber, cashierName, vaultLocation = 'CENTRAL-VAULT-MAIN' } = req.body;

    if (!reconciliationId) {
      return res.status(400).json({ success: false, message: 'Reconciliation ID is required.' });
    }

    const settlement = await CodReconciliation.findOne({
      $or: [{ reconciliationId }, { _id: reconciliationId.match(/^[0-9a-fA-F]{24}$/) ? reconciliationId : null }],
    }).populate('deliveryPartner', 'name phone email');

    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement record not found.' });
    }

    const batchId = `VAULT-BATCH-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    settlement.status = 'VERIFIED';
    settlement.verifiedBy = req.user._id;
    settlement.verifiedAt = new Date();
    settlement.varianceStatus = settlement.discrepancy === 0 ? 'EXACT_MATCH' : (settlement.discrepancy < 0 ? 'SHORTAGE_PENDING' : 'EXCESS_UNCLAIMED');

    settlement.cashRemittanceBatch = {
      batchId,
      cashierName: (cashierName || req.user.name || 'Chief Cashier').trim(),
      vaultLocation: (vaultLocation || settlement.hubCode || 'CENTRAL-VAULT-MAIN').trim(),
      receivedAmount: settlement.totalCounted,
      bagSealNumber: (bagSealNumber || `SEAL-${Date.now().toString().slice(-6)}`).trim(),
      remittedAt: new Date(),
    };

    await settlement.save();

    // Mark delivery tasks as VERIFIED
    if (settlement.tasks && settlement.tasks.length > 0) {
      await DeliveryTask.updateMany(
        { _id: { $in: settlement.tasks } },
        {
          $set: {
            'codReconciliation.status': 'VERIFIED',
            'codReconciliation.reconciledAt': new Date(),
          },
        }
      );
    }

    // Re-check rider limit
    if (settlement.deliveryPartner) {
      const remainingTasks = await DeliveryTask.find({
        deliveryPartner: settlement.deliveryPartner._id || settlement.deliveryPartner,
        isCod: true,
        status: 'DELIVERED',
        $or: [
          { 'codReconciliation.status': { $in: ['PENDING', 'SUBMITTED'] } },
          { codReconciliation: { $exists: false } },
          { 'codReconciliation.status': { $exists: false } },
        ],
      });
      const remainingCih = remainingTasks.reduce((sum, t) => sum + (t.amountCollected || t.amountToCollect || 0), 0);
      const riderUser = await User.findById(settlement.deliveryPartner._id || settlement.deliveryPartner);
      if (riderUser && remainingCih < (riderUser.cashInHandLimit || 10000)) {
        riderUser.isCashLimitLocked = false;
        await riderUser.save();
      }
    }

    await AuditLog.create({
      action: 'COD_VAULT_DROP_COMPLETED',
      module: 'LOGISTICS',
      description: `Cash remittance batch ${batchId} deposited into ${vaultLocation} (Seal: ${settlement.cashRemittanceBatch.bagSealNumber})`,
      performedBy: req.user._id,
      targetType: 'COD_SETTLEMENT',
      targetId: settlement.reconciliationId,
      details: {
        batchId,
        vaultLocation,
        bagSealNumber: settlement.cashRemittanceBatch.bagSealNumber,
        receivedAmount: settlement.totalCounted,
      },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Cash remittance batch ${batchId} deposited into ${vaultLocation} (Seal: ${settlement.cashRemittanceBatch.bagSealNumber})!`,
      data: settlement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export COD Settlements Audit Ledger CSV (Point #45)
// @route   GET /api/cod-vault/export-csv
// @access  Private (Super Admin / Admin)
exports.exportSettlementsCsv = async (req, res, next) => {
  try {
    const settlements = await CodReconciliation.find({})
      .populate('deliveryPartner', 'name phone email')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'Reconciliation ID',
      'Shift Date',
      'Rider Name',
      'Rider Phone',
      'Deposit Method',
      'Deposit Slip Number',
      'Total Expected (INR)',
      'Total Counted (INR)',
      'Discrepancy (INR)',
      'Status',
      'Variance Status',
      'Handover OTP',
      'Verified At',
      'Verified By',
      'Bank Name',
      'Bank UTR Ref',
      'Vault Batch ID',
      'Bag Seal Number',
      'Dispute Status',
      'Dispute Resolution',
    ];

    const rows = settlements.map((s) => [
      escapeCsv(s.reconciliationId),
      escapeCsv(s.shiftDate ? new Date(s.shiftDate).toISOString().split('T')[0] : ''),
      escapeCsv(s.deliveryPartner?.name || 'N/A'),
      escapeCsv(s.deliveryPartner?.phone || 'N/A'),
      escapeCsv(s.depositMethod || 'HUB_CASH_DESK'),
      escapeCsv(s.depositSlipNumber || ''),
      s.totalExpected || 0,
      s.totalCounted || 0,
      s.discrepancy || 0,
      escapeCsv(s.status),
      escapeCsv(s.varianceStatus || 'NONE'),
      escapeCsv(s.handoverOtp || ''),
      escapeCsv(s.verifiedAt ? new Date(s.verifiedAt).toISOString() : ''),
      escapeCsv(s.verifiedBy?.name || ''),
      escapeCsv(s.bankDeposit?.bankName || ''),
      escapeCsv(s.bankDeposit?.transactionReference || ''),
      escapeCsv(s.cashRemittanceBatch?.batchId || ''),
      escapeCsv(s.cashRemittanceBatch?.bagSealNumber || ''),
      escapeCsv(s.dispute?.isDisputed ? 'DISPUTED' : (s.dispute?.resolution ? 'RESOLVED' : 'NONE')),
      escapeCsv(s.dispute?.resolution || ''),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="COD_Settlements_Ledger_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

