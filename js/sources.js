// Pulls wild food spots from public data for the area on screen:
//  - iNaturalist: photo-verified sightings ("research grade"), exact locations only
//  - OpenStreetMap: individual trees/shrubs tagged with an edible species
// Both are free, keyless, and allow browser requests.

// iNaturalist genus ids (looked up once from /v1/taxa).
const INAT_GENERA = {
  Rubus: 47544, Malus: 54500, Pyrus: 58736, Prunus: 47351, Morus: 56091, Sambucus: 52689,
  Vaccinium: 48353, Fragaria: 50299, Vitis: 60773, Citrus: 54297, Olea: 57145, Juglans: 54495,
  Corylus: 53373, Castanea: 49187, Carya: 54788, Allium: 47357, Urtica: 51886, Ficus: 50999,
  Diospyros: 83434, Amelanchier: 49230, Cydonia: 82855, Eriobotrya: 72119, Gaultheria: 48442,
  Cantharellus: 47348, Mentha: 54570, Foeniculum: 53053, Ribes: 47130, Asimina: 50900,
};

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// Decide which food a plant is, from its scientific name (and common name as
// a fallback). Returns { food, label } or null for anything not worth picking
// (ornamentals, poisonous look-alikes, unknown species).
export function classify(sci = '', common = '') {
  const s = sci.trim().toLowerCase().replace(/\s+/g, ' ');
  const [genus, species = ''] = s.replace(/ ×/g, '').split(' ');
  const c = common.toLowerCase();
  const is = (...names) => names.includes(species);

  switch (genus) {
    case 'rubus':
      if (is('parviflorus')) return { food: 'thimbleberry' };
      if (is('spectabilis')) return { food: 'salmonberry' };
      if (is('idaeus', 'leucodermis', 'occidentalis', 'strigosus', 'phoenicolasius')) return { food: 'raspberry' };
      return { food: 'blackberry' };
    case 'malus': return { food: 'apple' };
    case 'pyrus':
      if (is('calleryana')) return null; // Bradford pear: ornamental, inedible
      return { food: 'pear' };
    case 'prunus':
      if (is('avium', 'cerasus', 'virginiana', 'emarginata', 'serotina', 'pensylvanica')) return { food: 'cherry' };
      if (is('domestica', 'cerasifera', 'americana', 'spinosa', 'salicina', 'subcordata', 'angustifolia', 'maritima', 'mexicana', 'insititia')) return { food: 'plum' };
      if (is('persica')) return { food: 'other', label: 'Peach' };
      if (is('armeniaca')) return { food: 'other', label: 'Apricot' };
      if (is('dulcis')) return { food: 'nuts', label: 'Almond' };
      return null; // ornamental cherries, cherry laurel (poisonous), etc.
    case 'morus': return { food: 'mulberry' };
    case 'sambucus':
      if (is('nigra', 'cerulea', 'canadensis', 'caerulea')) return { food: 'elderberry' };
      return null; // red elderberry and others
    case 'vaccinium':
      if (is('ovatum', 'parvifolium', 'membranaceum', 'deliciosum', 'globulare', 'scoparium', 'cespitosum')) return { food: 'huckleberry' };
      if (is('macrocarpon', 'oxycoccos')) return { food: 'other', label: 'Cranberry' };
      return { food: 'blueberry' };
    case 'fragaria': return { food: 'strawberry' };
    case 'vitis': return { food: 'grape' };
    case 'citrus': return { food: 'citrus' };
    case 'olea': return { food: 'olive' };
    case 'juglans': return { food: 'nuts', label: 'Walnut' };
    case 'corylus': return { food: 'nuts', label: 'Hazelnut' };
    case 'castanea': return { food: 'nuts', label: 'Chestnut' };
    case 'carya': return { food: 'nuts', label: species === 'illinoinensis' ? 'Pecan' : 'Hickory nut' };
    case 'allium':
      if (is('ursinum', 'tricoccum', 'vineale', 'canadense', 'triquetrum')) return { food: 'garlic' };
      return null; // too easy to confuse with poisonous look-alikes
    case 'urtica': return { food: 'greens', label: 'Stinging nettle' };
    case 'ficus': return is('carica') ? { food: 'fig' } : null;
    case 'diospyros': return is('virginiana', 'kaki') ? { food: 'persimmon' } : null;
    case 'amelanchier': return { food: 'serviceberry' };
    case 'ribes': return { food: 'currant' };
    case 'cydonia': return { food: 'other', label: 'Quince' };
    case 'eriobotrya': return { food: 'other', label: 'Loquat' };
    case 'asimina': return { food: 'other', label: 'Pawpaw' };
    case 'gaultheria': return is('shallon') ? { food: 'other', label: 'Salal' } : null;
    case 'cantharellus': return { food: 'mushroom', label: 'Chanterelle' };
    case 'mentha': return { food: 'herbs', label: 'Wild mint' };
    case 'foeniculum': return { food: 'herbs', label: 'Wild fennel' };
  }

  // OpenStreetMap sometimes only has an English name or a produce tag.
  const words = [
    [/apple/, 'apple'], [/pear/, 'pear'], [/plum|prune/, 'plum'], [/cherry/, 'cherry'],
    [/\bfig\b/, 'fig'], [/walnut|hazel|chestnut|pecan|almond/, 'nuts'], [/mulberr/, 'mulberry'],
    [/blackberr|bramble/, 'blackberry'], [/raspberr/, 'raspberry'], [/lemon|orange|lime|citrus|grapefruit/, 'citrus'],
    [/olive/, 'olive'], [/grape/, 'grape'], [/persimmon/, 'persimmon'],
  ];
  if (/laurel|ornamental|flowering|bradford|callery/.test(c)) return null;
  for (const [re, food] of words) if (re.test(c)) return { food };
  return null;
}

