import { CombatAction } from "./CombatAction";
import { CombatUnitPowerType, ILogLine } from "../types";
import _ from "lodash";

export interface ICombatUnitPower {
  type: CombatUnitPowerType;
  current: number;
  max: number;
}

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
  public readonly advancedActorPowers: ICombatUnitPower[];
  public readonly advancedActorPositionX: number;
  public readonly advancedActorPositionY: number;
  public readonly advanced: boolean;

  constructor(logLine: ILogLine) {
    super(logLine);
    if (!CombatAdvancedAction.supports(logLine)) {
      throw new Error("event not supported");
    }

    const advancedLoggingOffset = logLine.event.startsWith("SWING_") ? 8 : 11;

    this.advanced = logLine.parameters[advancedLoggingOffset] != 0;
    this.advancedActorId = logLine.parameters[advancedLoggingOffset];
    this.advancedActorCurrentHp = logLine.parameters[advancedLoggingOffset + 2];
    this.advancedActorMaxHp = logLine.parameters[advancedLoggingOffset + 3];

    const powerType = logLine.parameters[advancedLoggingOffset + 8]
      .toString()
      .split("|")
      .map((v: string) => parseInt(v));
    const currentPower = logLine.parameters[advancedLoggingOffset + 9]
      .toString()
      .split("|")
      .map((v: string) => parseInt(v));
    const maxPower = logLine.parameters[advancedLoggingOffset + 10]
      .toString()
      .split("|")
      .map((v: string) => parseInt(v));
    this.advancedActorPowers = _.range(0, powerType.length).map(i => ({
      type: powerType[i],
      current: currentPower[i],
      max: maxPower[i],
    }));

    this.advancedActorPositionX =
      logLine.parameters[advancedLoggingOffset + 12];
    this.advancedActorPositionY =
      logLine.parameters[advancedLoggingOffset + 13];
  }
}
