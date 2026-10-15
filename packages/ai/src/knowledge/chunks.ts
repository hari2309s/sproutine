/**
 * Curated nutrition knowledge chunks. Each chunk is a standalone paragraph that
 * the model can cite when answering nutrition questions. Sources are openly
 * licensed: WHO fact sheets, EFSA dietary reference values, and widely accepted
 * nutrition science from public health bodies.
 *
 * Chunks are tagged with topics for keyword retrieval. The `source` field is
 * what Rosie shows as a citation.
 */

export interface KnowledgeChunk {
  id: string
  topics: string[]
  text: string
  source: string
}

export const KNOWLEDGE: KnowledgeChunk[] = [
  // ─── Macronutrients ──────────────────────────────────────────────────────────
  {
    id: 'protein-needs',
    topics: ['protein', 'amino acids', 'muscle', 'daily intake', 'macronutrient'],
    text: 'Adults need about 0.83 g of protein per kg body weight per day. Active people, older adults, and those recovering from illness may benefit from 1.0–1.2 g/kg. Protein supports muscle maintenance, immune function, and satiety. Good sources include legumes, eggs, fish, poultry, dairy, tofu, and nuts.',
    source: 'EFSA Dietary Reference Values for protein (2012)',
  },
  {
    id: 'carbs-fibre',
    topics: ['carbohydrates', 'carbs', 'fibre', 'fiber', 'whole grain', 'sugar', 'blood sugar', 'glycaemic'],
    text: 'Carbohydrates should provide 45–65% of daily energy. Choose whole grains, vegetables, fruits and legumes over refined starches and added sugars. Dietary fibre (at least 25 g/day for adults) supports gut health, helps regulate blood sugar, and is linked to lower risk of cardiovascular disease and type 2 diabetes.',
    source: 'EFSA Dietary Reference Values for carbohydrates and fibre (2010)',
  },
  {
    id: 'fat-types',
    topics: ['fat', 'fats', 'saturated fat', 'unsaturated fat', 'omega-3', 'omega-6', 'trans fat', 'olive oil', 'cholesterol'],
    text: 'Total fat intake of 20–35% of energy is adequate for most adults. Replace saturated and trans fats with unsaturated fats (olive oil, nuts, avocado, oily fish) to support heart health. Keep saturated fat below 10% of energy. Trans fats should be as low as possible — below 1% of energy. Omega-3 fatty acids (EPA and DHA) from oily fish or algae supplements support cardiovascular and brain health; aim for 250 mg EPA+DHA per day.',
    source: 'EFSA Scientific Opinion on dietary fats (2010); WHO Healthy diet fact sheet',
  },
  // ─── Micronutrients ──────────────────────────────────────────────────────────
  {
    id: 'iron',
    topics: ['iron', 'anaemia', 'anemia', 'tiredness', 'fatigue', 'red meat', 'spinach', 'lentils'],
    text: 'Iron is essential for oxygen transport. Adult women (menstruating) need about 16 mg/day; men and post-menopausal women about 11 mg/day. Haem iron (meat, fish) is better absorbed than non-haem iron (lentils, spinach, tofu). Eating vitamin C-rich foods alongside plant iron sources improves absorption. Tea and coffee with meals can reduce it.',
    source: 'EFSA Dietary Reference Values for iron (2015)',
  },
  {
    id: 'vitamin-d',
    topics: ['vitamin d', 'sunshine', 'bones', 'calcium absorption', 'supplement', 'winter'],
    text: 'Vitamin D helps the body absorb calcium and supports immune function. The adequate intake for adults is 15 µg (600 IU) per day. In Northern Europe, skin synthesis is limited from October to March, so a supplement of 10–20 µg/day is commonly recommended during winter months. Food sources include oily fish, egg yolks, and fortified foods.',
    source: 'EFSA Dietary Reference Values for vitamin D (2016)',
  },
  {
    id: 'calcium',
    topics: ['calcium', 'bones', 'osteoporosis', 'dairy', 'milk', 'cheese', 'yoghurt'],
    text: 'Adults need about 950–1000 mg of calcium per day for bone health. Dairy products are the richest sources. Non-dairy options include fortified plant milks, tofu made with calcium sulfate, kale, broccoli, almonds, and canned sardines with bones. Vitamin D aids calcium absorption.',
    source: 'EFSA Dietary Reference Values for calcium (2015)',
  },
  {
    id: 'vitamin-b12',
    topics: ['vitamin b12', 'b12', 'vegan', 'vegetarian', 'supplement', 'nervous system', 'energy'],
    text: 'Vitamin B12 is needed for nerve function and red blood cell production. The adequate intake is 4 µg/day for adults. B12 is found almost exclusively in animal products (meat, fish, dairy, eggs). Vegans and most vegetarians should take a B12 supplement or consume B12-fortified foods daily.',
    source: 'EFSA Dietary Reference Values for vitamin B12 (2015)',
  },
  {
    id: 'folate',
    topics: ['folate', 'folic acid', 'pregnancy', 'leafy greens', 'birth defects'],
    text: 'Folate is essential for cell division and DNA synthesis. Adults need 330 µg dietary folate equivalents per day; women planning pregnancy should take 400 µg/day of folic acid supplementation starting at least one month before conception and through the first trimester to reduce the risk of neural tube defects. Rich food sources include dark leafy greens, legumes, and fortified cereals.',
    source: 'EFSA Dietary Reference Values for folate (2014)',
  },
  {
    id: 'zinc',
    topics: ['zinc', 'immune', 'immunity', 'wound healing', 'taste', 'smell'],
    text: 'Zinc supports immune function, wound healing, and the senses of taste and smell. Adult men need about 9.4–16.3 mg/day and women about 7.5–12.7 mg/day (the range depends on phytate intake from plant foods). Good sources include meat, shellfish, legumes, seeds, nuts, and whole grains.',
    source: 'EFSA Dietary Reference Values for zinc (2014)',
  },
  {
    id: 'iodine',
    topics: ['iodine', 'thyroid', 'salt', 'iodised salt', 'seaweed', 'fish'],
    text: 'Iodine is vital for thyroid hormones, which regulate metabolism. The adequate intake for adults is 150 µg/day. Using iodised salt is the simplest strategy; other sources include sea fish, dairy, and seaweed (use seaweed in moderation — some types are extremely high in iodine).',
    source: 'EFSA Dietary Reference Values for iodine (2014)',
  },
  {
    id: 'magnesium',
    topics: ['magnesium', 'muscle cramps', 'sleep', 'stress', 'nuts', 'dark chocolate'],
    text: 'Magnesium plays a role in over 300 enzyme reactions, including muscle and nerve function. The adequate intake is 350 mg/day for men and 300 mg/day for women. Good sources include nuts (especially almonds and cashews), seeds, whole grains, dark leafy greens, legumes, and dark chocolate.',
    source: 'EFSA Dietary Reference Values for magnesium (2015)',
  },
  // ─── Hydration ───────────────────────────────────────────────────────────────
  {
    id: 'hydration',
    topics: ['water', 'hydration', 'drink', 'thirst', 'dehydration', 'fluid', 'tea', 'coffee'],
    text: 'Adequate water intake is about 2.0 L/day for women and 2.5 L/day for men (from all beverages and food). Needs increase with physical activity, heat, and illness. Water, herbal tea and unsweetened drinks are the best choices. Coffee and tea count toward fluid intake. Signs of dehydration include dark urine, headache, and fatigue.',
    source: 'EFSA Scientific Opinion on water intake (2010)',
  },
  // ─── Diet patterns ──────────────────────────────────────────────────────────
  {
    id: 'fruits-vegetables',
    topics: ['fruit', 'fruits', 'vegetables', 'five a day', '5 a day', 'portions', 'vitamins', 'antioxidants'],
    text: 'Eating at least 400 g (roughly five portions) of fruits and vegetables per day is associated with lower risk of heart disease, stroke, and some cancers. Include a variety of colours for a wide range of vitamins, minerals, and phytochemicals. Potatoes and other starchy tubers do not count toward the five portions.',
    source: 'WHO Healthy diet fact sheet (2020)',
  },
  {
    id: 'salt-sodium',
    topics: ['salt', 'sodium', 'blood pressure', 'hypertension', 'processed food'],
    text: 'The WHO recommends adults consume less than 5 g of salt (about 2 g of sodium) per day to reduce blood pressure and cardiovascular risk. Most excess salt comes from processed foods, bread, cheese, and restaurant meals rather than the salt shaker. Reducing processed food intake is the most effective way to cut salt.',
    source: 'WHO Guideline: Sodium intake for adults and children (2012)',
  },
  {
    id: 'added-sugar',
    topics: ['sugar', 'added sugar', 'free sugar', 'sweetener', 'soft drink', 'juice', 'candy'],
    text: 'The WHO recommends reducing free sugars to less than 10% of total energy intake, with additional benefits below 5% (about 25 g or 6 teaspoons per day). Free sugars include those added during processing and naturally present in honey, syrups, and fruit juices — but not sugars in whole fruits, vegetables, or plain milk.',
    source: 'WHO Guideline: Sugars intake for adults and children (2015)',
  },
  {
    id: 'mediterranean-diet',
    topics: ['mediterranean', 'diet pattern', 'heart health', 'olive oil', 'longevity'],
    text: 'The Mediterranean dietary pattern — rich in vegetables, fruits, whole grains, legumes, nuts, olive oil, and fish, with moderate dairy and limited red meat — is associated with reduced risk of cardiovascular disease, type 2 diabetes, and some cancers. It is one of the most studied dietary patterns with consistent evidence of health benefits.',
    source: 'EFSA Scientific Opinion on Mediterranean dietary patterns (2011); WHO Regional Office for Europe',
  },
  {
    id: 'plant-based',
    topics: ['vegan', 'vegetarian', 'plant-based', 'meat-free', 'plant protein'],
    text: 'Well-planned vegetarian and vegan diets can meet all nutrient needs across all life stages. Key nutrients to pay attention to include vitamin B12 (supplement needed for vegans), iron, zinc, calcium, omega-3 (ALA from flax/chia/walnuts, or algae-based EPA/DHA), iodine, and vitamin D. Combining different plant protein sources (legumes + grains) across the day ensures all essential amino acids.',
    source: 'Academy of Nutrition and Dietetics position paper on vegetarian diets (2016); EFSA DRVs',
  },
  // ─── Specific topics ────────────────────────────────────────────────────────
  {
    id: 'gut-health',
    topics: ['gut', 'microbiome', 'probiotics', 'prebiotics', 'fermented', 'digestion', 'bloating'],
    text: 'A diverse gut microbiome supports digestion, immunity, and even mood. Promote diversity by eating a wide variety of plant foods (aim for 30+ different plants per week), fermented foods (yoghurt, kefir, sauerkraut, kimchi), and prebiotic-rich foods (garlic, onion, leeks, oats, bananas). Fibre is the primary fuel for beneficial gut bacteria.',
    source: 'British Society of Gastroenterology guidelines; American Gut Project findings',
  },
  {
    id: 'meal-timing',
    topics: ['meal timing', 'breakfast', 'intermittent fasting', 'snacking', 'eating schedule', 'when to eat'],
    text: 'There is no single "best" meal timing for everyone. Regular meals help maintain stable blood sugar and energy. Skipping meals can lead to overeating later. Breakfast is beneficial for many people, especially for concentration and energy, but not everyone needs it. The total quality and quantity of food over the day matters more than exact timing.',
    source: 'EFSA Scientific Opinion; Systematic reviews on meal frequency and metabolic health',
  },
  {
    id: 'portion-sizes',
    topics: ['portion', 'serving', 'how much', 'overeating', 'portion control'],
    text: 'Portion sizes have grown over time, contributing to excess energy intake. The "hand method" is a practical guide: a palm-sized serving of protein, a fist of carbs, a cupped hand of vegetables, and a thumb-sized amount of fats. Using smaller plates, eating slowly, and stopping when comfortably full (not stuffed) can help with portion awareness.',
    source: 'British Nutrition Foundation portion guidance; Public Health England',
  },
  {
    id: 'food-labels',
    topics: ['label', 'labels', 'nutrition label', 'traffic light', 'ingredient list', 'E numbers', 'additives'],
    text: 'EU nutrition labels show energy, fat, saturated fat, carbohydrates, sugars, protein, and salt per 100 g. The ingredient list is ordered by weight. Traffic light labels (UK) use red/amber/green for quick comparison. "Per serving" values can mislead if the serving size is unrealistically small. The ingredient list often reveals added sugars, fats, and additives that the front-of-pack claims obscure.',
    source: 'EU Regulation 1169/2011 on food information to consumers',
  },
  {
    id: 'alcohol',
    topics: ['alcohol', 'beer', 'wine', 'spirits', 'drinking', 'liver'],
    text: 'Alcohol provides 7 kcal per gram with no nutritional benefit. The WHO recommends that no level of alcohol consumption is safe for health. For those who drink, keeping intake low (no more than 10 g of pure alcohol per occasion, and not every day) reduces risks. One standard drink (a small glass of wine, a small beer, or a single measure of spirits) contains about 10–12 g of alcohol.',
    source: 'WHO Global status report on alcohol and health (2018); WHO Europe alcohol guidelines (2023)',
  },
  {
    id: 'caffeine',
    topics: ['caffeine', 'coffee', 'tea', 'energy drink', 'sleep'],
    text: 'Up to 400 mg of caffeine per day (about 4 cups of filter coffee) is considered safe for most adults. Caffeine can improve alertness and performance but may cause anxiety, insomnia, or digestive issues in sensitive individuals. Pregnant women should limit caffeine to 200 mg/day. Avoid caffeine at least 6 hours before bedtime for better sleep quality.',
    source: 'EFSA Scientific Opinion on caffeine safety (2015)',
  },
  {
    id: 'food-safety-storage',
    topics: ['food safety', 'storage', 'leftovers', 'refrigerator', 'freezing', 'expiry', 'best before', 'use by'],
    text: '"Use by" dates are about safety — do not eat food past this date. "Best before" dates are about quality — food is often safe to eat after this date but may not taste optimal. Refrigerate leftovers within 2 hours, store at 4°C or below, and consume within 2–3 days. Freezing at -18°C pauses bacterial growth indefinitely, though quality may decline over months.',
    source: 'EU Regulation 1169/2011; BfR (German Federal Institute for Risk Assessment) food hygiene guidance',
  },
  {
    id: 'superfoods-myth',
    topics: ['superfood', 'superfoods', 'acai', 'kale', 'quinoa', 'chia', 'goji', 'miracle food'],
    text: 'No single food is a magic bullet for health. The term "superfood" is a marketing label, not a scientific classification. While foods like berries, leafy greens, and seeds are nutrient-dense, health comes from overall dietary patterns, not individual foods. A varied diet with plenty of vegetables, fruits, whole grains, and legumes does far more than any one "super" ingredient.',
    source: 'British Dietetic Association; European Food Information Council (EUFIC)',
  },
  {
    id: 'weight-management',
    topics: ['weight', 'weight loss', 'metabolism', 'calories', 'BMI', 'body composition', 'crash diet'],
    text: 'Sustainable weight management comes from consistent, moderate changes rather than crash diets. A deficit of 500 kcal/day typically leads to about 0.5 kg loss per week. Very low-calorie diets slow metabolism and are hard to maintain. Focus on nutrient-dense foods, adequate protein (to preserve muscle), regular physical activity, and sufficient sleep. Weight is influenced by many factors beyond food: genetics, hormones, stress, and sleep.',
    source: 'EFSA; WHO obesity prevention recommendations',
  },
  {
    id: 'omega3-sources',
    topics: ['omega-3', 'omega 3', 'fish oil', 'DHA', 'EPA', 'ALA', 'flaxseed', 'walnuts', 'brain health'],
    text: 'Omega-3 fatty acids include ALA (from plant sources: flaxseed, chia seeds, walnuts) and EPA/DHA (from oily fish like salmon, mackerel, sardines, or algae supplements). ALA is essential but converts poorly to EPA/DHA. Aim for 250 mg EPA+DHA per day. Eating oily fish 1–2 times per week typically meets this. Vegans can use algae-derived DHA/EPA supplements.',
    source: 'EFSA Dietary Reference Values for fats (2010)',
  },
  {
    id: 'potassium',
    topics: ['potassium', 'blood pressure', 'banana', 'electrolytes', 'muscle function'],
    text: 'Potassium helps regulate blood pressure, fluid balance, and muscle contractions. The adequate intake for adults is 3500 mg/day. Most people get too little. Rich sources include bananas, potatoes, sweet potatoes, beans, lentils, spinach, avocado, and dried fruits. Eating more potassium-rich foods while reducing sodium can help lower blood pressure.',
    source: 'EFSA Dietary Reference Values for potassium (2016); WHO potassium intake guidelines',
  },
  {
    id: 'cooking-methods',
    topics: ['cooking', 'steaming', 'boiling', 'frying', 'nutrient loss', 'raw', 'grilling'],
    text: 'Cooking method affects nutrient retention. Steaming and microwaving preserve more vitamins than boiling (water-soluble vitamins like C and B vitamins leach into cooking water). Some nutrients become more available after cooking: lycopene in tomatoes, beta-carotene in carrots. Frying adds fat and calories. Grilling at very high temperatures can produce harmful compounds (acrylamide, PAHs) on charred surfaces.',
    source: 'EFSA; BfR guidance on cooking and nutrient retention',
  },
  {
    id: 'food-allergy-intolerance',
    topics: ['allergy', 'intolerance', 'lactose', 'gluten', 'celiac', 'coeliac', 'histamine', 'IgE'],
    text: 'Food allergies involve the immune system (IgE-mediated) and can be life-threatening (anaphylaxis). The EU requires labelling of 14 major allergens. Food intolerances (e.g., lactose intolerance) cause discomfort but are not immune-mediated and rarely dangerous. Lactose intolerance affects about 65% of adults globally. Coeliac disease is an autoimmune condition triggered by gluten, requiring strict lifelong avoidance. Self-diagnosis is unreliable — testing by a doctor is important.',
    source: 'EFSA allergen guidance; EU Regulation 1169/2011 Annex II',
  },
  {
    id: 'healthy-snacking',
    topics: ['snack', 'snacking', 'hunger', 'between meals', 'nuts', 'fruit'],
    text: 'Healthy snacks can bridge gaps between meals and prevent overeating. Good options include fresh fruit, a handful of unsalted nuts (about 30 g), vegetable sticks with hummus, plain yoghurt, or a slice of whole-grain bread. Avoid frequent energy-dense snacks high in added sugar and fat, which contribute to excess energy intake without much nutritional benefit.',
    source: 'British Nutrition Foundation snack guidance; EFSA',
  },
]
