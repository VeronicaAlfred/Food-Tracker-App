import type { Food, FoodCategory, Source } from '../lib/types';

/**
 * Built-in food list. Values are PER SERVING as described.
 *
 * Source codes (see Settings > About the data):
 *  GS   GymSquare Nigerian Food Calorie Calculator (calories per Nigerian portion)
 *  FN   FitNigerian "Calories in Nigerian Foods" tables
 *  AC   AfroCalorie Nigeria
 *  SA   Sundry Agro low-calorie swallow guide (oat swallow)
 *  TW   Twinings tea bags (FatSecret / MyFoodDiary / Nutracheck: 0-2 kcal per cup)
 *  USDA standard USDA composition data, scaled to the stated portion
 *  EST  estimate from standard composition / typical recipe (macros are always approximate)
 *
 * Calories on published Nigerian tables vary a lot with palm oil and portion size, so
 * every number here is a guide. Use "My foods" or "Recipes" for what you actually cook.
 */
type Row = [
  id: string,
  name: string,
  serving: string,
  kcal: number,
  p: number,
  c: number,
  f: number,
  flags: string,
  src: Source,
  tag?: string,
];

const mk = (cat: FoodCategory, rows: Row[]): Food[] =>
  rows.map(([id, name, serving, kcal, p, c, f, flags, src, tag]) => ({
    id,
    name,
    serving,
    kcal,
    p,
    c,
    f,
    cat,
    tag,
    iron: flags.includes('i') || undefined,
    vitC: flags.includes('v') || undefined,
    fibre: flags.includes('f') || undefined,
    src,
  }));

// flags: i = iron-rich, v = vitamin C source, f = fibre-rich

const SWALLOW = mk('Swallow', [
  ['oat-swallow', 'Oat swallow (oat fufu)', '1 small wrap (~150 g cooked, ≈40 g dry oats)', 155, 5, 27, 3, 'if', 'SA', 'High fibre'],
  ['oat-swallow-lg', 'Oat swallow, large', '1 large wrap (≈80 g dry oats)', 310, 11, 54, 6, 'if', 'USDA', 'High fibre'],
  ['eba', 'Eba (garri)', '1 medium wrap (280 g)', 350, 2, 84, 0.5, '', 'GS'],
  ['pounded-yam', 'Pounded yam', '1 medium wrap (300 g)', 390, 5, 90, 0.5, '', 'GS'],
  ['amala-yam', 'Amala (yam flour)', '1 medium wrap (280 g)', 310, 4, 72, 0.5, '', 'GS'],
  ['amala-plantain', 'Amala (plantain flour)', '1 medium wrap (280 g)', 295, 3, 69, 0.5, 'f', 'GS', 'Lower GI'],
  ['semovita', 'Semovita', '1 medium wrap (280 g)', 370, 11, 75, 1.5, '', 'GS'],
  ['wheat-swallow', 'Wheat swallow', '1 medium wrap (280 g)', 340, 12, 68, 2, 'f', 'GS'],
  ['fufu', 'Fufu (cassava)', '1 medium wrap (280 g)', 330, 2, 80, 0.5, '', 'GS'],
  ['tuwo-shinkafa', 'Tuwo shinkafa', '1 medium wrap (300 g)', 360, 7, 78, 1, '', 'GS'],
  ['starch', 'Starch (banga starch)', '1 medium wrap (280 g)', 340, 1, 83, 0.3, '', 'GS'],
]);

