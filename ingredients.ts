import type { Ingredient, Recipe, RecipeItem, Source } from '../lib/types';

/**
 * Raw / dry ingredient values PER 100 g (or 100 ml for liquids).
 * Weigh ingredients raw (or dry) BEFORE cooking when you use these.
 * Sources: USDA FoodData Central unless noted; ugu from Awajis / Africana Food (≈40 kcal/100 g;
 * other Nigerian tables list 26-61 kcal, so it is a middle-of-the-road value).
 */
type G = Ingredient['group'];
type R = [id: string, name: string, kcal: number, p: number, c: number, f: number, flags: string, src: Source];

const mk = (group: G, rows: R[]): Ingredient[] =>
  rows.map(([id, name, kcal, p, c, f, flags, src]) => ({
    id,
    name,
    kcal,
    p,
    c,
    f,
    group,
    iron: flags.includes('i') || undefined,
    vitC: flags.includes('v') || undefined,
    fibre: flags.includes('f') || undefined,
    src,
  }));

export const INGREDIENTS: Ingredient[] = [
  ...mk('Vegetable', [
    ['ugu', 'Ugu (fluted pumpkin leaf), raw', 40, 4, 5, 0.8, 'ivf', 'EST'],
    ['spinach', 'Spinach (efo tete), raw', 23, 2.9, 3.6, 0.4, 'ivf', 'USDA'],
    ['lettuce', 'Lettuce, raw', 15, 1.4, 2.9, 0.2, 'f', 'USDA'],
    ['celery', 'Celery, raw', 14, 0.7, 3, 0.2, 'f', 'USDA'],
    ['spring-onion', 'Spring onion, raw', 32, 1.8, 7.3, 0.2, 'v', 'USDA'],
    ['cabbage', 'Cabbage, raw', 25, 1.3, 5.8, 0.1, 'vf', 'USDA'],
    ['carrot', 'Carrot, raw', 41, 0.9, 9.6, 0.2, 'f', 'USDA'],
    ['onion', 'Onion, raw', 40, 1.1, 9.3, 0.1, '', 'USDA'],
    ['green-pepper', 'Green pepper, raw', 20, 0.9, 4.6, 0.2, 'v', 'USDA'],
    ['red-bell-pepper', 'Red bell pepper (tatashe), raw', 31, 1, 6, 0.3, 'v', 'USDA'],
    ['scotch-bonnet', 'Scotch bonnet / chilli pepper (ata rodo), raw', 40, 1.9, 8.8, 0.4, 'v', 'USDA'],
    ['ginger', 'Ginger, raw', 80, 1.8, 17.8, 0.8, '', 'USDA'],
    ['garlic', 'Garlic, raw', 149, 6.4, 33, 0.5, '', 'USDA'],
    ['tomato', 'Tomato, raw', 18, 0.9, 3.9, 0.2, 'v', 'USDA'],
    ['okra', 'Okra, raw', 33, 1.9, 7.5, 0.2, 'vf', 'USDA'],
    ['bitterleaf', 'Bitter leaf, raw', 35, 3.5, 5, 0.5, 'if', 'EST'],
    ['waterleaf', 'Waterleaf, raw', 22, 2, 3, 0.4, 'f', 'EST'],
    ['ewedu', 'Jute leaf (ewedu), raw', 34, 4.7, 5.8, 0.3, 'if', 'USDA'],
    ['garden-egg', 'Garden egg, raw', 25, 1, 6, 0.2, 'f', 'USDA'],
    ['cucumber', 'Cucumber, raw', 15, 0.7, 3.6, 0.1, '', 'USDA'],
    ['broccoli', 'Broccoli, raw', 34, 2.8, 6.6, 0.4, 'vf', 'USDA'],
    ['green-beans', 'Green beans, raw', 31, 1.8, 7, 0.2, 'vf', 'USDA'],
    ['pumpkin', 'Pumpkin, raw', 26, 1, 6.5, 0.1, 'f', 'USDA'],
  ]),
  ...mk('Legume', [
    ['kidney-dry', 'Kidney beans, DRY', 337, 23.6, 61.3, 0.8, 'if', 'USDA'],
    ['kidney-cooked', 'Kidney beans, cooked', 127, 8.7, 22.8, 0.5, 'if', 'USDA'],
    ['peas-dry', 'Green split peas, DRY', 341, 24.6, 60.4, 1.2, 'if', 'USDA'],
    ['peas-cooked', 'Green peas (split), cooked', 118, 8.3, 21, 0.4, 'if', 'USDA'],
    ['brown-beans-dry', 'Brown / white beans (cowpea), DRY', 336, 23.9, 60, 1.3, 'if', 'USDA'],
    ['beans-cooked', 'Brown / white beans (cowpea), cooked', 116, 7.7, 20.8, 0.5, 'if', 'USDA'],
    ['lentils-dry', 'Lentils, DRY', 352, 24.6, 63, 1.1, 'if', 'USDA'],
  ]),
  ...mk('Protein', [
    ['chicken-breast-raw', 'Chicken breast, skinless, raw', 120, 22.5, 0, 2.6, '', 'USDA'],
    ['chicken-thigh-raw', 'Chicken thigh, skinless, raw', 121, 19.7, 0, 4.1, '', 'USDA'],
    ['chicken-skin-raw', 'Chicken pieces WITH skin, raw', 215, 18.6, 0, 15.1, '', 'USDA'],
    ['croaker-raw', 'Croaker fish, raw', 104, 17.8, 0, 3.2, '', 'USDA'],
    ['titus-raw', 'Titus / mackerel, raw', 205, 18.6, 0, 13.9, '', 'USDA'],
    ['tilapia-raw', 'Tilapia, raw', 96, 20.1, 0, 1.7, '', 'USDA'],
    ['catfish-raw', 'Catfish, raw', 95, 16.4, 0, 2.8, '', 'USDA'],
    ['stockfish', 'Stockfish (dried cod)', 290, 62.8, 0, 2.4, '', 'USDA'],
    ['crayfish-dry', 'Dried crayfish, ground', 280, 58, 3, 4, 'i', 'EST'],
    ['beef-raw', 'Beef, lean, raw', 143, 21, 0, 6, 'i', 'USDA'],
    ['goat-raw', 'Goat meat, raw', 109, 20, 0, 2.3, 'i', 'USDA'],
    ['turkey-raw', 'Turkey breast, raw', 114, 23.7, 0, 1.5, '', 'USDA'],
    ['egg', 'Egg, whole', 143, 12.6, 0.7, 9.5, 'i', 'USDA'],
    ['egg-white', 'Egg white', 52, 10.9, 0.7, 0.2, '', 'USDA'],
    ['snail', 'Snail', 90, 16, 3, 1.4, 'i', 'USDA'],
  ]),
  ...mk('Grain & Starch', [
    ['oats', 'Rolled oats, DRY', 389, 16.9, 66.3, 6.9, 'if', 'USDA'],
    ['oat-flour', 'Oat flour (blended oats), DRY', 404, 14.7, 65.7, 9.1, 'if', 'USDA'],
    ['rice-raw', 'White rice, DRY', 365, 7.1, 80, 0.7, '', 'USDA'],
    ['garri', 'Garri, dry', 358, 1, 88, 0.5, '', 'EST'],
    ['yam-raw', 'Yam, raw', 118, 1.5, 28, 0.2, '', 'USDA'],
    ['plantain-raw', 'Plantain, raw (unripe or ripe)', 122, 1.3, 32, 0.4, 'f', 'USDA'],
    ['sweet-potato-raw', 'Sweet potato, raw', 86, 1.6, 20, 0.1, 'vf', 'USDA'],
  ]),
  ...mk('Fat & Seasoning', [
    ['palm-oil', 'Palm oil', 884, 0, 0, 100, '', 'USDA'],
    ['veg-oil', 'Vegetable / groundnut oil', 884, 0, 0, 100, '', 'USDA'],
    ['olive-oil', 'Olive oil', 884, 0, 0, 100, '', 'USDA'],
    ['peanut-paste', 'Peanut paste (groundnut butter)', 588, 25, 20, 50, '', 'USDA'],
    ['maggi-cube', 'Maggi / seasoning cube', 240, 8, 22, 13, '', 'EST'],
    ['tomato-paste', 'Tomato paste (carbs net of fibre)', 82, 4.3, 15, 0.5, 'v', 'USDA'],
    ['salt', 'Salt', 0, 0, 0, 0, '', 'USDA'],
  ]),
  ...mk('Liquid', [
    ['water', 'Water (ml)', 0, 0, 0, 0, '', 'USDA'],
    ['chicken-stock', 'Chicken stock / broth (ml)', 5, 0.6, 0.4, 0.2, '', 'USDA'],
    ['evap-milk', 'Evaporated milk (ml)', 134, 6.8, 10, 7.6, '', 'USDA'],
  ]),
];

