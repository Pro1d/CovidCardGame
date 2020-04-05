import querystring from 'query-string';
import { Lib } from 'lance-gg';
import CovidGameEngine from '../common/CovidGameEngine';
import CovidClientEngine from '../client/CovidClientEngine';
const qsOptions = querystring.parse(location.search);

// default options, overwritten by query-string options
// is sent to both game engine and client engine
const defaults = {
    traceLevel: Lib.Trace.TRACE_NONE,
    delayInputCount: 3,
    scheduler: 'fixed', //'render-schedule',
    syncOptions: {
        sync: qsOptions.sync || 'extrapolate',
        remoteObjBending: 1.0,
        localObjBending: 0.8,
    }
};
let options = Object.assign(defaults, qsOptions);


// create a client engine and a game engine
const gameEngine = new CovidGameEngine(options);
const clientEngine = new CovidClientEngine(gameEngine, options);

document.addEventListener('DOMContentLoaded', function(e) { clientEngine.start(); });
