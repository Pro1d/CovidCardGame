import path from "path";
import express from "express";
import socketIO from "socket.io";
import { Lib } from "lance-gg";
import CovidGameEngine from "./common/CovidGameEngine";
import CovidServerEngine from "./server/CovidServerEngine";

let BASE_PATH = process.env.BASE_PATH || "/";
if (BASE_PATH[0] !== "/") {
  BASE_PATH = "/" + BASE_PATH;
}
if (BASE_PATH[BASE_PATH.length - 1] !== "/") {
  BASE_PATH = BASE_PATH + "/";
}

const PORT = process.env.PORT || 2999;
const INDEX = path.join(__dirname, "../dist/index.html");

// define routes and socket
const server = express();
server.get(BASE_PATH, (req, res) => {
  res.sendFile(INDEX);
});
server.use(BASE_PATH, express.static(path.join(__dirname, "../dist/")));
let requestHandler = server.listen(PORT, () => console.info(`Listening on ${PORT}`));
const io = socketIO(requestHandler, { path: `${BASE_PATH}socket.io` });

// Game Instances
const gameEngine = new CovidGameEngine({ traceLevel: Lib.Trace.TRACE_NONE });
const serverEngine = new CovidServerEngine(io, gameEngine, {
  debug: {},
  /* updateRate: 6,*/ timeoutInterval: 0,
});

// start the game
serverEngine.start();
