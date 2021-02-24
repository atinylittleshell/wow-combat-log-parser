import { ILogLine } from "../types";
import { CombatAdvancedAction } from "./CombatAdvancedAction";

export class CombatHpUpdateAction extends CombatAdvancedAction {
  public static supports(logLine: ILogLine): boolean {
    return (
      super.supports(logLine) &&
      (logLine.event.endsWith("_DAMAGE") || logLine.event.endsWith("_HEAL"))
    );
  }

  public readonly amount: number;

  constructor(logLine: ILogLine) {
    super(logLine);
    if (!CombatHpUpdateAction.supports(logLine)) {
      throw new Error("event not supported");
    }

    if (logLine.event === "SWING_DAMAGE") {
      this.amount = -1 * logLine.parameters[25];
    } else if (logLine.event.endsWith("_DAMAGE")) {
      this.amount = -1 * logLine.parameters[28];
    } else {
      this.amount = logLine.parameters[28];
    }
  }
}