const SOUPS = mk('Soup & Stew', [
  ['efo-riro-light', 'Efo riro / ugu soup, light palm oil', '1 bowl (~250 g)', 165, 11, 9, 9, 'ivf', 'EST', 'Iron & folate'],
  ['okro-light', 'Okro soup, oil-light (lean meat/fish)', '1 bowl (~250 g)', 140, 14, 10, 5, 'ivf', 'EST', 'Easy to digest'],
  ['egusi', 'Egusi soup', '1 medium bowl (250 g)', 420, 18, 10, 34, 'i', 'GS', 'Calorie-dense'],
  ['edikaikong', 'Edikaikong', '1 medium bowl (250 g)', 280, 20, 8, 19, 'ivf', 'GS', 'Leafy'],
  ['ogbono', 'Ogbono soup', '1 medium bowl (250 g)', 380, 15, 9, 31, '', 'GS'],
  ['okra', 'Okra soup (standard)', '1 medium bowl (250 g)', 240, 16, 10, 15, 'vf', 'GS'],
  ['efo-riro', 'Efo riro (standard)', '1 medium bowl (250 g)', 260, 16, 9, 18, 'ivf', 'GS'],
  ['banga', 'Banga soup', '1 medium bowl (250 g)', 360, 14, 8, 30, '', 'GS'],
  ['oha', 'Oha soup', '1 medium bowl (250 g)', 300, 18, 9, 21, 'if', 'GS'],
  ['afang', 'Afang soup', '1 medium bowl (250 g)', 310, 20, 8, 22, 'if', 'GS'],
  ['groundnut-soup', 'Groundnut soup', '1 medium bowl (250 g)', 450, 18, 14, 37, '', 'GS'],
  ['pepper-soup-goat', 'Pepper soup (goat)', '1 bowl (300 g)', 190, 24, 3, 9, 'i', 'GS', 'Low fat'],
  ['pepper-soup-fish', 'Pepper soup (fish)', '1 bowl (300 g)', 150, 22, 3, 5, '', 'EST', 'Low fat'],
  ['vegetable-soup', 'Vegetable soup (ugu/waterleaf, assorted)', '1 medium bowl (250 g)', 250, 17, 8, 17, 'ivf', 'EST'],
  ['ewedu', 'Ewedu (jute leaf soup)', '1 bowl (150 g)', 60, 5, 6, 2, 'if', 'EST'],
  ['gbegiri', 'Gbegiri (bean soup)', '1 bowl (200 g)', 190, 10, 22, 7, 'if', 'EST'],
  ['stew-tomato', 'Tomato / pepper stew with beef', '1 serving (150 g)', 230, 14, 7, 16, 'v', 'EST', 'Palm/veg oil heavy'],
]);

const RICE = mk('Rice & Grains', [
  ['jollof', 'Jollof rice', '1 plate (300 g)', 420, 8, 78, 9, '', 'GS'],
  ['white-rice', 'White rice, boiled', '1 plate (300 g)', 390, 7, 85, 1, '', 'GS'],
  ['ofada', 'Ofada rice, boiled', '1 plate (300 g)', 400, 9, 80, 4, 'f', 'GS', 'Higher fibre'],
  ['ofada-120', 'Ofada / basmati rice, boiled', '120 g cooked', 155, 4, 34, 0.5, '', 'EST', 'Portion-controlled'],
  ['fried-rice', 'Fried rice', '1 plate (300 g)', 480, 10, 75, 15, '', 'GS'],
  ['waakye', 'Rice and beans (waakye)', '1 plate (350 g)', 460, 15, 80, 8, 'if', 'GS'],
  ['coconut-rice', 'Coconut rice', '1 plate (300 g)', 500, 8, 72, 20, '', 'GS'],
  ['oats-bowl', 'Rolled oats, cooked in water', '40 g dry (1 bowl)', 152, 5, 27, 3, 'if', 'USDA', 'Soluble fibre'],
  ['indomie', 'Indomie / instant noodles (plain)', '1 pack (70 g dry)', 315, 7, 43, 13, '', 'EST'],
  ['boiled-yam', 'Boiled yam', '150 g', 177, 3, 42, 0.3, '', 'USDA'],
  ['yam-egg', 'Yam and egg sauce', '1 plate (350 g)', 480, 16, 60, 20, '', 'GS'],
  ['fried-yam', 'Fried yam', '150 g', 340, 3, 50, 14, '', 'EST'],
  ['sweet-potato', 'Boiled sweet potato', '130 g', 112, 2, 26, 0.2, 'vf', 'USDA'],
  ['bread-2', 'Bread (Agege / sliced)', '2 slices (60 g)', 160, 5, 30, 1.5, '', 'EST'],
  ['garri-soaked', 'Garri, soaked (no sugar/milk)', '50 g dry garri', 178, 1, 43, 0.3, '', 'EST'],
]);

