import * as _ from "lodash";

export default class Catalog {
  static getResourceByModelId(modelId) {
    let r = -1;
    for (let res of Catalog.resources) if (res.idOffset <= modelId) r++;
    return Catalog.resources[r];
  }

  static getResourceByName(name) {
    for (let res of Catalog.resources) if (res.name === name) return res;
    return null;
  }

  static expandIds(ids, playersCount) {
    const exp = [];
    for (let id of ids) {
      const count = id.count.base + playersCount * id.count.byPlayer;
      _.range(count).forEach(() => exp.push(id.id));
    }
    return exp;
  }
}

// ("p", "2p+4+1p+5") -> {base: 3, byPlayer: 9}
function parseExpr(varName, expr) {
  const coeff = { base: 0, byPlayer: 0 };
  for (let elt of expr.split("+")) {
    if (elt.endsWith(varName)) coeff.byPlayer += parseInt(elt);
    else coeff.base += parseInt(elt);
  }
  return coeff;
}

function parseIds(str, game, res) {
  const rangeAndCount = str.split("x");
  const count =
    rangeAndCount.length === 2 ? parseExpr("p", rangeAndCount[1]) : { base: 1, byPlayer: 0 };
  const range = rangeAndCount[0].split("-").map((x) => parseInt(x));
  const begin = range[0];
  const end = range[range.length - 1];
  let dependsOnPlayersCount = false;

  const ids = [];
  for (let id = begin; id <= end; id++) {
    if (id < 0 || id >= res.count) {
      console.warn(`In game ${game}, invalid id ${id} for resource "${res.name}"`);
      continue;
    }
    ids.push({ id: id + res.idOffset, count: count });
    if (count.byPlayer > 0) dependsOnPlayersCount = true;
  }
  return { ids: ids, dependsOnPlayersCount: dependsOnPlayersCount };
}

function init() {
  // statically load catalog description
  Object.assign(Catalog, require("../../src/data/catalog.json"));

  // sort resources by ascending idOffset
  let count = 0;
  Catalog.resources.forEach((r) => {
    // build prefix
    r.prefix = r.name + "-";
    // compute offset of the ids of the group
    r.idOffset = count;
    count += r.count;
  });

  // Expand ids
  for (let g of Object.keys(Catalog.games)) {
    let ids = [];
    let dependsOnPlayersCount = false;
    for (let name of Object.keys(Catalog.games[g].ids)) {
      let list = Catalog.games[g].ids[name];
      let res = Catalog.getResourceByName(name);
      if (res === null) {
        console.warn(`In game ${g}, unknown resource "${name}"`);
        continue;
      }
      for (let id of list) {
        const idExpr = parseIds(String(id), g, res);
        ids = ids.concat(idExpr.ids);
        if (idExpr.dependsOnPlayersCount) dependsOnPlayersCount = true;
      }
    }
    Catalog.games[g].ids = ids;
    Catalog.games[g].dependsOnPlayersCount = dependsOnPlayersCount;
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

// Star Sprint
Catalog.games["star-sprint"].html = require("../../src/data/star-sprint-html.json").join("\n");
