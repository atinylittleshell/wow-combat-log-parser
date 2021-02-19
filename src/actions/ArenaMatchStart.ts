import { ILogLine } from "../types";

export class ArenaMatchStart {
  public static supports(logLine: ILogLine): boolean {
    return logLine.event.startsWith("ARENA_MATCH_START");
  }

  public readonly timestamp: number;
  public readonly zoneId: string;
  public readonly item1: string;
  public readonly bracket: string;
  public readonly isRanked: boolean;

  constructor(public readonly logLine: ILogLine) {
    if (!ArenaMatchStart.supports(logLine)) {
      throw new Error("event not supported");
    }

    this.timestamp = logLine.timestamp;

    this.zoneId = logLine.parameters[0];
    this.item1 = logLine.parameters[1];
    this.bracket = logLine.parameters[2];
    this.isRanked = logLine.parameters[3] === "1";
  }
}