const BEANS = mk('Beans & Legumes', [
  ['ewa', 'Boiled beans (ewa), plain', '150 g cooked', 195, 13, 35, 1, 'if', 'EST', 'Iron & fibre'],
  ['moi-moi', 'Moi moi (steamed bean pudding)', '1 medium wrap (150 g)', 175, 10, 20, 6, 'if', 'GS'],
  ['moi-moi-lg', 'Moi moi with egg/fish', '1 large wrap (~200 g)', 230, 15, 26, 7, 'if', 'EST', 'Plant protein'],
  ['akara', 'Akara (bean cakes, fried)', '4 pieces (120 g)', 310, 11, 27, 18, 'i', 'GS', 'Deep fried'],
  ['ewa-agoyin', 'Ewa agoyin (mashed beans + sauce)', '1 plate (250 g)', 390, 17, 45, 15, 'if', 'AC'],
  ['beans-porridge', 'Beans porridge (ewa riro)', '1 bowl (300 g)', 330, 14, 45, 10, 'if', 'AC'],
  ['okpa', 'Okpa (Bambara nut pudding)', '1 wrap (150 g)', 240, 11, 30, 8, 'if', 'AC'],
  ['lentil-soup', 'Lentil soup', '1 cup (240 g)', 185, 12, 30, 2, 'if', 'EST'],
  ['kidney-beans-cooked', 'Kidney beans, cooked', '100 g', 127, 9, 23, 0.5, 'if', 'USDA'],
]);

const PROTEIN = mk('Protein', [
  ['chicken-breast', 'Grilled chicken breast', '150 g', 248, 46, 0, 5, '', 'USDA', 'High protein'],
  ['chicken-piece', 'Grilled chicken, skinless piece', '1 medium piece (150 g)', 240, 36, 0, 10, '', 'GS'],
  ['chicken-fried', 'Fried chicken piece', '1 medium piece (150 g)', 370, 28, 10, 24, '', 'EST'],
  ['suya', 'Suya (beef)', '1 stick (100 g)', 220, 25, 4, 12, 'i', 'GS'],
  ['beef-lean', 'Boiled lean beef', '100 g', 190, 29, 0, 8, 'i', 'USDA'],
  ['assorted-meat', 'Assorted meat (beef/tripe)', '100 g', 200, 22, 0, 12, 'i', 'GS'],
  ['goat-meat', 'Goat meat, cooked', '100 g', 143, 27, 0, 3.5, 'i', 'USDA'],
  ['ponmo', 'Ponmo (cow skin)', '100 g', 120, 27, 0, 1.5, '', 'GS', 'Mostly collagen'],
  ['turkey-grilled', 'Grilled turkey', '100 g', 150, 29, 0, 3, '', 'USDA'],
  ['snail', 'Snail (plain)', '3 medium (100 g)', 90, 16, 3, 1.5, 'i', 'GS', 'Lean, iron-rich'],
  ['snail-peppered', 'Peppered snail', '4 pieces (~120 g)', 135, 22, 3, 3, 'iv', 'EST'],
  ['croaker-grilled', 'Grilled croaker', '150 g', 215, 34, 0, 8, '', 'EST', 'Lean fish'],
  ['titus-grilled', 'Grilled titus (mackerel)', '100 g', 260, 24, 0, 18, '', 'USDA', 'Omega-3, higher fat'],
  ['tilapia-grilled', 'Grilled tilapia', '150 g', 192, 39, 0, 4, '', 'USDA'],
  ['catfish-grilled', 'Grilled catfish', '150 g', 216, 28, 0, 11, '', 'USDA'],
  ['fish-fried', 'Fried fish (tilapia)', '1 medium (180 g)', 290, 34, 8, 13, '', 'GS'],
  ['fish-dry', 'Dried / smoked fish', '50 g', 150, 32, 0, 2.5, 'i', 'EST'],
  ['stockfish', 'Stockfish (dry)', '50 g', 140, 33, 0, 1, '', 'GS', 'Very high protein'],
  ['crayfish', 'Ground crayfish', '15 g (1 tbsp)', 40, 8, 0.5, 0.7, 'i', 'EST'],
  ['egg-boiled-2', 'Boiled eggs', '2 large', 155, 13, 1, 11, 'i', 'GS'],
  ['egg-boiled-1', 'Boiled egg', '1 large', 78, 6.5, 0.5, 5.5, 'i', 'GS'],
  ['egg-white-4', 'Egg whites, oil-free scramble', '4 large', 68, 14, 1, 0, '', 'USDA'],
  ['yogurt-greek', 'Greek yogurt, 0% fat, unsweetened', '170 g', 100, 18, 6, 0, '', 'USDA'],
  ['tuna', 'Tuna, canned in water', '120 g', 132, 29, 0, 1, 'i', 'USDA'],
  ['salmon', 'Baked salmon fillet', '130 g', 268, 29, 0, 16, '', 'USDA', 'Anti-inflammatory'],
  ['protein-shake', 'Whey / plant protein shake', '1 scoop in water', 120, 24, 3, 1.5, '', 'EST', 'Post-workout'],
]);

