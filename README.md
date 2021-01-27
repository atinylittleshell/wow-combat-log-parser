This is a parser library for World of Warcraft combat logs, written in typescript and can be used as a Node.js package.

## Installation

```bash
yarn add wow-combat-log-parser
```

or

```bash
npm install --save wow-combat-log-parser
```

Type definitions are already included in the package, so no need to install @types/wow-combat-log-parser separately.

## Usage

```javascript
import { CombatData, WoWCombatLogParser } from "wow-combat-log-parser";

const logParser = new WoWCombatLogParser();

logParser.on("arena_match_started", (data) => {
  const combat = data as CombatData;
  // do something with the combat object
});

logParser.on("arena_match_ended", (data) => {
  const combat = data as CombatData;
  // do something with the combat object
});

// populate the lines array by reading from the wow combat log file
const lines = [];

lines.forEach((line) => {
  // this can trigger the arena_match_started and arena_match_ended events
  parser.parseLine(line);
});

// clean up
logParser.removeAllListeners();
```

## Contributing

Contributions are welcome! Please feel free to open an issue on GitHub or submit a pull request.
