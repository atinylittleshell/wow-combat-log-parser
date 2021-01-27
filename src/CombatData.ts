/* eslint-disable no-fallthrough */
import { uniqueId } from "lodash";
import { CombatHpUpdateAction } from "./CombatHpUpdateAction";
import { CombatUnit } from "./CombatUnit";
import {
  CombatResult,
  CombatUnitClass,
  CombatUnitReaction,
  CombatUnitSpec,
  CombatUnitType,
  ICombatantMetadata,
  ILogLine,
  LogEvent,
} from "./types";
import { parseQuotedName } from "./utils";

export class CombatData {
  public id: string = uniqueId("combat");
  public isWellFormed: boolean = false;
  public startTime: number = 0;
  public endTime: number = 0;
  public units: Map<string, CombatUnit> = new Map<string, CombatUnit>();
  public playerTeamId: number = -1;
  public playerTeamRating: number = 0;
  public result: CombatResult = CombatResult.Unknown;

  private lastDeathReaction: CombatUnitReaction = CombatUnitReaction.Neutral;
  private combatantMetadata: Map<string, ICombatantMetadata> = new Map<
    string,
    ICombatantMetadata
  >();

  public readLogLine(logLine: ILogLine) {
    if (logLine.parameters.length < 8) {
      return;
    }

    if (this.startTime === 0) {
      this.startTime = logLine.timestamp;
    }
    this.endTime = logLine.timestamp;

    const event = logLine.event;

    const srcGUID = logLine.parameters[0];
    const srcName = parseQuotedName(logLine.parameters[1]);
    // tslint:disable-next-line: radix
    const srcFlag = parseInt(logLine.parameters[2]);

    const destGUID = logLine.parameters[4];
    const destName = parseQuotedName(logLine.parameters[5]);
    // tslint:disable-next-line: radix
    const destFlag = parseInt(logLine.parameters[6]);

    if (!this.units.has(srcGUID)) {
      this.units.set(srcGUID, new CombatUnit(srcGUID, srcName));
    }
    if (!this.units.has(destGUID)) {
      this.units.set(destGUID, new CombatUnit(destGUID, destName));
    }

    const srcUnit = this.units.get(srcGUID);
    const destUnit = this.units.get(destGUID);
    if (!srcUnit || !destUnit) {
      throw new Error(
        "failed to parse source unit or dest unit from the log line"
      );
    }
    srcUnit.endTime = logLine.timestamp;
    destUnit.endTime = logLine.timestamp;

    srcUnit.proveType(this.getUnitType(srcFlag));
    destUnit.proveType(this.getUnitType(destFlag));

    srcUnit.proveReaction(this.getUnitReaction(srcFlag));
    destUnit.proveReaction(this.getUnitReaction(destFlag));

    if (
      event === LogEvent.UNIT_DIED &&
      this.getUnitType(destFlag) === CombatUnitType.Player &&
      this.getUnitReaction(destFlag) !== CombatUnitReaction.Neutral
    ) {
      this.lastDeathReaction = this.getUnitReaction(destFlag);
    }

    switch (event) {
      case LogEvent.SWING_DAMAGE:
      // case LogEvent.SWING_MISSED:
      case LogEvent.RANGE_DAMAGE:
      // case LogEvent.RANGE_MISSED:
      case LogEvent.SPELL_DAMAGE:
      // case LogEvent.SPELL_MISSED:
      case LogEvent.SPELL_PERIODIC_DAMAGE:
        // case LogEvent.SPELL_PERIODIC_MISSED:
        // case LogEvent.DAMAGE_SHIELD:
        // case LogEvent.DAMAGE_SHIELD_MISSED:
        // case LogEvent.DAMAGE_SPLIT:
        // case LogEvent.ENVIRONMENTAL_DAMAGE:
        // case LogEvent.SPELL_DRAIN:
        // case LogEvent.SPELL_LEECH:
        // case LogEvent.SPELL_PERIODIC_DRAIN:
        // case LogEvent.SPELL_PERIODIC_LEECH:
        const damageAction = new CombatHpUpdateAction(logLine);
        if (srcGUID !== destGUID) {
          srcUnit.damageOut.push(damageAction);
        }
        destUnit.damageIn.push(damageAction);
        break;
      case LogEvent.SPELL_HEAL:
      case LogEvent.SPELL_PERIODIC_HEAL:
        const healAction = new CombatHpUpdateAction(logLine);
        srcUnit.healOut.push(healAction);
        destUnit.healIn.push(healAction);
        break;
      case LogEvent.SPELL_AURA_APPLIED:
      case LogEvent.SPELL_AURA_APPLIED_DOSE:
      case LogEvent.SPELL_AURA_REFRESH:
        srcUnit.actionOut.push(logLine);
        destUnit.actionIn.push(logLine);
        break;
      case LogEvent.SPELL_AURA_REMOVED:
      case LogEvent.SPELL_AURA_REMOVED_DOSE:
        destUnit.actionIn.push(logLine);
        break;
      case LogEvent.SPELL_INTERRUPT:
      case LogEvent.SPELL_STOLEN:
      case LogEvent.SPELL_DISPEL:
      case LogEvent.SPELL_DISPEL_FAILED:
      case LogEvent.SPELL_EXTRA_ATTACKS:
      case LogEvent.SPELL_AURA_BROKEN:
      case LogEvent.SPELL_AURA_BROKEN_SPELL:
        srcUnit.actionOut.push(logLine);
        destUnit.actionIn.push(logLine);
        break;
      case LogEvent.UNIT_DIED:
        destUnit.deathRecords.push(logLine);
        break;
      case LogEvent.SPELL_PERIODIC_ENERGIZE:
      case LogEvent.SPELL_ENERGIZE:
        destUnit.actionIn.push(logLine);
        break;
    }
  }

