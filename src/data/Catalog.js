import * as utils from "../common/utils";

export default class Catalog {
  static getResourceByModelId(modelId) {
    let r = -1;
    for (let res of Catalog.resources)
      if (res.id_offset <= modelId)
        r++;
    return Catalog.resources[r];
  }

  static getResourceByName(name) {
    for (let res of Catalog.resources)
      if (res.name === name)
        return res;
    return null;
  }
}

function init() {
  // statically load catalog description
  Object.assign(Catalog, require("../../src/data/catalog.json"));

  // sort resources by ascending id_offset
  let count = 0;
  Catalog.resources.forEach((r) => {
    // build prefix
    r.prefix = r.name + "-";
    // compute offset of the ids of the group
    r.id_offset = count;
    count += r.count;
  });

  // Expand ids
  for (let g of Object.keys(Catalog.games)) {
    let ids = [];
    for (let name of Object.keys(Catalog.games[g].ids)) {
      let list = Catalog.games[g].ids[name];
      let res = Catalog.getResourceByName(name);
      if (res === null) {
        console.warn(`Unknown resource "${name}"`);
        continue;
      }
      for (let id of list) {
        const range_count = (""+id).split("x");
        const count = (range_count.length === 2 ? parseInt(range_count[1]) : 1);
        const range = range_count[0].split("-").map((x) => parseInt(x));
        const begin = range[0];
        const end = range[range.length - 1];
        for (let id = begin; id <= end; id++) {
          if (id < 0 || id >= res.count) {
            console.warn(`Invalid id ${id} in resource "${name}"`);
            continue;
          }
          for (let c = 0; c < count; c++)
            ids.push(id + res.id_offset);
        }
      }
    }
    Catalog.games[g].ids = ids;
  }
}

init();

Catalog.SUFFIX = ".png";
Catalog.UNKNOWN_SUFFIX = "unknown.png";
Catalog.BACK_SUFFIX = "back.png";
Catalog.UNKNOWN_BACK_SUFFIX = "unknown_back.png";

// Covid Letter
Catalog.getResourceByName("covid").descriptions = require("../../src/data/covid-letter-desc.json");
Catalog.games["covid-letter"].html = require("../../src/data/covid-letter-html.json").join("\n");

