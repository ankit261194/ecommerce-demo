const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'frontend/src/components/AdminCodReconciliationVault.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  {
    target: "r.currentCashInHand.toLocaleString('en-IN')",
    replacement: "(r?.currentCashInHand || 0).toLocaleString('en-IN')"
  },
  {
    target: "r.cashInHandLimit.toLocaleString('en-IN')",
    replacement: "(r?.cashInHandLimit || 0).toLocaleString('en-IN')"
  },
  {
    target: "rider.totalPendingCash.toLocaleString('en-IN')",
    replacement: "(rider?.totalPendingCash || 0).toLocaleString('en-IN')"
  },
  {
    target: "s.totalCounted.toLocaleString('en-IN')",
    replacement: "(s?.totalCounted || 0).toLocaleString('en-IN')"
  },
  {
    target: "s.totalExpected.toLocaleString('en-IN')",
    replacement: "(s?.totalExpected || 0).toLocaleString('en-IN')"
  },
  {
    target: "Math.abs(s.discrepancy).toLocaleString('en-IN')",
    replacement: "Math.abs(s?.discrepancy || 0).toLocaleString('en-IN')"
  },
  {
    target: "s.discrepancy.toLocaleString('en-IN')",
    replacement: "(s?.discrepancy || 0).toLocaleString('en-IN')"
  },
  {
    target: "selectedSettlementForVerify.totalCounted.toLocaleString('en-IN')",
    replacement: "(selectedSettlementForVerify?.totalCounted || 0).toLocaleString('en-IN')"
  },
  {
    target: "selectedSettlementForVerify.totalExpected.toLocaleString('en-IN')",
    replacement: "(selectedSettlementForVerify?.totalExpected || 0).toLocaleString('en-IN')"
  },
  {
    target: "selectedSettlementForDeposit.totalCounted.toLocaleString('en-IN')",
    replacement: "(selectedSettlementForDeposit?.totalCounted || 0).toLocaleString('en-IN')"
  },
  {
    target: "selectedRiderForHandover.totalPendingCash.toLocaleString('en-IN')",
    replacement: "(selectedRiderForHandover?.totalPendingCash || 0).toLocaleString('en-IN')"
  },
  {
    target: "calculatedHandoverTotal.toLocaleString('en-IN')",
    replacement: "(calculatedHandoverTotal || 0).toLocaleString('en-IN')"
  },
  {
    target: "(calculatedHandoverTotal - selectedRiderForHandover.totalPendingCash).toLocaleString('en-IN')",
    replacement: "((calculatedHandoverTotal || 0) - (selectedRiderForHandover?.totalPendingCash || 0)).toLocaleString('en-IN')"
  },
  {
    target: "selectedSettlementForVaultDrop.totalCounted.toLocaleString('en-IN')",
    replacement: "(selectedSettlementForVaultDrop?.totalCounted || 0).toLocaleString('en-IN')"
  },
  {
    target: "Math.abs(selectedSettlementForDispute.discrepancy).toLocaleString('en-IN')",
    replacement: "Math.abs(selectedSettlementForDispute?.discrepancy || 0).toLocaleString('en-IN')"
  },
  {
    target: "selectedSettlementForDispute.discrepancy.toLocaleString('en-IN')",
    replacement: "(selectedSettlementForDispute?.discrepancy || 0).toLocaleString('en-IN')"
  },
  {
    target: "new Date(s.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })",
    replacement: "new Date(s?.createdAt || Date.now()).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })"
  },
  {
    target: "ridersLimitRadar.riders.map",
    replacement: "(ridersLimitRadar?.riders || []).map"
  },
  {
    target: "pendingRiders.map",
    replacement: "(pendingRiders || []).map"
  },
  {
    target: "filteredSettlements.map",
    replacement: "(filteredSettlements || []).map"
  }
];

let replacedCount = 0;
for (const r of replacements) {
  if (content.includes(r.target)) {
    content = content.replaceAll(r.target, r.replacement);
    replacedCount++;
    console.log(`Replaced: ${r.target}`);
  } else {
    console.warn(`Target not found: ${r.target}`);
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Successfully patched ${replacedCount} targets in AdminCodReconciliationVault.jsx!`);
