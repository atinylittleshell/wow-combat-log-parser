import { CombatAction } from "./CombatAction";
import { ILogLine } from "../types";

export class CombatAdvancedAction extends CombatAction {
  public static supports(logLine: ILogLine): boolean {
    return (
      super.supports(logLine) &&
      (logLine.event === "SPELL_DAMAGE" ||
        logLine.event === "SPELL_PERIODIC_DAMAGE" ||
        logLine.event === "SPELL_HEAL" ||
        logLine.event === "SPELL_PERIODIC_HEAL" ||
        logLine.event === "RANGE_DAMAGE" ||
        logLine.event === "SWING_DAMAGE" ||
        logLine.event === "SPELL_CAST_SUCCESS")
    );
  }

  public readonly advancedActorId: string;
  public readonly advancedActorCurrentHp: number;
  public readonly advancedActorMaxHp: number;
  public readonly advancedActorPositionX: number;
  public readonly advancedActorPositionY: number;
  public readonly advanced: boolean;

  constructor(logLine: ILogLine) {
    super(logLine);
    if (!CombatAdvancedAction.supports(logLine)) {
      throw new Error("event not supported");
    }

    const advancedLoggingOffset = logLine.event.startsWith("SWING_") ? 8 : 11;

    this.advanced =
      logLine.parameters[advancedLoggingOffset] !== "0000000000000000";
    this.advancedActorId = logLine.parameters[advancedLoggingOffset];
    this.advancedActorCurrentHp = parseInt(
      logLine.parameters[advancedLoggingOffset + 2],
      10
    );
    this.advancedActorMaxHp = parseInt(
      logLine.parameters[advancedLoggingOffset + 3],
      10
    );
    this.advancedActorPositionX = parseInt(
      logLine.parameters[advancedLoggingOffset + 12],
      10
    );
    this.advancedActorPositionY = parseInt(
      logLine.parameters[advancedLoggingOffset + 13],
      10
    );
  }
}
