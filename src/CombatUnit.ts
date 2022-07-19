import _ from "lodash";

import { CombatAbsorbAction } from "./actions/CombatAbsorbAction";
import { CombatAction } from "./actions/CombatAction";
import { CombatAdvancedAction } from "./actions/CombatAdvancedAction";
import { CombatHpUpdateAction } from "./actions/CombatHpUpdateAction";
import {
  CombatUnitClass,
  CombatUnitReaction,
  CombatUnitSpec,
  CombatUnitType,
  CombatantInfo,
  ILogLine,
} from "./types";

export interface ICombatUnit {
  id: string;
  name: string;
  isWellFormed: boolean;
  reaction: CombatUnitReaction;
  type: CombatUnitType;
  class: CombatUnitClass;
  spec: CombatUnitSpec;
  info?: CombatantInfo;

  damageIn: CombatHpUpdateAction[];
  damageOut: CombatHpUpdateAction[];
  healIn: CombatHpUpdateAction[];
  healOut: CombatHpUpdateAction[];

  // absorbsIn counts all absorbs that prevented damage on the ICombatUnit
  absorbsIn: CombatAbsorbAction[];
  // absorbsOut counts shields the ICombatUnit casted
  absorbsOut: CombatAbsorbAction[];
  // absorbsDamaged counts attacks that ICombatUnit casted that hit shields instead of hp
  absorbsDamaged: CombatAbsorbAction[];

  actionIn: ILogLine[];
  actionOut: ILogLine[];
  auraEvents: CombatAction[];
  spellCastEvents: CombatAction[];
  deathRecords: ILogLine[];
  consciousDeathRecords: ILogLine[];
  advancedActions: CombatAdvancedAction[];
}

export class CombatUnit implements ICombatUnit {
  public reaction: CombatUnitReaction = CombatUnitReaction.Neutral;
  public type: CombatUnitType = CombatUnitType.None;
  public class: CombatUnitClass = CombatUnitClass.None;
  public spec: CombatUnitSpec = CombatUnitSpec.None;

  public info: CombatantInfo | undefined = undefined;
  public id = "";
  public ownerId = "";
  public name = "";
  public isWellFormed = false;
  public isActive = false;

  public damageIn: CombatHpUpdateAction[] = [];
  public damageOut: CombatHpUpdateAction[] = [];
  public healIn: CombatHpUpdateAction[] = [];
  public healOut: CombatHpUpdateAction[] = [];
  public absorbsIn: CombatAbsorbAction[] = [];
  public absorbsOut: CombatAbsorbAction[] = [];
  public absorbsDamaged: CombatAbsorbAction[] = [];
  public actionIn: ILogLine[] = [];
  public actionOut: ILogLine[] = [];
  public auraEvents: CombatAction[] = [];
  public spellCastEvents: CombatAction[] = [];
  public deathRecords: ILogLine[] = [];
  public consciousDeathRecords: ILogLine[] = [];
  public advancedActions: CombatAdvancedAction[] = [];

  public startTime = 0;
  public endTime = 0;
  private reactionProofs: Map<CombatUnitReaction, number> = new Map<
    CombatUnitReaction,
    number
  >();
  private typeProofs: Map<CombatUnitType, number> = new Map<
    CombatUnitType,
    number
  >();
  private classProofs: Map<CombatUnitClass, number> = new Map<
    CombatUnitClass,
    number
  >();

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  public proveClass(unitClass: CombatUnitClass) {
    if (!this.classProofs.has(unitClass)) {
      this.classProofs.set(unitClass, 0);
    }

    this.classProofs.set(unitClass, (this.classProofs.get(unitClass) || 0) + 1);
  }

  public proveSpec(spec: CombatUnitSpec) {
    this.spec = spec;
  }

  public proveReaction(reaction: CombatUnitReaction) {
    if (!this.reactionProofs.has(reaction)) {
      this.reactionProofs.set(reaction, 0);
    }

    this.reactionProofs.set(
      reaction,
      (this.reactionProofs.get(reaction) || 0) + 1
    );
  }

  public proveOwner(ownerId: string) {
    if (
      ownerId.length &&
      ownerId !== "0000000000000000" &&
      !this.ownerId.length
    ) {
      this.ownerId = ownerId;
    }
  }

  public proveType(type: CombatUnitType) {
    if (!this.typeProofs.has(type)) {
      this.typeProofs.set(type, 0);
    }

    this.typeProofs.set(type, (this.typeProofs.get(type) || 0) + 1);
  }

  public endActivity() {
    if (
      this.damageIn.length +
        this.damageOut.length +
        this.healIn.length +
        this.healOut.length +
        this.actionIn.length +
        this.actionOut.length >
        6 &&
      this.endTime - this.startTime > 2000
    ) {
      this.isActive = true;
    }
  }

  public end() {
    if (this.typeProofs.size > 0) {
      const proofs: [CombatUnitType, number][] = [];
      this.typeProofs.forEach((value, key) => {
        proofs.push([key, value]);
      });
      const sorted = _.sortBy(proofs, proof => -proof[1]);
      this.type = sorted[0][0];
    }

    if (this.reactionProofs.size > 0) {
      const proofs: [CombatUnitReaction, number][] = [];
      this.reactionProofs.forEach((value, key) => {
        proofs.push([key, value]);
      });
      const sorted = _.sortBy(proofs, proof => -proof[1]);
      this.reaction = sorted[0][0];
    }

    if (this.classProofs.size > 0) {
      const proofs: [CombatUnitClass, number][] = [];
      this.classProofs.forEach((value, key) => {
        proofs.push([key, value]);
      });
      const sorted = _.sortBy(proofs, proof => -proof[1]);
      this.class = sorted[0][0];
    }

    if (
      this.class !== CombatUnitClass.None &&
      this.type !== CombatUnitType.None &&
      this.reaction !== CombatUnitReaction.Neutral &&
      this.isActive
    ) {
      this.isWellFormed = true;
    }
  }
}
