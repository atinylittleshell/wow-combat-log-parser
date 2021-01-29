import _ from "lodash";
import { CombatAdvancedAction } from "./actions/CombatAdvancedAction";
import { CombatHpUpdateAction } from "./actions/CombatHpUpdateAction";
import {
  CombatUnitClass,
  CombatUnitReaction,
  CombatUnitSpec,
  CombatUnitType,
  ILogLine,
} from "./types";

export class CombatUnit {
  public reaction: CombatUnitReaction = CombatUnitReaction.Neutral;
  public type: CombatUnitType = CombatUnitType.None;
  public class: CombatUnitClass = CombatUnitClass.None;
  public spec: CombatUnitSpec = CombatUnitSpec.None;

  public id: string = "";
  public name: string = "";
  public isWellFormed: boolean = false;
  public isActive: boolean = false;

  public damageIn: CombatHpUpdateAction[] = [];
  public damageOut: CombatHpUpdateAction[] = [];
  public healIn: CombatHpUpdateAction[] = [];
  public healOut: CombatHpUpdateAction[] = [];
  public actionIn: ILogLine[] = [];
  public actionOut: ILogLine[] = [];
  public deathRecords: ILogLine[] = [];
  public advancedActions: CombatAdvancedAction[] = [];

  public startTime: number = 0;
  public endTime: number = 0;
  private reactionProofs: Map<CombatUnitReaction, number> = new Map<
    CombatUnitReaction,
    number
  >();
  private typeProofs: Map<CombatUnitType, number> = new Map<
    CombatUnitType,
    number
  >();

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  public proveClass(unitClass: CombatUnitClass) {
    this.class = unitClass;
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

    if (
      this.class !== CombatUnitClass.None &&
      this.spec !== CombatUnitSpec.None &&
      this.type !== CombatUnitType.None &&
      this.reaction !== CombatUnitReaction.Neutral &&
      this.isActive
    ) {
      this.isWellFormed = true;
    }
  }
}
