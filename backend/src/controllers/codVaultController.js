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
    AuraMarket Multi-Vendor Commerce Platform • Immutable Audit Record • Point #23
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
};