  public registerCombatant(id: string, combatantMetadata: ICombatantMetadata) {
    this.combatantMetadata.set(id, combatantMetadata);
  }

  public end(teamRatings: number[]) {
    this.units.forEach(unit => {
      unit.endActivity();
    });
    this.units.forEach(unit => {
      if (this.combatantMetadata.has(unit.id)) {
        const metadata = this.combatantMetadata.get(unit.id);
        unit.proveClass(metadata?.class || CombatUnitClass.None);
        unit.proveSpec(metadata?.spec || CombatUnitSpec.None);
      }
      unit.end();
    });

    // a valid arena combat should have at least two friendly units and two hostile units
    if (
      Array.from(this.units.values()).filter(
        unit => unit.reaction === CombatUnitReaction.Friendly
      ).length >= 2 &&
      Array.from(this.units.values()).filter(
        unit => unit.reaction === CombatUnitReaction.Hostile
      ).length >= 2
    ) {
      this.isWellFormed = true;
    }

    if (this.playerTeamId >= 0) {
      this.playerTeamRating =
        this.playerTeamId < teamRatings.length
          ? teamRatings[this.playerTeamId]
          : 0;
    }

    if (this.lastDeathReaction === CombatUnitReaction.Neutral) {
      this.result = CombatResult.DrawGame;
    } else if (this.lastDeathReaction === CombatUnitReaction.Friendly) {
      this.result = CombatResult.Lose;
    } else if (this.lastDeathReaction === CombatUnitReaction.Hostile) {
      this.result = CombatResult.Win;
    }
  }

  private getUnitType(flag: number): CombatUnitType {
    // tslint:disable-next-line: no-bitwise
    const masked = flag & 0x0000fc00;
    switch (masked) {
      case 0x00001000:
        return CombatUnitType.Pet;
      case 0x00000400:
        return CombatUnitType.Player;
      default:
        return CombatUnitType.None;
    }
  }

  private getUnitReaction(flag: number): CombatUnitReaction {
    // tslint:disable-next-line: no-bitwise
    const masked = flag & 0x000000f0;
    switch (masked) {
      case 0x00000040:
        return CombatUnitReaction.Hostile;
      case 0x00000010:
        return CombatUnitReaction.Friendly;
      default:
        return CombatUnitReaction.Neutral;
    }
  }
}
