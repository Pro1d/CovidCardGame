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

  // Expand an array of idsDesc to an array of integer ids
  static expandIds(ids, playersCount) {
    const exp = [];
    for (let idsDesc of ids) {
      const res = Catalog.getResourceByName(idsDesc.res);
      const count = idsDesc.count.base + playersCount * idsDesc.count.byPlayer;

      if (idsDesc.ids.expr) {
        let id = idsDesc.ids.expr.base;
        if (idsDesc.ids.expr.byPlayer === 0) {
          // Single ID
          if (id < res.count)
            _.range(count).forEach(() => {
              exp.push(id + res.idOffset);
            });
          else console.warn(`Invalid id ${id} for resource "${res.name}"`);
        } else {
          // One ID per player
          for (let p = 0; p < playersCount; p++, id += idsDesc.ids.expr.byPlayer) {
            if (id < res.count)
              _.range(count).forEach(() => {
                exp.push(id + res.idOffset);
              });
            else console.warn(`Invalid id ${id} for resource "${res.name}"`);
          }
        }
      } else {
        // Range of ID
        let { begin, end } = idsDesc.ids.range;
        if (end < begin) [begin, end] = [end, begin];
        for (let id = begin; id <= end; id++) {
          if (id < res.count)
            _.range(count).forEach(() => {
              exp.push(id + res.idOffset);
            });
          else console.warn(`Invalid id ${id} for resource "${res.name}"`);
        }
      }
    }
    return exp;
  }
}

// ("2p+4+p+5") -> {base: 9, byPlayer: 3}
function parseExpr(expr) {
  const coeff = { base: 0, byPlayer: 0 };
  for (let elt of expr.split("+")) {
    const n = parseInt(elt);
    if (elt.endsWith("p")) coeff.byPlayer += isNaN(n) ? 1 : n;
    else coeff.base += isNaN(n) ? 1 : n;
  }
  return coeff;
}

// parseExpr or ("42-69") -> {begin: 42, end: 69}
function parseIds(ids) {
  if (ids.includes("-")) {
    const range = ids.split("-");
    return { range: { begin: parseInt(range[0]), end: parseInt(range[1]) } };
  } else {
    return { expr: parseExpr(ids) };
  }
}

// idsDesc : ids "x" count
//         | ids
// count   : expr
// ids     : expr
//         | range
// expr    : exprElt
//         | exprElt "+" expr
// exprElt : integer "p"
//         | integer
// range   : integer "-" integer
// integer : \d+
function parseIdsDesc(idsDesc) {
  const idsAndCount = idsDesc.split("x");
  const count = idsAndCount.length > 1 ? parseExpr(idsAndCount[1]) : { base: 1, byPlayer: 0 };
  const ids = parseIds(idsAndCount[0]);
  const dependsOnPlayers = count.byPlayer > 0 || (ids.expr != null && ids.expr.byPlayer > 0);

  return { idsDesc: { ids, count }, dependsOnPlayers };
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
        const idsDesc = parseIdsDesc(String(id));
        ids.push({ ...idsDesc.idsDesc, res: name });
        if (idsDesc.dependsOnPlayers) dependsOnPlayersCount = true;
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

// Five Green
Catalog.getResourceByName("green-five-question").descriptions = require("../../src/data/green-five-question-desc.json");
