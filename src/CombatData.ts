/* eslint-disable no-fallthrough */
import _ from "lodash";
import { uniqueId } from "lodash";
import {
  ArenaMatchStart,
  ArenaMatchStartInfo,
} from "./actions/ArenaMatchStart";
import { ArenaMatchEnd, ArenaMatchEndInfo } from "./actions/ArenaMatchEnd";
import { CombatantInfoAction } from "./actions/CombatantInfoAction";
import { CombatAdvancedAction } from "./actions/CombatAdvancedAction";
import { CombatHpUpdateAction } from "./actions/CombatHpUpdateAction";
import { CombatUnit, ICombatUnit } from "./CombatUnit";
import {
  CombatResult,
  CombatUnitClass,
  CombatUnitReaction,
  CombatUnitSpec,
  CombatUnitType,
  ICombatantMetadata,
  LogEvent,
} from "./types";
import { CombatEvent } from "./pipeline/logLineToCombatEvent";

export interface ICombatData {
  id: string;
  isWellFormed: true;
  startTime: number;
  endTime: number;
  units: { [unitId: string]: ICombatUnit };
  playerTeamId: string;
  playerTeamRating: number;
  result: CombatResult;
  hasAdvancedLogging: boolean;
  rawLines: string[];
  linesNotParsedCount: number;
  startInfo: ArenaMatchStartInfo;
  endInfo: ArenaMatchEndInfo;
}

export interface IMalformedCombatData {
  id: string;
  isWellFormed: false;
  startTime: number;
  rawLines: string[];
  linesNotParsedCount: number;
}

export class CombatData {
  public endInfo: ArenaMatchEndInfo | undefined = undefined;
  public startInfo: ArenaMatchStartInfo | undefined = undefined;
  public id: string = uniqueId("combat");
  public isWellFormed = false;
  public startTime = 0;
  public endTime = 0;
  public units: { [unitId: string]: CombatUnit } = {};
  public playerTeamId = "";
  public playerTeamRating = 0;
  public result: CombatResult = CombatResult.Unknown;
  public hasAdvancedLogging = false;
  public rawLines: string[] = [];
  public linesNotParsedCount = 0;

  private combatantMetadata: Map<string, ICombatantMetadata> = new Map<
    string,
    ICombatantMetadata
  >();

