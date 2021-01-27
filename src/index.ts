import EventEmitter from "eventemitter3";
import moment from "moment";
import { CombatData } from "./CombatData";
import { CombatUnitClass, CombatUnitSpec, ILogLine, LogEvent } from "./types";

export * from "./CombatData";
export * from "./types";
export * from "./utils";
export * from "./CombatUnit";
export * from "./CombatAction";
export * from "./CombatHpUpdateAction";

enum LogParsingState {
  NOT_IN_MATCH,
  IN_MATCH,
}

export class WoWCombatLogParser extends EventEmitter {
  private static readonly LINE_PARSER = /^(\d+)\/(\d+)\s+(\d+):(\d+):(\d+).(\d+)\s+([A-Z_]+),(.+)\s*$/;
  private static readonly COMBAT_AUTO_TIMEOUT_SECS = 60;
  private static nextId = 0;

  private lastTimestamp = 0;
  private state: LogParsingState = LogParsingState.NOT_IN_MATCH;
  private currentCombat: CombatData | null = null;

  public resetParserStates(): void {
    this.lastTimestamp = 0;
    this.state = LogParsingState.NOT_IN_MATCH;

    this.endCurrentCombat(["-1", "0", "0", "0"]);
  }

  public parseLine(line: string): void {
    const regex_matches = line.match(WoWCombatLogParser.LINE_PARSER);

    // skip if it's not a valid line
    if (!regex_matches || regex_matches.length === 0) {
      return;
    }

    const month = parseInt(regex_matches[1], 10);
    const day = parseInt(regex_matches[2], 10);
    const hour = parseInt(regex_matches[3], 10);
    const minute = parseInt(regex_matches[4], 10);
    const second = parseInt(regex_matches[5], 10);
    const ms = parseInt(regex_matches[6], 10);

    const event = regex_matches[7];
    const timestampValueObj = {
      ms,
      M: month - 1,
      d: day,
      h: hour,
      m: minute,
      s: second,
    };
    const timestampValue = moment(timestampValueObj);
    const timestamp = timestampValue.valueOf();

    const timeout =
      timestamp - this.lastTimestamp >
      WoWCombatLogParser.COMBAT_AUTO_TIMEOUT_SECS * 1000;

    const params = regex_matches[8].split(",");

    if (timeout || this.state === LogParsingState.NOT_IN_MATCH) {
      if (timeout) {
        this.endCurrentCombat(["-1", "0", "0", "0"]);
      }

      if (event === "ARENA_MATCH_START") {
        this.startNewCombat(timestamp, params);
      }
    } else {
      if (event === "ARENA_MATCH_END") {
        this.endCurrentCombat(params);
      } else {
        this.processCombatLogLine(timestamp, event, params);
      }
    }

    this.lastTimestamp = timestamp;
  }

  private processCombatLogLine(
    timestamp: number,
    eventName: string,
    parameters: string[]
  ): void {
    if (!this.currentCombat) {
      return;
    }

    if (eventName === "COMBATANT_INFO") {
      const unitId = parameters[0];
      const specId = parseInt(parameters[23], 10);
      if (specId in CombatUnitSpec) {
        const spec = specId as CombatUnitSpec;
        let unitClass = CombatUnitClass.None;
        switch (spec) {
          case CombatUnitSpec.DeathKnight_Blood:
          case CombatUnitSpec.DeathKnight_Frost:
          case CombatUnitSpec.DeathKnight_Unholy:
            unitClass = CombatUnitClass.DeathKnight;
            break;
          case CombatUnitSpec.DemonHunter_Havoc:
          case CombatUnitSpec.DemonHunter_Vengeance:
            unitClass = CombatUnitClass.DemonHunter;
            break;
          case CombatUnitSpec.Druid_Balance:
          case CombatUnitSpec.Druid_Feral:
          case CombatUnitSpec.Druid_Guardian:
          case CombatUnitSpec.Druid_Restoration:
            unitClass = CombatUnitClass.Druid;
            break;
          case CombatUnitSpec.Hunter_BeastMastery:
          case CombatUnitSpec.Hunter_Marksmanship:
          case CombatUnitSpec.Hunter_Survival:
            unitClass = CombatUnitClass.Hunter;
            break;
          case CombatUnitSpec.Mage_Arcane:
          case CombatUnitSpec.Mage_Fire:
          case CombatUnitSpec.Mage_Frost:
            unitClass = CombatUnitClass.Mage;
            break;
          case CombatUnitSpec.Monk_BrewMaster:
          case CombatUnitSpec.Monk_Windwalker:
          case CombatUnitSpec.Monk_Mistweaver:
            unitClass = CombatUnitClass.Monk;
            break;
          case CombatUnitSpec.Paladin_Holy:
          case CombatUnitSpec.Paladin_Protection:
          case CombatUnitSpec.Paladin_Retribution:
            unitClass = CombatUnitClass.Paladin;
            break;
          case CombatUnitSpec.Priest_Discipline:
          case CombatUnitSpec.Priest_Holy:
          case CombatUnitSpec.Priest_Shadow:
            unitClass = CombatUnitClass.Priest;
            break;
          case CombatUnitSpec.Rogue_Assassination:
          case CombatUnitSpec.Rogue_Outlaw:
          case CombatUnitSpec.Rogue_Subtlety:
            unitClass = CombatUnitClass.Rogue;
            break;
          case CombatUnitSpec.Shaman_Elemental:
          case CombatUnitSpec.Shaman_Enhancement:
          case CombatUnitSpec.Shaman_Restoration:
            unitClass = CombatUnitClass.Shaman;
            break;
          case CombatUnitSpec.Warlock_Affliction:
          case CombatUnitSpec.Warlock_Demonology:
          case CombatUnitSpec.Warlock_Destruction:
            unitClass = CombatUnitClass.Warlock;
            break;
          case CombatUnitSpec.Warrior_Arms:
          case CombatUnitSpec.Warrior_Fury:
          case CombatUnitSpec.Warrior_Protection:
            unitClass = CombatUnitClass.Warrior;
            break;
        }
        this.currentCombat.registerCombatant(unitId, {
          spec,
          class: unitClass,
        });
      }
      return;
    }

    if (!(eventName in LogEvent)) {
      return;
    }

    const event = LogEvent[eventName as keyof typeof LogEvent];

    const logLine: ILogLine = {
      id: (WoWCombatLogParser.nextId++).toFixed(),
      timestamp,
      event,
      parameters,
    };

    this.currentCombat.readLogLine(logLine);
    this.emit("arena_match_updated", this.currentCombat);
  }

  private startNewCombat(timestamp: number, params: string[]): void {
    this.currentCombat = new CombatData();
    this.currentCombat.startTime = timestamp || 0;
    this.currentCombat.playerTeamId = parseInt(params[3]);
    this.state = LogParsingState.IN_MATCH;
    this.emit("arena_match_started", this.currentCombat);
  }

  private endCurrentCombat(params: string[]): void {
    if (this.currentCombat) {
      this.currentCombat.end([parseInt(params[2]), parseInt(params[3])]);
      this.emit("arena_match_ended", this.currentCombat);
      this.currentCombat = null;
    }
    this.state = LogParsingState.NOT_IN_MATCH;
  }
}