let seq = 0;
const item = (ingId: string, grams: number): RecipeItem => {
  const ing = INGREDIENTS.find((i) => i.id === ingId);
  if (!ing) throw new Error('Unknown ingredient ' + ingId);
  return {
    key: `${ingId}-${seq++}`,
    ingId,
    name: ing.name,
    grams,
    kcal100: ing.kcal,
    p100: ing.p,
    c100: ing.c,
    f100: ing.f,
    iron: ing.iron,
    vitC: ing.vitC,
    fibre: ing.fibre,
  };
};

export const newItemFromIngredient = item;

/**
 * Starter recipes modelled on the user's own cooking. The INGREDIENTS are theirs;
 * the QUANTITIES are placeholders (they were not provided) and are flagged `starter`
 * until the user edits them.
 */
export function makeStarterRecipes(): Recipe[] {
  seq = 0; // deterministic keys so every device builds identical starter recipes
  return [
    {
      id: 'starter-mixed-veg-soup',
      name: 'Mixed vegetable soup (ugu, lettuce, celery, spinach + fish)',
      servings: 3,
      starter: true,
      notes:
        'Ugu + lettuce + celery + spring onion + spinach, chicken stock, a little palm oil and 3 pieces of fish cut from one whole fish. ' +
        'Quantities are placeholders: weigh each vegetable raw, weigh only the fish pieces that went into the pot (edible weight), ' +
        'and set the number of portions the pot made. Change the fish type if yours was different.',
      items: [
        item('ugu', 300),
        item('lettuce', 100),
        item('celery', 60),
        item('spring-onion', 40),
        item('spinach', 150),
        item('chicken-stock', 500),
        item('palm-oil', 15),
        item('croaker-raw', 200),
      ],
    },
    {
      id: 'starter-chicken-sauce',
      name: 'No-oil chicken veggie sauce (beans, peas, cabbage, bell peppers)',
      servings: 4,
      starter: true,
      notes:
        'Chicken, cabbage, lettuce, carrots, kidney beans, dried green peas, celery, spring onion, spinach, onions, green pepper, red bell pepper, ginger, Maggi and salt, no oil. ' +
        'Quantities are placeholders: weigh the chicken and vegetables raw, and the beans and peas DRY (before soaking/boiling), then set how many portions the pot made.',
      items: [
        item('chicken-breast-raw', 400),
        item('cabbage', 200),
        item('lettuce', 100),
        item('carrot', 100),
        item('kidney-dry', 40),
        item('peas-dry', 40),
        item('celery', 50),
        item('spring-onion', 40),
        item('spinach', 100),
        item('onion', 100),
        item('green-pepper', 80),
        item('red-bell-pepper', 80),
        item('ginger', 15),
        item('maggi-cube', 8),
        item('salt', 3),
      ],
    },
  ];
}