  public readEvent(event: CombatEvent) {
    if (this.startTime === 0) {
      this.startTime = event.timestamp;
    }
    this.endTime = event.timestamp;

    if (event instanceof ArenaMatchStart) {
      this.startInfo = {
        timestamp: event.timestamp,
        zoneId: event.zoneId,
        item1: event.item1,
        bracket: event.bracket,
        isRanked: event.isRanked,
      };
      return;
    }
    if (event instanceof ArenaMatchEnd) {
      this.endInfo = {
        timestamp: event.timestamp,
        winningTeamId: event.winningTeamId,
        matchDurationInSeconds: event.matchDurationInSeconds,
        team0MMR: event.team0MMR,
        team1MMR: event.team1MMR,
      };
      return;
    }

    if (event.logLine.parameters.length < 8) {
      return;
    }

    if (event instanceof CombatantInfoAction) {
      const unitId: string = event.logLine.parameters[0].toString();
      const specId: string = event.info.specId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((<any>Object).values(CombatUnitSpec).indexOf(specId) >= 0) {
        const spec = specId as CombatUnitSpec;
        let unitClass = CombatUnitClass.None;
        switch (spec) {
          case CombatUnitSpec.DeathKnight_Blood:
          case CombatUnitSpec.DeathKnight_Frost:
          case CombatUnitSpec.DeathKnight_Unholy:
            unitClass = CombatUnitClass.DeathKnight;
            break;
          case CombatUnitSpec.DemonHunter_Havoc:
          case CombatUnitSpec.DemonHunter_Vengeance:
            unitClass = CombatUnitClass.DemonHunter;
            break;
          case CombatUnitSpec.Druid_Balance:
          case CombatUnitSpec.Druid_Feral:
          case CombatUnitSpec.Druid_Guardian:
          case CombatUnitSpec.Druid_Restoration:
            unitClass = CombatUnitClass.Druid;
            break;
          case CombatUnitSpec.Hunter_BeastMastery:
          case CombatUnitSpec.Hunter_Marksmanship:
          case CombatUnitSpec.Hunter_Survival:
            unitClass = CombatUnitClass.Hunter;
            break;
          case CombatUnitSpec.Mage_Arcane:
          case CombatUnitSpec.Mage_Fire:
          case CombatUnitSpec.Mage_Frost:
            unitClass = CombatUnitClass.Mage;
            break;
          case CombatUnitSpec.Monk_BrewMaster:
          case CombatUnitSpec.Monk_Windwalker:
          case CombatUnitSpec.Monk_Mistweaver:
            unitClass = CombatUnitClass.Monk;
            break;
          case CombatUnitSpec.Paladin_Holy:
          case CombatUnitSpec.Paladin_Protection:
          case CombatUnitSpec.Paladin_Retribution:
            unitClass = CombatUnitClass.Paladin;
            break;
          case CombatUnitSpec.Priest_Discipline:
          case CombatUnitSpec.Priest_Holy:
          case CombatUnitSpec.Priest_Shadow:
            unitClass = CombatUnitClass.Priest;
            break;
          case CombatUnitSpec.Rogue_Assassination:
          case CombatUnitSpec.Rogue_Outlaw:
          case CombatUnitSpec.Rogue_Subtlety:
            unitClass = CombatUnitClass.Rogue;
            break;
          case CombatUnitSpec.Shaman_Elemental:
          case CombatUnitSpec.Shaman_Enhancement:
          case CombatUnitSpec.Shaman_Restoration:
            unitClass = CombatUnitClass.Shaman;
            break;
          case CombatUnitSpec.Warlock_Affliction:
          case CombatUnitSpec.Warlock_Demonology:
          case CombatUnitSpec.Warlock_Destruction:
            unitClass = CombatUnitClass.Warlock;
            break;
          case CombatUnitSpec.Warrior_Arms:
          case CombatUnitSpec.Warrior_Fury:
          case CombatUnitSpec.Warrior_Protection:
            unitClass = CombatUnitClass.Warrior;
            break;
        }
        this.registerCombatant(unitId, {
          spec,
          class: unitClass,
          info: event.info,
        });
      }
      return;
    }

    const srcGUID = event.srcUnitId;
    const srcName = event.srcUnitName;
    const srcFlag = event.srcUnitFlags;

    const destGUID = event.destUnitId;
    const destName = event.destUnitName;
    const destFlag = event.destUnitFlags;

    if (!this.units[srcGUID]) {
      this.units[srcGUID] = new CombatUnit(srcGUID, srcName);
    }
    if (!this.units[destGUID]) {
      this.units[destGUID] = new CombatUnit(destGUID, destName);
    }

    const srcUnit = this.units[srcGUID];
    const destUnit = this.units[destGUID];
    if (!srcUnit || !destUnit) {
      throw new Error(
        "failed to parse source unit or dest unit from the log line"
      );
    }
    srcUnit.endTime = event.timestamp;
    destUnit.endTime = event.timestamp;

    srcUnit.proveType(this.getUnitType(srcFlag));
    destUnit.proveType(this.getUnitType(destFlag));

    srcUnit.proveReaction(this.getUnitReaction(srcFlag));
    destUnit.proveReaction(this.getUnitReaction(destFlag));

    switch (event.logLine.event) {
      case LogEvent.SWING_DAMAGE:
      case LogEvent.RANGE_DAMAGE:
      case LogEvent.SPELL_DAMAGE:
      case LogEvent.SPELL_PERIODIC_DAMAGE:
        {
          const damageAction = event as CombatHpUpdateAction;
          if (srcGUID !== destGUID) {
            srcUnit.damageOut.push(damageAction);
          }
          destUnit.damageIn.push(damageAction);
          if (damageAction.advanced) {
            const advancedActor = this.units[damageAction.advancedActorId];
            advancedActor?.advancedActions.push(damageAction);
            this.hasAdvancedLogging = true;

            if (damageAction.advancedOwnerId !== "0000000000000000") {
              advancedActor.proveOwner(damageAction.advancedOwnerId);
            }
          }
        }
        break;
      case LogEvent.SPELL_HEAL:
      case LogEvent.SPELL_PERIODIC_HEAL:
        {
          const healAction = event as CombatHpUpdateAction;
          srcUnit.healOut.push(healAction);
          destUnit.healIn.push(healAction);
          if (healAction.advanced) {
            const advancedActor = this.units[healAction.advancedActorId];
            advancedActor?.advancedActions.push(healAction);
            this.hasAdvancedLogging = true;

            if (healAction.advancedOwnerId !== "0000000000000000") {
              advancedActor.proveOwner(healAction.advancedOwnerId);
            }
          }
        }
        break;
      case LogEvent.SPELL_AURA_APPLIED:
      case LogEvent.SPELL_AURA_APPLIED_DOSE:
      case LogEvent.SPELL_AURA_REFRESH:
      case LogEvent.SPELL_AURA_REMOVED:
      case LogEvent.SPELL_AURA_REMOVED_DOSE:
      case LogEvent.SPELL_AURA_BROKEN:
      case LogEvent.SPELL_AURA_BROKEN_SPELL:
        {
          destUnit.auraEvents.push(event);
        }
        break;
      case LogEvent.SPELL_INTERRUPT:
      case LogEvent.SPELL_STOLEN:
      case LogEvent.SPELL_DISPEL:
      case LogEvent.SPELL_DISPEL_FAILED:
      case LogEvent.SPELL_EXTRA_ATTACKS:
        srcUnit.actionOut.push(event.logLine);
        destUnit.actionIn.push(event.logLine);
        break;
      case LogEvent.UNIT_DIED:
        if (
          event.logLine.parameters.length > 8 &&
          event.logLine.parameters[event.logLine.parameters.length - 1] === 1
        ) {
          destUnit.consciousDeathRecords.push(event.logLine);
        } else {
          destUnit.deathRecords.push(event.logLine);
        }
        break;
      case LogEvent.SPELL_CAST_SUCCESS:
        {
          const advancedAction = event as CombatAdvancedAction;
          if (advancedAction.advanced) {
            const advancedActor = this.units[advancedAction.advancedActorId];
            advancedActor?.advancedActions.push(advancedAction);
            this.hasAdvancedLogging = true;
          }
          srcUnit.spellCastEvents.push(advancedAction);
        }
        break;
      case LogEvent.SPELL_CAST_START:
      case LogEvent.SPELL_CAST_FAILED:
        {
          srcUnit.spellCastEvents.push(event);
        }
        break;
      case LogEvent.SPELL_SUMMON:
        {
          srcUnit.actionOut.push(event.logLine);
          destUnit.proveOwner(srcUnit.id);
        }
        break;
    }
  }

