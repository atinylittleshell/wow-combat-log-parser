import { ILogLine } from "../types";
import { parseQuotedName } from "../utils";

export class CombatAction {
  public static supports(logLine: ILogLine): boolean {
    return (
      logLine.event.startsWith("SWING_") ||
      logLine.event.startsWith("RANGE_") ||
      logLine.event.startsWith("SPELL_")
    );
  }

  public readonly timestamp: number;
  public readonly srcUnitName: string;
  public readonly srcUnitId: string;
  public readonly destUnitName: string;
  public readonly destUnitId: string;
  public readonly spellId: string | null;
  public readonly spellName: string | null;

  constructor(public readonly logLine: ILogLine) {
    if (!CombatAction.supports(logLine)) {
      throw new Error("event not supported");
    }

    this.timestamp = logLine.timestamp;

    this.srcUnitId = logLine.parameters[0];
    this.srcUnitName = parseQuotedName(logLine.parameters[1]);

    this.destUnitId = logLine.parameters[4];
    this.destUnitName = parseQuotedName(logLine.parameters[5]);

    if (
      logLine.event.startsWith("RANGE_") ||
      logLine.event.startsWith("SPELL_")
    ) {
      this.spellId = logLine.parameters[8];
      this.spellName = parseQuotedName(logLine.parameters[9]);
    } else {
      this.spellId = null;
      this.spellName = null;
    }
  }
}
