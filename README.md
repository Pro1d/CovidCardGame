Covid Card Table
================

A real-time virtual multiplayer table to play card games online.

Overview
--------

Enjoy playing card games with friends over the Internet!
Handle your cards as you would do in real life!

\<This is an capture of the game\>

Powered by [Lance.gg](http://lance.gg/) and [PixiJS](https://www.pixijs.com/).

Install and Run
---------------

```npm install
```
Then:
```npm start
```
or
```PORT=1337 npm start
```

Open "http://localhost:1337" in your web browser.


How to Add a Card Set
---------------------

 * Choose a unique prefix:
   * example: "classic"
 * Add one or more images that gathers multiple cards in "dist/assets/"
   * examples: "dist/assets/classic1.png", "dist/assets/classic2.png"
   * an image must not exceed 1024x1024 pixels
 * For each image, add a json file that describes the size and the position of the cards, in "dist/assets/"
   * examples: "dist/assets/classic1.json", "dist/assets/classic2.json"
   * a card name is "{prefix}-{id}.png", with id starting from 0, to number of cards - 1
   * there are 3 special card names: "{prefix}-back.png", "{prefix}-unknown.png" and, "{prefix}-unknown\_back.png", for the images of the back side, the front side when the card is hidden and, the back side when the card is hidden (respectively). Only required for cards.
 * Declare your new resource in "src/data/catalog.json"
   * add an entry in the list named "resources"
   * mandatory fields:
```{
     "name": "classic", // prefix
     "files": ["assets/classic1.json", "assets/classic2.json"], // json files created previously
     "type": "card", // or "item"; cards are flippable and orientable, items are not
     "count": 55, // number of cards or items
     "size": {"x": 120, "y": 180}, // size of a card
     "align_step": {"x": 28, "y": 32} // step in pixels when aligning card horizontally (x) or vertically (y)
}```
 * (Optional) add a description for each card, to be displayed as a tooltip on mouse over
   * Add a json file in "src/data/" named "{prefix}-desc.json"
     * a list of strings containinng text/html description
   * Load the description in "src/data/Catalog.js"
     * Append the lines:
     ```code js
     ```

How to Create a Game That Uses a Card Set
-----------------------------------------
 * Declare a game set that includes the new cards in "src/data/catalog.json":
   * add an entry in the object named "games"
   * mandatory
```
"my-game": { // unique game name
  "name": "Game Name", // Human readable game name
  "description": "This is a game description.",
  "ids": {
    "classic": [ // resource name from which to include objects
      0,      // add 1 copy of the object with id=0;       pattern: {id} or "{id}"
      "0x4",  // add 4 copy of the object with id=0;       pattern: "{id}x{count}"
      "1-3",  // add 1 copy of the objects with id=1,2,3;  pattern: "{first_id}-{last_id}"
      "1-3x4" // add 4 copy of the objects with id=1,2,3;  pattern: "{first_id}-{last_id}x{count}"
    ],
    "token": [ // you may include objects from an other resource
      "3x5", "7x5", 12
    ]
  ]
}
```

 * Currently, you must hard-code the game-set to load in "src/common/CovidGameEngine.js"
   * In the constructor, set the "game" member value: `game: "my-game"`
