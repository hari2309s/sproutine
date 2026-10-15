/**
 * Coach-golden dataset: 40 Q&A pairs for the knowledge + coach pipeline.
 * Each item has a user question (nutrition intent), the expected chunk IDs
 * that should be retrieved, and the key facts the answer should contain.
 *
 * Used for two eval dimensions:
 * 1. Retrieval: did searchKnowledge return the expected chunks? (code test)
 * 2. Faithfulness: does the model's answer cite sources and stay faithful?
 *    (requires LLM judge, run via Langfuse experiment)
 */

export interface CoachItem {
  id: string
  query: string
  /** Chunk IDs that must appear in search results (at least one). */
  expectedChunks: string[]
  /** Key facts the answer should contain (for human/LLM review). */
  keyFacts: string[]
}

export const COACH_ITEMS: CoachItem[] = [
  // ─── Protein ─────────────────────────────────────────────────────────────
  {
    id: 'coach-01',
    query: 'How much protein do I need per day?',
    expectedChunks: ['protein-needs'],
    keyFacts: ['0.83 g/kg body weight', 'EFSA'],
  },
  {
    id: 'coach-02',
    query: 'What are good sources of protein for vegetarians?',
    expectedChunks: ['protein-needs', 'plant-based'],
    keyFacts: ['legumes', 'tofu', 'eggs', 'dairy'],
  },
  // ─── Carbs & fibre ──────────────────────────────────────────────────────
  {
    id: 'coach-03',
    query: 'How much fibre should I eat daily?',
    expectedChunks: ['carbs-fibre'],
    keyFacts: ['25 g/day', 'gut health'],
  },
  {
    id: 'coach-04',
    query: 'Are whole grains better than white bread?',
    expectedChunks: ['carbs-fibre'],
    keyFacts: ['whole grains', 'fibre', 'blood sugar'],
  },
  // ─── Fats ────────────────────────────────────────────────────────────────
  {
    id: 'coach-05',
    query: 'What are healthy fats?',
    expectedChunks: ['fat-types'],
    keyFacts: ['unsaturated', 'olive oil', 'nuts', 'avocado'],
  },
  {
    id: 'coach-06',
    query: 'Should I avoid saturated fat?',
    expectedChunks: ['fat-types'],
    keyFacts: ['below 10% of energy', 'replace with unsaturated'],
  },
  // ─── Iron ────────────────────────────────────────────────────────────────
  {
    id: 'coach-07',
    query: 'I feel tired, could it be low iron?',
    expectedChunks: ['iron'],
    keyFacts: ['oxygen transport', 'vitamin C improves absorption'],
  },
  {
    id: 'coach-08',
    query: 'How can I get more iron from plants?',
    expectedChunks: ['iron'],
    keyFacts: ['lentils', 'spinach', 'vitamin C'],
  },
  // ─── Vitamin D ───────────────────────────────────────────────────────────
  {
    id: 'coach-09',
    query: 'Do I need a vitamin D supplement in winter?',
    expectedChunks: ['vitamin-d'],
    keyFacts: ['15 µg', 'October to March', 'skin synthesis limited'],
  },
  {
    id: 'coach-10',
    query: 'What foods contain vitamin D?',
    expectedChunks: ['vitamin-d'],
    keyFacts: ['oily fish', 'egg yolks', 'fortified foods'],
  },
  // ─── Calcium ─────────────────────────────────────────────────────────────
  {
    id: 'coach-11',
    query: 'How much calcium do I need for strong bones?',
    expectedChunks: ['calcium'],
    keyFacts: ['950–1000 mg', 'dairy', 'vitamin D aids absorption'],
  },
  {
    id: 'coach-12',
    query: 'I don\'t eat dairy, where can I get calcium?',
    expectedChunks: ['calcium'],
    keyFacts: ['fortified plant milks', 'tofu', 'kale'],
  },
  // ─── B12 ─────────────────────────────────────────────────────────────────
  {
    id: 'coach-13',
    query: 'Do vegans need B12 supplements?',
    expectedChunks: ['vitamin-b12', 'plant-based'],
    keyFacts: ['4 µg/day', 'supplement needed', 'animal products'],
  },
  // ─── Folate ──────────────────────────────────────────────────────────────
  {
    id: 'coach-14',
    query: 'Why is folic acid important during pregnancy?',
    expectedChunks: ['folate'],
    keyFacts: ['neural tube defects', '400 µg', 'before conception'],
  },
  // ─── Hydration ───────────────────────────────────────────────────────────
  {
    id: 'coach-15',
    query: 'How much water should I drink per day?',
    expectedChunks: ['hydration'],
    keyFacts: ['2.0 L women', '2.5 L men', 'dark urine'],
  },
  {
    id: 'coach-16',
    query: 'Does coffee count as water intake?',
    expectedChunks: ['hydration', 'caffeine'],
    keyFacts: ['coffee and tea count'],
  },
  // ─── Fruits & vegetables ─────────────────────────────────────────────────
  {
    id: 'coach-17',
    query: 'How many portions of fruit and veg should I eat?',
    expectedChunks: ['fruits-vegetables'],
    keyFacts: ['400 g', 'five portions', 'variety of colours'],
  },
  // ─── Salt ────────────────────────────────────────────────────────────────
  {
    id: 'coach-18',
    query: 'How much salt is too much?',
    expectedChunks: ['salt-sodium'],
    keyFacts: ['less than 5 g', 'blood pressure', 'processed foods'],
  },
  // ─── Sugar ───────────────────────────────────────────────────────────────
  {
    id: 'coach-19',
    query: 'How much sugar should I have per day?',
    expectedChunks: ['added-sugar'],
    keyFacts: ['less than 10%', '25 g or 6 teaspoons', 'free sugars'],
  },
  {
    id: 'coach-20',
    query: 'Is fruit juice as good as eating fruit?',
    expectedChunks: ['added-sugar'],
    keyFacts: ['fruit juices count as free sugars', 'whole fruits do not'],
  },
  // ─── Mediterranean diet ──────────────────────────────────────────────────
  {
    id: 'coach-21',
    query: 'What is the Mediterranean diet?',
    expectedChunks: ['mediterranean-diet'],
    keyFacts: ['vegetables', 'olive oil', 'cardiovascular disease'],
  },
  // ─── Plant-based ─────────────────────────────────────────────────────────
  {
    id: 'coach-22',
    query: 'Can I get all nutrients on a vegan diet?',
    expectedChunks: ['plant-based'],
    keyFacts: ['B12', 'iron', 'omega-3', 'calcium'],
  },
  {
    id: 'coach-23',
    query: 'How do I combine plant proteins?',
    expectedChunks: ['plant-based'],
    keyFacts: ['legumes + grains', 'across the day'],
  },
  // ─── Gut health ──────────────────────────────────────────────────────────
  {
    id: 'coach-24',
    query: 'Are probiotics good for gut health?',
    expectedChunks: ['gut-health'],
    keyFacts: ['fermented foods', 'yoghurt', 'diverse microbiome'],
  },
  {
    id: 'coach-25',
    query: 'How can I improve my digestion?',
    expectedChunks: ['gut-health'],
    keyFacts: ['fibre', '30+ plants per week', 'prebiotics'],
  },
  // ─── Meal timing ─────────────────────────────────────────────────────────
  {
    id: 'coach-26',
    query: 'Is breakfast really the most important meal?',
    expectedChunks: ['meal-timing'],
    keyFacts: ['no single best timing', 'total quality matters more'],
  },
  {
    id: 'coach-27',
    query: 'Should I try intermittent fasting?',
    expectedChunks: ['meal-timing'],
    keyFacts: ['skipping meals can lead to overeating', 'regular meals'],
  },
  // ─── Portions ────────────────────────────────────────────────────────────
  {
    id: 'coach-28',
    query: 'How do I know how much to eat?',
    expectedChunks: ['portion-sizes'],
    keyFacts: ['hand method', 'smaller plates', 'comfortably full'],
  },
  // ─── Food labels ─────────────────────────────────────────────────────────
  {
    id: 'coach-29',
    query: 'How do I read a nutrition label?',
    expectedChunks: ['food-labels'],
    keyFacts: ['per 100 g', 'ingredient list ordered by weight'],
  },
  // ─── Alcohol ─────────────────────────────────────────────────────────────
  {
    id: 'coach-30',
    query: 'Is a glass of wine a day healthy?',
    expectedChunks: ['alcohol'],
    keyFacts: ['no level is safe', '7 kcal per gram'],
  },
  // ─── Caffeine ────────────────────────────────────────────────────────────
  {
    id: 'coach-31',
    query: 'How many cups of coffee are safe?',
    expectedChunks: ['caffeine'],
    keyFacts: ['400 mg', 'about 4 cups', 'pregnancy 200 mg'],
  },
  // ─── Food safety ─────────────────────────────────────────────────────────
  {
    id: 'coach-32',
    query: 'How long can I keep leftovers in the fridge?',
    expectedChunks: ['food-safety-storage'],
    keyFacts: ['2–3 days', '4°C', 'within 2 hours'],
  },
  {
    id: 'coach-33',
    query: 'What is the difference between use by and best before?',
    expectedChunks: ['food-safety-storage'],
    keyFacts: ['use by is safety', 'best before is quality'],
  },
  // ─── Superfoods ──────────────────────────────────────────────────────────
  {
    id: 'coach-34',
    query: 'Should I buy superfoods like acai and chia seeds?',
    expectedChunks: ['superfoods-myth'],
    keyFacts: ['marketing label', 'no single food is a magic bullet'],
  },
  // ─── Omega-3 ─────────────────────────────────────────────────────────────
  {
    id: 'coach-35',
    query: 'Where do I get omega-3 without eating fish?',
    expectedChunks: ['omega3-sources'],
    keyFacts: ['flaxseed', 'walnuts', 'algae supplements'],
  },
  // ─── Weight management ───────────────────────────────────────────────────
  {
    id: 'coach-36',
    query: 'What is the best way to lose weight healthily?',
    expectedChunks: ['weight-management'],
    keyFacts: ['sustainable', 'moderate changes', 'adequate protein'],
  },
  // ─── Cooking methods ─────────────────────────────────────────────────────
  {
    id: 'coach-37',
    query: 'Does cooking destroy vitamins?',
    expectedChunks: ['cooking-methods'],
    keyFacts: ['steaming preserves more', 'lycopene increases'],
  },
  // ─── Allergies ───────────────────────────────────────────────────────────
  {
    id: 'coach-38',
    query: 'What is the difference between food allergy and intolerance?',
    expectedChunks: ['food-allergy-intolerance'],
    keyFacts: ['immune system', 'IgE', 'not life-threatening'],
  },
  // ─── Snacking ────────────────────────────────────────────────────────────
  {
    id: 'coach-39',
    query: 'What are good snacks between meals?',
    expectedChunks: ['healthy-snacking'],
    keyFacts: ['nuts', 'fruit', 'yoghurt', 'hummus'],
  },
  // ─── Potassium ───────────────────────────────────────────────────────────
  {
    id: 'coach-40',
    query: 'Are bananas the best source of potassium?',
    expectedChunks: ['potassium'],
    keyFacts: ['3500 mg/day', 'potatoes', 'beans', 'lentils'],
  },
]