function inatFields() {
  return '(id:!t,location:!t,observed_on:!t,taxon:(name:!t,preferred_common_name:!t),user:(login:!t),photos:(url:!t,license_code:!t,attribution:!t))';
}

export async function fetchINat({ s, w, n, e }, signal) {
  const params = new URLSearchParams({
    swlat: s, swlng: w, nelat: n, nelng: e,
    taxon_id: Object.values(INAT_GENERA).join(','),
    quality_grade: 'research',
    geoprivacy: 'open',
    taxon_geoprivacy: 'open',
    per_page: '200',
    order_by: 'observed_on',
    fields: inatFields(),
  });
  const res = await fetch(`https://api.inaturalist.org/v2/observations?${params}`, { signal });
  if (!res.ok) throw new Error(`iNaturalist ${res.status}`);
  const { results = [] } = await res.json();
  const out = [];
  for (const o of results) {
    if (!o.location || !o.taxon) continue;
    const kind = classify(o.taxon.name, o.taxon.preferred_common_name || '');
    if (!kind) continue;
    const [lat, lng] = o.location.split(',').map(Number);
    const photo = o.photos?.[0];
    out.push({
      id: `inat:${o.id}`,
      food: kind.food,
      title: cap(o.taxon.preferred_common_name) || kind.label || o.taxon.name,
      sci: o.taxon.name,
      lat, lng,
      seenOn: o.observed_on,
      photo: photo && photo.license_code ? { url: photo.url.replace('/square.', '/medium.'), credit: photo.attribution } : null,
      source: { name: 'iNaturalist', url: `https://www.inaturalist.org/observations/${o.id}`, by: o.user?.login },
      logs: [],
    });
  }
  out.full = results.length >= 200;
  return out;
}

const OSM_GENERA = 'Malus|Pyrus|Prunus|Ficus|Juglans|Corylus|Castanea|Carya|Morus|Rubus|Citrus|Olea|Vitis|Sambucus|Vaccinium|Diospyros|Cydonia|Eriobotrya|Amelanchier|Ribes|Asimina';

export async function fetchOSM({ s, w, n, e }, signal) {
  const b = `${s},${w},${n},${e}`;
  // Plain "has a species tag" queries are much faster on Overpass than regex
  // matches; the food filtering happens here in classify().
  const q = `[out:json][timeout:40];
(
  nwr["genus"](${b});
  nwr["species"](${b});
  nwr["taxon"](${b});
  node["produce"](${b});
);
out tags center 2000;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: new URLSearchParams({ data: q }),
    signal,
  });
  if (!res.ok) throw new Error(`OpenStreetMap ${res.status}`);
  const { elements = [] } = await res.json();
  const out = [];
  for (const el of elements) {
    const t = el.tags || {};
    if (t.landuse === 'orchard') continue; // commercial orchards are private farms
    const sci = t.species || t.taxon || t.genus || '';
    const common = t['species:en'] || t['taxon:en'] || t.produce || '';
    const kind = classify(sci, common);
    if (!kind) continue;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null) continue;
    out.push({
      id: `osm:${el.type}/${el.id}`,
      food: kind.food,
      title: cap(t['species:en'] || t.name) || kind.label || null,
      sci: sci || null,
      lat, lng,
      notes: t.note || t.description || '',
      source: { name: 'OpenStreetMap', url: `https://www.openstreetmap.org/${el.type}/${el.id}` },
      logs: [],
    });
  }
  return out;
}