const SNACKS = mk('Snacks & Street Food', [
  ['puff-puff', 'Puff puff', '4 pieces (100 g)', 350, 5, 45, 17, '', 'GS'],
  ['boli', 'Boli (roasted plantain)', '1 medium (120 g)', 175, 2, 42, 0.5, 'f', 'GS'],
  ['plantain-boiled', 'Boiled unripe plantain', '120 g', 145, 1.5, 36, 0.3, 'ivf', 'EST', 'Slow digesting'],
  ['plantain-fried', 'Fried ripe plantain (dodo)', '100 g (~5 slices)', 250, 1.5, 40, 10, '', 'AC'],
  ['chin-chin', 'Chin chin', '1 handful (60 g)', 270, 4, 35, 13, '', 'GS'],
  ['meat-pie', 'Meat pie', '1 standard (170 g)', 430, 10, 45, 23, '', 'GS'],
  ['sausage-roll', 'Sausage roll', '1 standard (100 g)', 330, 8, 28, 21, '', 'GS'],
  ['groundnut', 'Roasted groundnuts', '1 small cup (50 g)', 290, 12.5, 8, 24, '', 'GS', 'Watch portions'],
  ['almonds', 'Raw almonds', '15 g (~12 nuts)', 87, 3, 3, 7.5, 'f', 'USDA'],
  ['tiger-nut', 'Tiger nuts (aya)', '30 g', 120, 2, 18, 5, 'f', 'EST'],
  ['garden-egg', 'Garden eggs + 1 tsp peanut paste', '3 medium', 85, 3, 10, 4, 'vf', 'EST', 'Low calorie, filling'],
  ['asun', 'Asun (peppered goat)', '100 g', 235, 22, 3, 15, 'i', 'AC'],
  ['popcorn', 'Popcorn, air-popped', '2 cups (16 g)', 62, 2, 12, 0.7, 'f', 'USDA'],
]);

const BREAKFAST = mk('Breakfast & Drinks', [
  ['pap', 'Ogi / akamu / pap, unsweetened', '1 bowl (300 ml)', 110, 2, 24, 0.5, '', 'GS', 'Gentle on stomach'],
  ['pap-milk', 'Ogi with evaporated milk', '1 bowl + 3 tbsp milk', 210, 6, 32, 6, '', 'GS'],
  ['zobo-sweet', 'Zobo, sweetened', '250 ml', 90, 0, 22, 0, 'v', 'EST'],
  ['zobo-plain', 'Zobo, unsweetened', '250 ml', 10, 0, 2, 0, 'v', 'EST'],
  ['kunu', 'Kunu', '300 ml', 150, 2, 32, 1, '', 'EST'],
  ['malt', 'Malt drink', '1 can (330 ml)', 140, 1, 33, 0, '', 'EST'],
  ['soft-drink', 'Soft drink (Coke/Sprite type)', '50 cl bottle', 210, 0, 53, 0, '', 'FN'],
  ['orange-juice', 'Orange juice', '1 cup (248 g)', 111, 2, 26, 0.5, 'v', 'FN'],
  ['coconut-water', 'Coconut water', '1 cup (240 g)', 45, 0, 11, 0, '', 'FN'],
  ['milk-evap', 'Evaporated milk', '1 tbsp (15 g)', 20, 1, 1.5, 1.1, '', 'EST'],
  ['honey', 'Honey', '1 tsp (7 g)', 21, 0, 5.7, 0, '', 'USDA'],
  ['sugar', 'Sugar', '1 tsp (4 g)', 16, 0, 4, 0, '', 'USDA'],
  ['palm-oil-tbsp', 'Palm oil', '1 tbsp (14 g)', 120, 0, 0, 14, '', 'USDA'],
  ['olive-oil-tsp', 'Olive / vegetable oil', '1 tsp (5 g)', 40, 0, 0, 4.5, '', 'USDA'],
]);

