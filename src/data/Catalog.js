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
}

init();

// Covid Letter
Catalog.getResourceByPrefix("covid").descriptions = require('../../src/data/covid-letter-desc.json');

