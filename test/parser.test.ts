import path from "path";
import lineReader from "line-reader";
import {
  CombatData,
  CombatResult,
  CombatUnitSpec,
  WoWCombatLogParser,
} from "../src";

const parseLogFileAsync = (logFileName: string): Promise<CombatData[]> => {
  return new Promise(resolve => {
    const logParser = new WoWCombatLogParser();
    const results: CombatData[] = [];

    logParser.on("arena_match_ended", data => {
      const combat = data as CombatData;
      results.push(combat);
    });

    lineReader.eachLine(
      path.join(__dirname, "logs", logFileName),
      (line, last) => {
        logParser.parseLine(line);
        if (last) {
          resolve(results);
          return false;
        }
        return true;
      }
    );
  });
};

describe("parser tests", () => {
  describe("parsing logs outside of arena matches", () => {
    let combats: CombatData[] = [];
    beforeAll(async () => {
      combats = await parseLogFileAsync("no_arena.txt");
    });

    it("should not return any Combat objects", async () => {
      expect(combats).toHaveLength(0);
    });
  });

  describe("parsing a short match", () => {
    let combats: CombatData[] = [];
    beforeAll(async () => {
      combats = await parseLogFileAsync("short_match.txt");
    });

    it("should return a single match", () => {
      expect(combats).toHaveLength(1);
    });

    it("should have correct combatant metadata", () => {
      const combat = combats[0];
      expect(combat.units.get("Player-57-0CE7FCBF")?.spec).toEqual(
        CombatUnitSpec.Warrior_Arms
      );
    });

    it("should have a correct death record", () => {
      const combat = combats[0];
      expect(combat.units.get("Player-57-0CE7FCBF")?.deathRecords).toHaveLength(
        1
      );
    });

    it("should be counted as a lost match", () => {
      const combat = combats[0];
      expect(combat.result).toEqual(CombatResult.Lose);
    });
  });
});

describe("parsing a malformed log file that has double start bug", () => {
  let combats: CombatData[] = [];
  beforeAll(async () => {
    combats = await parseLogFileAsync("double_start.txt");
  });

  it("should return two matches", () => {
    expect(combats).toHaveLength(2);
  });

  it("should mark the first match as malformed", () => {
    expect(combats[0].isWellFormed).toBeFalsy();
  });
});