const FRUIT = mk('Fruit', [
  ['pawpaw', 'Pawpaw (papaya) cubes', '150 g', 65, 1, 16, 0, 'vf', 'FN', 'Digestive enzymes'],
  ['orange', 'Orange', '1 large (150 g)', 70, 1, 17, 0, 'vf', 'FN', 'Boosts iron absorption'],
  ['tangerine', 'Tangerine', '1 medium (88 g)', 47, 0.7, 12, 0.3, 'vf', 'USDA'],
  ['banana', 'Banana', '1 medium (118 g)', 105, 1.3, 27, 0.4, 'f', 'FN'],
  ['apple', 'Apple', '1 medium (160 g)', 95, 0.5, 25, 0.3, 'f', 'FN'],
  ['pineapple', 'Pineapple', '1 slice (84 g)', 42, 0.5, 11, 0.1, 'v', 'FN'],
  ['watermelon', 'Watermelon', '1 wedge (286 g)', 86, 1.7, 22, 0.4, 'v', 'USDA'],
  ['mango', 'Mango', '1 medium (flesh only)', 201, 2.8, 50, 1.3, 'vf', 'FN'],
  ['guava', 'Guava', '1 fruit (55 g)', 38, 1.4, 8, 0.5, 'vf', 'FN', 'Very high vitamin C'],
  ['avocado', 'Avocado', 'Half medium (~75 g)', 120, 1.5, 6, 11, 'vf', 'USDA', 'Healthy fats'],
  ['coconut', 'Coconut, fresh', '1 piece (45 g)', 159, 1.5, 7, 15, 'f', 'FN'],
  ['agbalumo', 'Agbalumo / udara (African star apple)', '100 g', 67, 1, 15, 0.4, 'v', 'USDA'],
  ['soursop', 'Soursop (sapsap)', '100 g', 66, 1, 17, 0.3, 'vf', 'USDA'],
  ['pear', 'Pear', '1 medium (178 g)', 102, 0.6, 27, 0.2, 'f', 'FN'],
  ['grapefruit', 'Grapefruit', 'Half (123 g)', 52, 1, 13, 0.2, 'v', 'FN'],
  ['lemon', 'Lemon, whole', '1 (58 g)', 17, 0.6, 5, 0.2, 'v', 'FN'],
  ['grapes', 'Grapes', '100 g', 69, 0.7, 18, 0.2, '', 'USDA'],
  ['strawberries', 'Strawberries', '100 g', 32, 0.7, 7.7, 0.3, 'vf', 'USDA'],
  ['dates', 'Dates', '1 date (7 g)', 20, 0.2, 5, 0, '', 'FN'],
]);

const VEG = mk('Vegetable', [
  ['veg-broccoli-peppers', 'Steamed broccoli & bell peppers', '150 g', 55, 4, 10, 0.5, 'vf', 'EST', 'Collagen & vitamin C'],
  ['veg-spinach-tomato', 'Sautéed spinach & tomatoes (1 tsp oil)', '150 g', 80, 4, 6, 5, 'ivf', 'EST', 'Iron + vitamin C'],
  ['veg-salad', 'Cucumber, cabbage & carrot salad (no cream)', '200 g', 50, 2, 11, 0, 'vf', 'EST', 'High volume'],
  ['veg-ugu-steamed', 'Ugu (fluted pumpkin leaf), steamed', '150 g', 60, 6, 7, 1.2, 'ivf', 'EST', 'Iron & folate'],
  ['veg-spinach', 'Spinach (efo tete), boiled', '150 g', 35, 4.3, 5, 0.6, 'ivf', 'USDA'],
  ['veg-cabbage', 'Cabbage, steamed', '150 g', 38, 2, 9, 0.2, 'vf', 'USDA'],
  ['veg-carrot', 'Carrots, boiled', '100 g', 35, 0.8, 8, 0.2, 'f', 'USDA'],
  ['veg-lettuce', 'Lettuce (salad)', '100 g', 15, 1.4, 2.9, 0.2, 'f', 'USDA'],
  ['veg-cucumber', 'Cucumber', '100 g', 15, 0.7, 3.6, 0.1, '', 'USDA'],
  ['veg-tomato', 'Tomato, fresh', '1 medium (120 g)', 22, 1, 5, 0.2, 'v', 'USDA'],
  ['veg-okra', 'Okra, boiled', '100 g', 33, 1.9, 7.5, 0.2, 'vf', 'USDA'],
  ['veg-bitterleaf', 'Bitter leaf, washed & cooked', '100 g', 35, 3.5, 5, 0.5, 'if', 'EST'],
  ['veg-waterleaf', 'Waterleaf, cooked', '100 g', 22, 2, 3, 0.4, 'f', 'EST'],
  ['veg-greenbeans', 'Green beans, steamed', '100 g', 31, 1.8, 7, 0.2, 'vf', 'USDA'],
  ['veg-garden-egg', 'Garden egg, raw', '100 g', 25, 1, 6, 0.2, 'f', 'USDA'],
]);

