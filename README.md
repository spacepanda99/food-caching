# Food Caching

Like geocaching, but for food growing wild: blackberry patches, old apple
trees, herb hedges and more. Pick the foods you care about, see caches near
you on a GPS map, add your own, and log visits ("Ripe now", "Picked over"...).

## Run it

It's a plain static site (HTML + vanilla JS modules, Leaflet + OpenStreetMap).
Serve the folder with any static server, e.g. `npx serve .`, and open it.
GPS needs `https://` or `localhost`.

## Files

- `index.html`, `css/app.css`: page and styles
- `js/foods.js`: the food list, icons and rough ripe seasons
- `js/store.js`: where caches are saved. For now this is the browser's
  localStorage, so caches aren't shared between people yet. Swap this file
  for an online database to make them shared.
- `js/app.js`: map, filters, GPS, add/detail/log views
