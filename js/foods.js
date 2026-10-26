// Wild foods people can cache. months = when it's usually ripe (1 = Jan).
// Seasons vary a lot by region, so these are rough North American guides.
// icon: an emoji, or "berry" to draw a drupelet berry in `color`.
export const FOODS = [
  { id: 'blackberry',  name: 'Blackberries',  icon: 'berry', color: '#3b1f4a', months: [7, 8, 9] },
  { id: 'raspberry',   name: 'Raspberries',   icon: 'berry', color: '#c2185b', months: [6, 7, 8] },
  { id: 'salmonberry', name: 'Salmonberries', icon: 'berry', color: '#f28c28', months: [5, 6] },
  { id: 'mulberry',    name: 'Mulberries',    icon: 'berry', color: '#5b2a86', months: [5, 6, 7] },
  { id: 'elderberry',  name: 'Elderberries',  icon: 'berry', color: '#2b2140', months: [8, 9] },
  { id: 'blueberry',   name: 'Blueberries',   icon: '🫐', color: '#3f51b5', months: [7, 8] },
  { id: 'huckleberry', name: 'Huckleberries', icon: '🫐', color: '#6a3d9a', months: [7, 8, 9] },
  { id: 'strawberry',  name: 'Wild strawberries', icon: '🍓', color: '#e53935', months: [5, 6] },
  { id: 'apple',       name: 'Apples',        icon: '🍎', color: '#d32f2f', months: [8, 9, 10] },
  { id: 'pear',        name: 'Pears',         icon: '🍐', color: '#9ccc65', months: [8, 9, 10] },
  { id: 'plum',        name: 'Plums',         icon: '🍑', color: '#ad1457', months: [7, 8, 9] },
  { id: 'cherry',      name: 'Cherries',      icon: '🍒', color: '#b71c1c', months: [6, 7] },
  { id: 'grape',       name: 'Grapes',        icon: '🍇', color: '#7b1fa2', months: [8, 9, 10] },
  { id: 'citrus',      name: 'Citrus',        icon: '🍋', color: '#fbc02d', months: [11, 12, 1, 2, 3, 4] },
  { id: 'olive',       name: 'Olives',        icon: '🫒', color: '#689f38', months: [10, 11, 12] },
  { id: 'nuts',        name: 'Nuts',          icon: '🌰', color: '#8d5524', months: [8, 9, 10] },
  { id: 'garlic',      name: 'Wild garlic',   icon: '🧄', color: '#c5b8a5', months: [3, 4, 5] },
  { id: 'greens',      name: 'Greens & nettles', icon: '🌱', color: '#43a047', months: [3, 4, 5] },
  { id: 'herbs',       name: 'Herbs',         icon: '🌿', color: '#2e7d32', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { id: 'mushroom',    name: 'Mushrooms',     icon: '🍄', color: '#a1887f', months: [9, 10, 11],
    warning: 'Never eat a wild mushroom unless an expert has identified it in person.' },
  { id: 'other',       name: 'Other',         icon: '🧺', color: '#795548', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
];

export const FOOD_BY_ID = Object.fromEntries(FOODS.map(f => [f.id, f]));

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function inSeason(food, date = new Date()) {
  return food.months.includes(date.getMonth() + 1);
}

export function seasonLabel(food) {
  if (food.months.length === 12) return 'All year';
  const m = food.months;
  return `${MONTHS[m[0] - 1]} – ${MONTHS[m[m.length - 1] - 1]}`;
}

// Small inline icon (HTML string) for a food.
export function foodIcon(food, size = 22) {
  if (food.icon !== 'berry') {
    return `<span class="emoji" style="font-size:${size}px;line-height:1">${food.icon}</span>`;
  }
  const c = food.color;
  const dots = [[8, 9], [14, 9], [11, 14], [5, 14], [17, 14], [8, 19], [14, 19], [11, 24]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${c}"/><circle cx="${x - 1}" cy="${y - 1}" r="1" fill="#fff" opacity=".35"/>`)
    .join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 22 28" aria-hidden="true">
    <path d="M11 6 C9 2 6 2 4 3 M11 6 C13 2 16 2 18 3" stroke="#2e7d32" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${dots}</svg>`;
}
