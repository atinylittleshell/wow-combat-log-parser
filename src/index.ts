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
  private linesNotParsedCount: number = 0;

  public resetParserStates(): void {
    this.lastTimestamp = 0;
    this.state = LogParsingState.NOT_IN_MATCH;

    this.endCurrentCombat();
  }

  public parseLine(line: string): void {
    const logLine = this.parseLogLine(line);

    // skip if it's not a valid line
    if (!logLine) {
      // Record the line even if it can't be parsed if we're in a match
      if (this.state === LogParsingState.IN_MATCH) {
        this.linesNotParsedCount++;
        this.currentLinebuffer.push(line);
      }
      return;
    }

    const timeout =
      logLine.timestamp - this.lastTimestamp >
      WoWCombatLogParser.COMBAT_AUTO_TIMEOUT_SECS * 1000;

    if (timeout) {
      this.endCurrentCombat(undefined, true);
    }

    if (this.state === LogParsingState.NOT_IN_MATCH) {
      if (logLine.event === LogEvent.ARENA_MATCH_START) {
        this.startNewCombat(logLine);
      }
    } else {
      if (logLine.event === LogEvent.ARENA_MATCH_END) {
        this.currentLinebuffer.push(line);
        this.endCurrentCombat(logLine);
      } else if (logLine.event === LogEvent.ARENA_MATCH_START) {
        this.endCurrentCombat();
        this.startNewCombat(logLine);
      } else {
        this.processLogLine(logLine);
      }
    }

    // If we're in a match now, record the line
    if (this.state === LogParsingState.IN_MATCH) {
      this.currentLinebuffer.push(line);
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
    let jsonParameters;

    let buf = '';
    // const onlyNumbers = /^[\-0-9\)\(\.]+$/g;
    for(const p of parameters) {
      if (buf) {
        buf += ',';
      }
      // console.log(`LINE #${p}# ${typeof p}`);
      if (/^[\-0-9\)\(\.\]\[]+$/g.test(p) ) {
        // console.log('ONLY_NUMBERS', `#${p}#`);
        if (/^0+$/g.test(p)) {
          buf += '0';
        } else {
          buf += p;
        }
      } else {
        if (p[0] === '"') {
          // console.log('ALREADY_QUOTED', `#${p}#`);
          buf += p;
        } else {
          let openingMarkers = /^([\(\)\]\[]+)/g;
          let closingMarkers = /([\(\)\]\[]+)$/g;
          let prefix = openingMarkers.exec(p) || '';
          let suffix = closingMarkers.exec(p) || '';

          prefix = prefix ? prefix[0] : '';
          suffix = suffix ? suffix[0] : '';

          let tempP = p.replace(openingMarkers, '');
          tempP = tempP.replace(closingMarkers, '');
          // console.log('MUST_QUOTE', `#${p}#`);
          // console.log(suffix);
          // console.log('MUST_QUOTE', `#${tempP}#`);
          // console.log('MUST_QUOTE', `#${prefix}"${tempP}"${suffix}#`);
          buf += `${prefix}"${tempP}"${suffix}`;
        }
      }
    }
    buf = buf.replace(/\(/g, '[');
    buf = buf.replace(/\)/g, ']');
    // console.log(buf);
    
    jsonParameters = JSON.parse(`{"data":[${buf}]}`);
    // console.log(jsonParameters);
    // try{
    //   // Anything that JSON.parse() might not like
    //   // Examples:
    //   // Player-11-0B0DD774
    //   // 0x0
    //   // nil
    //   const nonJSPrimitives = /(([a-zA-Z]+|0x)[0-9a-zA-Zó\- :!']*)/g;
    //   // Wrap non-primitives in quotes
    //   let parsedString = regex_matches[8].replace(nonJSPrimitives, '\"$1\"');

    //   // If there is some funky string that's all zeros .parse will fail
    //   // ... collapse them to a single zero
    //   const longZeros = /(^|,)0{2,}/g;
    //   parsedString = parsedString.replace(longZeros, '$10');

    //   // If an already quoted string ended up doubly quoted, fix that
    //   const doubleQuotes = /\"\"/g;
    //   parsedString = parsedString.replace(doubleQuotes, '"');
    //   // Convert all lists to [] instead of mixed (),[]
    //   parsedString = parsedString.replace(/\(/g, '[');
    //   parsedString = parsedString.replace(/\)/g, ']');
    //   jsonParameters = JSON.parse(`{"data":[${parsedString}]}`);
    // }

    return {
      id: (WoWCombatLogParser.nextId++).toFixed(),
      timestamp,
      event,
      parameters,
      jsonParameters
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
      linesNotParsedCount: this.linesNotParsedCount,
    };
    this.emit("arena_match_started", plainCombatDataObject);
    this.currentCombat.readLogLine(logLine);
  }

  private endCurrentCombat(logLine?: ILogLine, wasTimeout?: boolean): void {
    if (this.currentCombat) {
      if (logLine) {
        this.currentCombat.readLogLine(logLine);
      }
      this.currentCombat.end(
        [
          parseInt(logLine ? logLine.parameters[2] : "0"), // team0 rating
          parseInt(logLine ? logLine.parameters[3] : "0"), // team1 rating
        ],
        wasTimeout
      );
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
        linesNotParsedCount: this.linesNotParsedCount,
        startInfo: this.currentCombat.startInfo,
        endInfo: this.currentCombat.endInfo,
      };
      this.emit("arena_match_ended", plainCombatDataObject);
      this.currentCombat = null;
      this.currentLinebuffer = [];
      this.linesNotParsedCount = 0;
    }
    this.state = LogParsingState.NOT_IN_MATCH;
  }
}