const TEA = mk('Tea & Beverage', [
  ['tea-tw-green', 'Twinings Pure Green Tea', '1 tea bag (~200 ml)', 1, 0, 0.2, 0, '', 'TW', 'Unsweetened'],
  ['tea-tw-green-mint', 'Twinings Green Tea & Mint', '1 tea bag (~200 ml)', 1, 0, 0.2, 0, '', 'TW', 'Unsweetened'],
  ['tea-tw-green-lemon', 'Twinings Green Tea & Lemon', '1 tea bag (~200 ml)', 1, 0, 0.2, 0, '', 'TW', 'Unsweetened'],
  ['tea-tw-green-jasmine', 'Twinings Green Jasmine Tea', '1 tea bag (~200 ml)', 1, 0, 0.2, 0, '', 'TW', 'Unsweetened'],
  ['tea-tw-green-decaf', 'Twinings Organic Decaffeinated Green Tea', '1 tea bag (~200 ml)', 1, 0, 0.2, 0, '', 'TW', 'Unsweetened'],
  ['tea-tw-lemon-ginger', 'Twinings Lemon & Ginger', '1 tea bag (~200 ml)', 2, 0, 0.4, 0, '', 'TW', 'Unsweetened'],
  ['tea-tw-peppermint', 'Twinings Peppermint', '1 tea bag (~200 ml)', 1, 0, 0.2, 0, '', 'TW', 'Unsweetened'],
  ['tea-tw-camomile', 'Twinings Pure Camomile', '1 tea bag (~200 ml)', 2, 0, 0.4, 0, '', 'TW', 'Unsweetened'],
  ['tea-tw-earl-grey', 'Twinings Earl Grey', '1 tea bag (~200 ml)', 2, 0, 0.4, 0, '', 'TW', 'Unsweetened'],
  ['tea-tw-english', 'Twinings English Breakfast', '1 tea bag (~200 ml)', 2, 0, 0.4, 0, '', 'TW', 'Unsweetened'],
  ['tea-green-generic', 'Green tea (any brand, unsweetened)', '1 cup (240 ml)', 2, 0, 0.4, 0, '', 'USDA'],
  ['tea-ginger-fresh', 'Fresh ginger tea (no sugar)', '1 cup (240 ml)', 5, 0, 1, 0, '', 'EST'],
  ['water-lemon', 'Lemon water', '1 glass (250 ml)', 3, 0, 1, 0, 'v', 'EST'],
]);

export const BUILTIN_FOODS: Food[] = [
  ...SOUPS,
  ...SWALLOW,
  ...RICE,
  ...BEANS,
  ...PROTEIN,
  ...VEG,
  ...FRUIT,
  ...SNACKS,
  ...BREAKFAST,
  ...TEA,
];

export const FOOD_CATEGORIES: FoodCategory[] = [
  'Soup & Stew',
  'Swallow',
  'Rice & Grains',
  'Beans & Legumes',
  'Protein',
  'Vegetable',
  'Fruit',
  'Snacks & Street Food',
  'Breakfast & Drinks',
  'Tea & Beverage',
  'Recipe',
  'Custom',
];

export const SOURCE_LABELS: Record<Source, string> = {
  GS: 'GymSquare Nigerian calorie calculator',
  FN: 'FitNigerian calories table',
  AC: 'AfroCalorie Nigeria',
  SA: 'Sundry Agro oat-swallow guide',
  TW: 'Twinings (FatSecret / MyFoodDiary / Nutracheck)',
  USDA: 'USDA composition data, scaled to portion',
  EST: 'Estimate from standard composition',
};
