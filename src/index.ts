import EventEmitter from "eventemitter3";
import moment from "moment";
import { CombatData, ICombatData } from "./CombatData";
import { ILogLine, LogEvent } from "./types";

export { ICombatData } from "./CombatData";
export { ICombatUnit } from "./CombatUnit";
export * from "./types";
export * from "./utils";
export * from "./actions/CombatAction";
export * from "./actions/CombatHpUpdateAction";
export * from "./classMetadata";

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
  private currentLinebuffer: string[] = [];

  public resetParserStates(): void {
    this.lastTimestamp = 0;
    this.state = LogParsingState.NOT_IN_MATCH;

    this.endCurrentCombat();
  }

  public parseLine(line: string): void {
    const logLine = this.parseLogLine(line);

    // skip if it's not a valid line
    if (!logLine) {
      // Record the line even if it can't be parsed
      this.currentLinebuffer.push(line);
      return;
    }

    const timeout =
      logLine.timestamp - this.lastTimestamp >
      WoWCombatLogParser.COMBAT_AUTO_TIMEOUT_SECS * 1000;

    if (timeout) {
      this.endCurrentCombat();
    }

    // If we're on match start we must wait until new combat to record the raw line
    if (logLine.event !== LogEvent.ARENA_MATCH_START) {
      this.currentLinebuffer.push(line);
    }

    if (this.state === LogParsingState.NOT_IN_MATCH) {
      if (logLine.event === LogEvent.ARENA_MATCH_START) {
        this.startNewCombat(logLine);
        this.currentLinebuffer.push(line);
      }
    } else {
      if (logLine.event === LogEvent.ARENA_MATCH_END) {
        this.endCurrentCombat(logLine);
      } else if (logLine.event === LogEvent.ARENA_MATCH_START) {
        this.endCurrentCombat();
        this.startNewCombat(logLine);
        this.currentLinebuffer.push(line);
      } else {
        this.processLogLine(logLine);
      }
    }

    this.lastTimestamp = logLine.timestamp;
  }

  private parseLogLine(line: string): ILogLine | null {
    const regex_matches = line.match(WoWCombatLogParser.LINE_PARSER);

    // not a valid line
    if (!regex_matches || regex_matches.length === 0) {
      return null;
    }

    const month = parseInt(regex_matches[1], 10);
    const day = parseInt(regex_matches[2], 10);
    const hour = parseInt(regex_matches[3], 10);
    const minute = parseInt(regex_matches[4], 10);
    const second = parseInt(regex_matches[5], 10);
    const ms = parseInt(regex_matches[6], 10);

    const eventName = regex_matches[7];

    // unsupported event
    if (!(eventName in LogEvent)) {
      return null;
    }
    const event = LogEvent[eventName as keyof typeof LogEvent];

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

    const parameters = regex_matches[8].split(",");

    return {
      id: (WoWCombatLogParser.nextId++).toFixed(),
      timestamp,
      event,
      parameters,
    };
  }

  private processLogLine(logLine: ILogLine): void {
    if (!this.currentCombat) {
      return;
    }

    this.currentCombat.readLogLine(logLine);
  }

  private startNewCombat(logLine: ILogLine): void {
    this.currentCombat = new CombatData();
    this.currentCombat.startTime = logLine.timestamp || 0;
    this.currentCombat.playerTeamId = parseInt(logLine.parameters[3]);
    this.state = LogParsingState.IN_MATCH;

    const plainCombatDataObject: ICombatData = {
      id: this.currentCombat.id,
      isWellFormed: this.currentCombat.isWellFormed,
      startTime: this.currentCombat.startTime,
      endTime: this.currentCombat.endTime,
      units: this.currentCombat.units,
      playerTeamId: this.currentCombat.playerTeamId,
      playerTeamRating: this.currentCombat.playerTeamRating,
      result: this.currentCombat.result,
      hasAdvancedLogging: this.currentCombat.hasAdvancedLogging,
      rawLines: this.currentLinebuffer,
    };
    this.emit("arena_match_started", plainCombatDataObject);
  }

  private endCurrentCombat(logLine?: ILogLine): void {
    if (this.currentCombat) {
      this.currentCombat.end([
        parseInt(logLine ? logLine.parameters[2] : "0"), // team0 rating
        parseInt(logLine ? logLine.parameters[3] : "0"), // team1 rating
      ]);
      const plainCombatDataObject: ICombatData = {
        id: this.currentCombat.id,
        isWellFormed: this.currentCombat.isWellFormed,
        startTime: this.currentCombat.startTime,
        endTime: this.currentCombat.endTime,
        units: this.currentCombat.units,
        playerTeamId: this.currentCombat.playerTeamId,
        playerTeamRating: this.currentCombat.playerTeamRating,
        result: this.currentCombat.result,
        hasAdvancedLogging: this.currentCombat.hasAdvancedLogging,
        rawLines: this.currentLinebuffer,
      };
      this.emit("arena_match_ended", plainCombatDataObject);
      this.currentCombat = null;
      this.currentLinebuffer = [];
    }
    this.state = LogParsingState.NOT_IN_MATCH;
  }
}
