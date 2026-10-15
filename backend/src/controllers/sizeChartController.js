const SizeChart = require('../models/SizeChart');
const defaultSizeCharts = require('../utils/defaultSizeCharts');

// Ensure default size charts are present in database
const ensureSeeded = async () => {
  const count = await SizeChart.countDocuments();
  if (count === 0) {
    await SizeChart.insertMany(defaultSizeCharts);
  }
};

/**
 * Helper to parse a range string like "91-96" or "25.9 - 26.7" or single number "76"
 */
const parseRange = (str) => {
  if (!str || str === '-') return null;
  const parts = str.split('-').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  if (parts.length === 1) return { min: parts[0] - 1, max: parts[0] + 1, mid: parts[0] };
  if (parts.length >= 2) return { min: parts[0], max: parts[1], mid: (parts[0] + parts[1]) / 2 };
  return null;
};

exports.getAllSizeCharts = async (req, res) => {
  try {
    await ensureSeeded();
    const charts = await SizeChart.find({ isActive: true }).lean();
    return res.status(200).json({
      success: true,
      count: charts.length,
      data: charts,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getSizeChartByKey = async (req, res) => {
  try {
    await ensureSeeded();
    const { categoryKey } = req.params;
    const chart = await SizeChart.findOne({ categoryKey, isActive: true }).lean();
    if (!chart) {
      return res.status(404).json({ success: false, error: `Size chart for '${categoryKey}' not found` });
    }
    return res.status(200).json({
      success: true,
      data: chart,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.recommendSize = async (req, res) => {
  try {
    await ensureSeeded();
    const { categoryKey, unit = 'in', chest, waist, hip, footLength } = req.body;

    if (!categoryKey) {
      return res.status(400).json({ success: false, error: 'categoryKey is required for size recommendation' });
    }

    const chart = await SizeChart.findOne({ categoryKey, isActive: true }).lean();
    if (!chart) {
      return res.status(404).json({ success: false, error: `Size chart for '${categoryKey}' not found` });
    }

    const isCm = unit.toLowerCase() === 'cm';
    let bestSize = null;
    let minDiff = Infinity;
    let matchedField = '';
    let targetVal = 0;

    if (chart.type === 'footwear') {
      targetVal = parseFloat(footLength || chest || waist || 0);
      if (!targetVal || targetVal <= 0) {
        return res.status(400).json({ success: false, error: 'Valid footLength measurement is required for footwear recommendation' });
      }

      chart.measurements.forEach(m => {
        const range = parseRange(isCm ? m.foot_cm : m.foot_in);
        if (range) {
          const diff = Math.abs(targetVal - range.mid);
          // If within range, treat diff as minimal
          const effectiveDiff = (targetVal >= range.min && targetVal <= range.max) ? 0.01 : diff;
          if (effectiveDiff < minDiff) {
            minDiff = effectiveDiff;
            bestSize = m.size;
            matchedField = `Foot length: ${targetVal} ${unit}`;
          }
        }
      });
    } else if (chart.type === 'apparel-bottom') {
      targetVal = parseFloat(waist || hip || 0);
      if (!targetVal || targetVal <= 0) {
        return res.status(400).json({ success: false, error: 'Valid waist measurement is required for bottom apparel recommendation' });
      }

      chart.measurements.forEach(m => {
        const range = parseRange(isCm ? m.waist_cm : m.waist_in);
        if (range) {
          const diff = Math.abs(targetVal - range.mid);
          const effectiveDiff = (targetVal >= range.min && targetVal <= range.max) ? 0.05 : diff;
          if (effectiveDiff < minDiff) {
            minDiff = effectiveDiff;
            bestSize = m.size;
            matchedField = `Waist: ${targetVal} ${unit}`;
          }
        }
      });
    } else {
      // Apparel Top or Kids
      targetVal = parseFloat(chest || waist || 0);
      if (!targetVal || targetVal <= 0) {
        return res.status(400).json({ success: false, error: 'Valid chest/bust measurement is required for apparel recommendation' });
      }

      chart.measurements.forEach(m => {
        const range = parseRange(isCm ? m.chest_cm : m.chest_in);
        if (range) {
          const diff = Math.abs(targetVal - range.mid);
          const effectiveDiff = (targetVal >= range.min && targetVal <= range.max) ? 0.05 : diff;
          if (effectiveDiff < minDiff) {
            minDiff = effectiveDiff;
            bestSize = m.size;
            matchedField = `Chest/Bust: ${targetVal} ${unit}`;
          }
        }
      });
    }

    if (!bestSize) {
      bestSize = chart.measurements[Math.floor(chart.measurements.length / 2)]?.size || 'M';
    }

    const confidenceScore = Math.max(78, Math.min(99, Math.round(100 - minDiff * 3)));
    const advice = `We recommend size ${bestSize} (${confidenceScore}% match) based on your ${matchedField}. It offers a standard tailored fit.`;

    return res.status(200).json({
      success: true,
      categoryKey,
      unit,
      recommendedSize: bestSize,
      confidenceScore,
      advice,
      targetValue: targetVal,
      chartTitle: chart.title,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.createOrUpdateSizeChart = async (req, res) => {
  try {
    const { categoryKey, title, gender, type, measurements, howToMeasure } = req.body;
    if (!categoryKey || !title) {
      return res.status(400).json({ success: false, error: 'categoryKey and title are required' });
    }

    const chart = await SizeChart.findOneAndUpdate(
      { categoryKey },
      { categoryKey, title, gender, type, measurements, howToMeasure, isActive: true },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: `Size chart '${categoryKey}' saved successfully`,
      data: chart,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
