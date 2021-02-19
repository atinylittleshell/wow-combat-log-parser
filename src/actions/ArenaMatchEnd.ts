import { ILogLine } from "../types";

export class ArenaMatchEnd {
  public static supports(logLine: ILogLine): boolean {
    return (
      logLine.event.startsWith("ARENA_MATCH_END")
    );
  }

  public readonly timestamp: number;
  public readonly winningTeamId: string;
  public readonly matchDurationInSeconds: number;
  public readonly team0MMR: number;
  public readonly team1MMR: number;

  constructor(public readonly logLine: ILogLine) {
    if (!ArenaMatchEnd.supports(logLine)) {
      throw new Error("event not supported");
    }

    this.timestamp = logLine.timestamp;

    this.winningTeamId = logLine.parameters[0];
    this.matchDurationInSeconds = parseInt(logLine.parameters[1]);
    this.team0MMR = parseInt(logLine.parameters[2]);
    this.team1MMR = parseInt(logLine.parameters[3]);
  }
}
