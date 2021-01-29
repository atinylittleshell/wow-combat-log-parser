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

    this.advanced = logLine.parameters[11] !== "0000000000000000";
    this.advancedActorId = logLine.parameters[11];
    this.advancedActorCurrentHp = parseInt(logLine.parameters[13], 10);
    this.advancedActorMaxHp = parseInt(logLine.parameters[14], 10);
    this.advancedActorPositionX = parseInt(logLine.parameters[23], 10);
    this.advancedActorPositionY = parseInt(logLine.parameters[24], 10);
  }
}
