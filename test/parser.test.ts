import path from "path";
import lineReader from "line-reader";
import {
  ICombatData,
  CombatResult,
  CombatUnitSpec,
  WoWCombatLogParser,
  CombatUnitPowerType,
} from "../src";

const parseLogFileAsync = (logFileName: string): Promise<ICombatData[]> => {
  return new Promise(resolve => {
    const logParser = new WoWCombatLogParser();
    const results: ICombatData[] = [];

    logParser.on("arena_match_ended", data => {
      const combat = data as ICombatData;
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
    let combats: ICombatData[] = [];
    beforeAll(async () => {
      combats = await parseLogFileAsync("no_arena.txt");
    });

    it("should not return any Combat objects", async () => {
      expect(combats).toHaveLength(0);
    });
  });

  describe("parsing a short match", () => {
    let combats: ICombatData[] = [];
    beforeAll(async () => {
      combats = await parseLogFileAsync("short_match.txt");
    });

    it("should return a single match", () => {
      expect(combats).toHaveLength(1);
    });

    it("should buffer the raw log", () => {
      expect(combats[0].rawLines.length).toEqual(12);
    });

    it("should count the lines it cant parse", () => {
      expect(combats[0].linesNotParsedCount).toEqual(1);
    });

    it("should have correct combatant metadata", () => {
      const combat = combats[0];
      const combatant = combat.units["Player-57-0CE7FCBF"];
      expect(combatant.spec).toEqual(CombatUnitSpec.Warrior_Arms);
      expect(combatant.info?.specId).toEqual(CombatUnitSpec.Warrior_Arms);
      expect(combatant.info?.equipment[10].bonuses[2]).toEqual(1492);
      expect(combatant.info?.teamId).toEqual(0);
      expect(combatant.info?.highestPvpTier).toEqual(2);
      expect(combatant.info?.covenantInfo.conduitIdsJSON).toEqual(
        "[[169,184],[8,145]]"
      );
      expect(combatant.info?.covenantInfo.item3JSON).toEqual(
        "[[1393],[1395],[1406],[1397]]"
      );
    });

    it("should parse arena start event", () => {
      const combat = combats[0];
      expect(combat.startInfo?.timestamp).toBeGreaterThan(5000);
      expect(combat.startInfo?.zoneId).toEqual("1552");
      expect(combat.startInfo?.item1).toEqual("30");
      expect(combat.startInfo?.bracket).toEqual("2v2");
      expect(combat.startInfo?.isRanked).toEqual(true);
    });

    it("should parse arena end event", () => {
      const combat = combats[0];
      expect(combat.endInfo?.timestamp).toBeGreaterThan(5000);
      expect(combat.endInfo?.matchDurationInSeconds).toEqual(465);
      expect(combat.endInfo?.winningTeamId).toEqual("1");
      expect(combat.endInfo?.team0MMR).toEqual(1440);
      expect(combat.endInfo?.team1MMR).toEqual(1437);
    });

    it("should have a correct death record", () => {
      const combat = combats[0];
      expect(combat.units["Player-57-0CE7FCBF"]?.deathRecords).toHaveLength(1);
    });

    it("should be counted as a lost match", () => {
      const combat = combats[0];
      expect(combat.result).toEqual(CombatResult.Lose);
    });

    it("should have advanced logs parsed correctly", () => {
      const combat = combats[0];
      expect(combat.units["Player-57-0CE7FCBF"]?.advancedActions).toHaveLength(
        1
      );
    });
  });

  describe("parsing a malformed log file that has double start bug", () => {
    let combats: ICombatData[] = [];
    beforeAll(async () => {
      combats = await parseLogFileAsync("double_start.txt");
    });

    it("should return two matches", () => {
      expect(combats).toHaveLength(2);
    });

    it("should buffer the raw log [0]", () => {
      expect(combats[0].rawLines.length).toEqual(7);
    });

    it("should buffer the raw log [1]", () => {
      expect(combats[1].rawLines.length).toEqual(10);
    });

    it("should mark the first match as malformed", () => {
      expect(combats[0].isWellFormed).toBeFalsy();
    });
  });

  describe("parsing a real log file without advanced combat logging", () => {
    let combats: ICombatData[] = [];
    beforeAll(async () => {
      combats = await parseLogFileAsync("real_match_no_advanced.txt");
    });

    it("should return a single match", () => {
      expect(combats).toHaveLength(1);
    });

    it("should buffer the raw log", () => {
      expect(combats[0].rawLines.length).toEqual(2074);
    });

    it("should not mark the combat as having advanced logging", () => {
      expect(combats[0].hasAdvancedLogging).toBeFalsy();
    });

    it("should count the lines it cant parse", () => {
      expect(combats[0].linesNotParsedCount).toEqual(98);
    });

    it("should have aura events", () => {
      expect(
        combats[0].units["Player-57-0CE7FCBF"]?.auraEvents || []
      ).not.toHaveLength(0);
    });

    it("should have spell cast events", () => {
      expect(
        combats[0].units["Player-57-0CE7FCBF"]?.spellCastEvents || []
      ).not.toHaveLength(0);
    });
  });

  describe("parsing a log with two matches", () => {
    let combats: ICombatData[] = [];
    beforeAll(async () => {
      combats = await parseLogFileAsync("two_short_matches.txt");
    });

    it("should return a single match", () => {
      expect(combats).toHaveLength(2);
    });

    it("should buffer the raw logs", () => {
      expect(combats[0].rawLines.length).toEqual(11);
      expect(combats[1].rawLines.length).toEqual(9);
    });

    it("should count the lines it cant parse", () => {
      expect(combats[0].linesNotParsedCount).toEqual(1);
      expect(combats[1].linesNotParsedCount).toEqual(0);
    });

    it("should parse arena start events", () => {
      expect(combats[0].startInfo?.zoneId).toEqual("1552");
      expect(combats[0].startInfo?.item1).toEqual("30");
      expect(combats[0].startInfo?.bracket).toEqual("2v2");
      expect(combats[0].startInfo?.isRanked).toEqual(true);

      expect(combats[1].startInfo?.zoneId).toEqual("1551");
      expect(combats[1].startInfo?.item1).toEqual("30");
      expect(combats[1].startInfo?.bracket).toEqual("3v3");
      expect(combats[1].startInfo?.isRanked).toEqual(false);
    });

    it("should parse arena end events", () => {
      expect(combats[0].endInfo?.winningTeamId).toEqual("1");
      expect(combats[0].endInfo?.matchDurationInSeconds).toEqual(465);
      expect(combats[0].endInfo?.team0MMR).toEqual(1440);
      expect(combats[0].endInfo?.team1MMR).toEqual(1437);

      expect(combats[1].endInfo?.winningTeamId).toEqual("0");
      expect(combats[1].endInfo?.matchDurationInSeconds).toEqual(465);
      expect(combats[1].endInfo?.team0MMR).toEqual(1333);
      expect(combats[1].endInfo?.team1MMR).toEqual(1437);
    });
  });

  describe("parsing a log with no end will time out", () => {
    let combats: ICombatData[] = [];
    beforeAll(async () => {
      combats = await parseLogFileAsync("match_without_end.txt");
    });

    it("should return a single match", () => {
      expect(combats).toHaveLength(1);
    });

    it("should buffer the raw logs", () => {
      expect(combats[0].rawLines.length).toEqual(10);
    });

    it("should count the lines it cant parse", () => {
      expect(combats[0].linesNotParsedCount).toEqual(1);
    });

    it("should mark the match as malformed", () => {
      expect(combats[0].isWellFormed).toBeFalsy();
    });
  });

  describe("parsing a log with advanced logging", () => {
    let combats: ICombatData[] = [];
    beforeAll(async () => {
      combats = await parseLogFileAsync("skirmish_with_advanced_logging.txt");
    });

    it("should return a single match", () => {
      expect(combats).toHaveLength(1);
    });

    it("should have correct mana data", () => {
      expect(
        combats[0].units["Player-57-0A628E42"].advancedActions[0]
          .advancedActorPowers
      ).toHaveLength(1);

      expect(
        combats[0].units["Player-57-0A628E42"].advancedActions[0]
          .advancedActorPowers[0].type
      ).toEqual(CombatUnitPowerType.Mana);

      expect(
        combats[0].units["Player-57-0A628E42"].advancedActions[0]
          .advancedActorPowers[0].max
      ).toEqual(42565);
    });
  });
});
