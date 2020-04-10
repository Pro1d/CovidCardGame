import * as utils from '../common/utils';

export default class Catalog {

  static getResourceByModelId(modelId) {
    let r = -1;
    for (let res of Catalog.resources)
      if (res.id_offset <= modelId)
        r++;
    return Catalog.resources[r];
  }

  static getResourceByPrefix(prefix) {
    for (let res of Catalog.resources)
      if (res.prefix === prefix)
        return res;
    return null;
  }
}

function init() {
  console.log('Init Catalog');

  // statically load catalog description
  Object.assign(Catalog, require('../../src/data/catalog.json'));

  // sort resources by ascending id_offset
  Catalog.resources.sort((a, b) => a.id_offset - b.id_offset);

  // Expand ids
  for (let g of Object.keys(Catalog.games)) {
    let ids = [];
    for (let id of Catalog.games[g].ids) {
      const range_count = (""+id).split('x');
      const count = (range_count.length === 2 ? parseInt(range_count[1]) : 1);
      const range = range_count[0].split('-').map(x => parseInt(x));
      const begin = range[0];
      const end = range[range.length - 1];
      for (let id = begin; id <= end; id++)
        for (let c = 0; c < count; c++)
          ids.push(id);
    }
    Catalog.games[g].ids = ids;
  }
}

init();

// Covid Letter
Catalog.getResourceByPrefix("covid").descriptions = require('../../src/data/covid-letter-desc.json');
Catalog.games["covid-letter"].html = require('../../src/data/covid-letter-html.json').join('\n');

