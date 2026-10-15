const defaultSizeCharts = [
  {
    categoryKey: 'men-shirts',
    title: "Men's Shirts, T-Shirts & Tops",
    gender: 'men',
    type: 'apparel-top',
    measurements: [
      { size: 'S', chest_cm: '91-96', chest_in: '36-38', waist_cm: '76-81', waist_in: '30-32', length_cm: '68', length_in: '27' },
      { size: 'M', chest_cm: '97-102', chest_in: '38-40', waist_cm: '81-86', waist_in: '32-34', length_cm: '71', length_in: '28' },
      { size: 'L', chest_cm: '104-109', chest_in: '41-43', waist_cm: '89-94', waist_in: '35-37', length_cm: '74', length_in: '29' },
      { size: 'XL', chest_cm: '112-117', chest_in: '44-46', waist_cm: '97-102', waist_in: '38-40', length_cm: '76', length_in: '30' },
      { size: '2XL', chest_cm: '119-124', chest_in: '47-49', waist_cm: '104-109', waist_in: '41-43', length_cm: '79', length_in: '31' },
    ],
    howToMeasure: [
      { part: 'Chest', tip: 'Measure horizontally around the fullest part of your chest, keeping tape level under arms.' },
      { part: 'Waist', tip: 'Measure around your natural waistline, typically the narrowest part of your torso.' },
      { part: 'Length', tip: 'Measure from the highest point of the shoulder straight down to the hemline.' }
    ]
  },
  {
    categoryKey: 'men-pants',
    title: "Men's Trousers, Jeans & Chinos",
    gender: 'men',
    type: 'apparel-bottom',
    measurements: [
      { size: '30', waist_cm: '76', waist_in: '30', hip_cm: '94', hip_in: '37', length_cm: '102', length_in: '40' },
      { size: '32', waist_cm: '81', waist_in: '32', hip_cm: '99', hip_in: '39', length_cm: '104', length_in: '41' },
      { size: '34', waist_cm: '86', waist_in: '34', hip_cm: '104', hip_in: '41', length_cm: '105', length_in: '41.5' },
      { size: '36', waist_cm: '91', waist_in: '36', hip_cm: '109', hip_in: '43', length_cm: '107', length_in: '42' },
      { size: '38', waist_cm: '97', waist_in: '38', hip_cm: '114', hip_in: '45', length_cm: '108', length_in: '42.5' },
    ],
    howToMeasure: [
      { part: 'Waist', tip: 'Measure around your natural waistline where you normally wear your trousers.' },
      { part: 'Hips', tip: 'Stand with feet together and measure around the fullest part of your hips.' },
      { part: 'Inseam', tip: 'Measure from the highest point of your inner leg down to the ankle bone.' }
    ]
  },
  {
    categoryKey: 'women-dresses',
    title: "Women's Tops, Kurtis & Dresses",
    gender: 'women',
    type: 'apparel-top',
    measurements: [
      { size: 'XS', chest_cm: '81-84', chest_in: '32-33', waist_cm: '61-64', waist_in: '24-25', hip_cm: '86-89', hip_in: '34-35' },
      { size: 'S', chest_cm: '86-89', chest_in: '34-35', waist_cm: '66-69', waist_in: '26-27', hip_cm: '91-94', hip_in: '36-37' },
      { size: 'M', chest_cm: '91-94', chest_in: '36-37', waist_cm: '71-74', waist_in: '28-29', hip_cm: '97-99', hip_in: '38-39' },
      { size: 'L', chest_cm: '97-102', chest_in: '38-40', waist_cm: '76-81', waist_in: '30-32', hip_cm: '102-107', hip_in: '40-42' },
      { size: 'XL', chest_cm: '104-109', chest_in: '41-43', waist_cm: '84-89', waist_in: '33-35', hip_cm: '109-114', hip_in: '43-45' },
      { size: '2XL', chest_cm: '112-117', chest_in: '44-46', waist_cm: '91-97', waist_in: '36-38', hip_cm: '117-122', hip_in: '46-48' },
    ],
    howToMeasure: [
      { part: 'Bust', tip: 'Measure around the fullest part of your bust with a bra on.' },
      { part: 'Waist', tip: 'Measure around the narrowest part of your waistline above the navel.' },
      { part: 'Hips', tip: 'Measure around the fullest part of your buttocks.' }
    ]
  },
  {
    categoryKey: 'women-pants',
    title: "Women's Jeans, Trousers & Leggings",
    gender: 'women',
    type: 'apparel-bottom',
    measurements: [
      { size: '26', waist_cm: '66', waist_in: '26', hip_cm: '89', hip_in: '35', length_cm: '98', length_in: '38.5' },
      { size: '28', waist_cm: '71', waist_in: '28', hip_cm: '94', hip_in: '37', length_cm: '99', length_in: '39' },
      { size: '30', waist_cm: '76', waist_in: '30', hip_cm: '99', hip_in: '39', length_cm: '100', length_in: '39.5' },
      { size: '32', waist_cm: '81', waist_in: '32', hip_cm: '104', hip_in: '41', length_cm: '102', length_in: '40' },
      { size: '34', waist_cm: '86', waist_in: '34', hip_cm: '109', hip_in: '43', length_cm: '103', length_in: '40.5' },
    ],
    howToMeasure: [
      { part: 'Waist', tip: 'Measure around your natural waistline where trouser waist sits.' },
      { part: 'Hips', tip: 'Measure around the widest part of your hips.' }
    ]
  },
  {
    categoryKey: 'shoes',
    title: "Footwear & Shoes (Sneakers, Casual, Formal)",
    gender: 'unisex',
    type: 'footwear',
    measurements: [
      { size: 'UK 6', uk_size: '6', us_size: '7', eu_size: '40', foot_cm: '24.5 - 25.0', foot_in: '9.6 - 9.8' },
      { size: 'UK 7', uk_size: '7', us_size: '8', eu_size: '41', foot_cm: '25.1 - 25.8', foot_in: '9.9 - 10.1' },
      { size: 'UK 8', uk_size: '8', us_size: '9', eu_size: '42', foot_cm: '25.9 - 26.7', foot_in: '10.2 - 10.5' },
      { size: 'UK 9', uk_size: '9', us_size: '10', eu_size: '43', foot_cm: '26.8 - 27.5', foot_in: '10.6 - 10.8' },
      { size: 'UK 10', uk_size: '10', us_size: '11', eu_size: '44', foot_cm: '27.6 - 28.3', foot_in: '10.9 - 11.1' },
      { size: 'UK 11', uk_size: '11', us_size: '12', eu_size: '45', foot_cm: '28.4 - 29.2', foot_in: '11.2 - 11.5' },
    ],
    howToMeasure: [
      { part: 'Foot Length', tip: 'Stand on a blank sheet of paper with heel against the wall. Mark the longest toe and measure length in cm or inches.' }
    ]
  },
  {
    categoryKey: 'kids',
    title: "Kids Apparel (Boys & Girls)",
    gender: 'kids',
    type: 'kids',
    measurements: [
      { size: '2-3Y', chest_cm: '53-55', chest_in: '21-22', waist_cm: '51-53', waist_in: '20-21', length_cm: '92-98', length_in: '36-38.5' },
      { size: '4-5Y', chest_cm: '56-58', chest_in: '22-23', waist_cm: '53-55', waist_in: '21-21.5', length_cm: '104-110', length_in: '41-43.5' },
      { size: '6-7Y', chest_cm: '60-63', chest_in: '23.5-25', waist_cm: '55-58', waist_in: '22-23', length_cm: '116-122', length_in: '45.5-48' },
      { size: '8-9Y', chest_cm: '65-68', chest_in: '25.5-27', waist_cm: '59-62', waist_in: '23.5-24.5', length_cm: '128-134', length_in: '50-53' },
      { size: '10-11Y', chest_cm: '70-74', chest_in: '27.5-29', waist_cm: '63-66', waist_in: '25-26', length_cm: '140-146', length_in: '55-57.5' },
    ],
    howToMeasure: [
      { part: 'Child Height', tip: 'Measure barefoot child standing straight against a wall from head to heel.' },
      { part: 'Chest', tip: 'Measure under arms around the fullest part of child chest.' }
    ]
  }
];

module.exports = defaultSizeCharts;