  public registerCombatant(id: string, combatantMetadata: ICombatantMetadata) {
    this.combatantMetadata.set(id, combatantMetadata);
  }

  public end(wasTimeout?: boolean) {
    _.forEach(this.units, unit => {
      unit.endActivity();
      if (this.combatantMetadata.has(unit.id)) {
        const metadata = this.combatantMetadata.get(unit.id);
        if (metadata) {
          unit.info = metadata?.info;
        }
        unit.proveClass(metadata?.class || CombatUnitClass.None);
        unit.proveSpec(metadata?.spec || CombatUnitSpec.None);
      }
      unit.end();
    });

    // merge pet output activities into their owners
    _.forEach(this.units, unit => {
      if (unit.type !== CombatUnitType.Player && unit.ownerId.length) {
        const owner = this.units[unit.ownerId];
        if (!owner) {
          return;
        }

        owner.damageOut = owner.damageOut
          .concat(unit.damageOut)
          .sort((a, b) => a.timestamp - b.timestamp);

        owner.healOut = owner.healOut
          .concat(unit.healOut)
          .sort((a, b) => a.timestamp - b.timestamp);

        owner.actionOut = owner.actionOut
          .concat(unit.actionOut)
          .sort((a, b) => a.timestamp - b.timestamp);
      }
    });

    // units are finalized, check playerTeam info
    _.forEach(this.units, unit => {
      const metadata = this.combatantMetadata.get(unit.id);
      if (metadata) {
        if (unit.reaction === CombatUnitReaction.Friendly) {
          this.playerTeamId = metadata.info.teamId;
        }
      }
    });

    // a valid arena combat should have at least two friendly units and two hostile units
    const playerUnits = Array.from(_.values(this.units)).filter(
      unit => unit.type === CombatUnitType.Player
    );
    const deadPlayerCount = playerUnits.filter(p => p.deathRecords.length > 0)
      .length;

    if (this.playerTeamId) {
      this.playerTeamRating =
        this.playerTeamId === "0"
          ? this.endInfo?.team0MMR || 0
          : this.endInfo?.team1MMR || 0;
    }

    if (this.endInfo) {
      if (this.endInfo.winningTeamId === this.playerTeamId) {
        this.result = CombatResult.Win;
      } else {
        this.result = CombatResult.Lose;
      }
    } else {
      this.result = CombatResult.Unknown;
    }

    if (
      playerUnits.length === this.combatantMetadata.size &&
      deadPlayerCount > 0 &&
      !wasTimeout &&
      this.startInfo &&
      this.endInfo &&
      deadPlayerCount < this.combatantMetadata.size &&
      (this.result === CombatResult.Win || this.result === CombatResult.Lose)
    ) {
      this.isWellFormed = true;
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
