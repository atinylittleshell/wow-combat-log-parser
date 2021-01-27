import { CombatAction } from "./CombatAction";
import { ILogLine } from "../types";

export class CombatHpUpdateAction extends CombatAction {
  public static supports(logLine: ILogLine): boolean {
    return (
      super.supports(logLine) &&
      (logLine.event === "SPELL_DAMAGE" ||
        logLine.event === "SPELL_PERIODIC_DAMAGE" ||
        logLine.event === "SPELL_HEAL" ||
        logLine.event === "SPELL_PERIODIC_HEAL" ||
        logLine.event === "RANGE_DAMAGE" ||
        logLine.event === "SWING_DAMAGE")
    );
  }

  public readonly amount: number;

  constructor(logLine: ILogLine) {
    super(logLine);
    if (!CombatHpUpdateAction.supports(logLine)) {
      throw new Error("event not supported");
    }

    if (logLine.event === "SWING_DAMAGE") {
      this.amount = -1 * parseInt(logLine.parameters[25], 10);
    } else if (logLine.event.endsWith("_DAMAGE")) {
      this.amount = -1 * parseInt(logLine.parameters[28], 10);
    } else {
      this.amount = parseInt(logLine.parameters[28], 10);
    }
  }
}
