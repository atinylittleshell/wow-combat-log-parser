import { ILogLine, CombatantInfo, EquippedItem, CovenantInfo } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCovenantInfo(val: any[]): CovenantInfo {
  return {
    soulbindId: val[0],
    covenantId: val[1],
    conduitIdsJSON: JSON.stringify(val[4]),
    item2: val[2],
    item3JSON: JSON.stringify(val[3]),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEquippedItems(val: any[]): EquippedItem[] {
  return val.map(eqi => ({
    id: eqi[0],
    ilvl: eqi[1],
    enchants: eqi[2],
    bonuses: eqi[3],
    gems: eqi[4],
  }));
}

export class CombatantInfoAction {
  public static supports(logLine: ILogLine): boolean {
    return logLine.event.startsWith("COMBATANT_INFO");
  }

  public readonly timestamp: number;
  public readonly info: CombatantInfo;

  constructor(public readonly logLine: ILogLine) {
    if (!CombatantInfoAction.supports(logLine)) {
      throw new Error("event not supported");
    }

    this.timestamp = logLine.timestamp;

    this.info = {
      teamId: logLine.parameters[1],
      strength: logLine.parameters[2],
      agility: logLine.parameters[3],
      stamina: logLine.parameters[4],
      intelligence: logLine.parameters[5],
      dodge: logLine.parameters[6],
      parry: logLine.parameters[7],
      block: logLine.parameters[8],
      critMelee: logLine.parameters[9],
      critRanged: logLine.parameters[10],
      critSpell: logLine.parameters[11],
      speed: logLine.parameters[12],
      lifesteal: logLine.parameters[13],
      hasteMelee: logLine.parameters[14],
      hasteRanged: logLine.parameters[15],
      hasteSpell: logLine.parameters[16],
      avoidance: logLine.parameters[17],
      mastery: logLine.parameters[18],
      versatilityDamgeDone: logLine.parameters[19],
      versatilityHealingDone: logLine.parameters[20],
      versatilityDamageTaken: logLine.parameters[21],
      armor: logLine.parameters[22],
      specId: logLine.parameters[23],
      talents: logLine.parameters[24],
      pvpTalents: logLine.parameters[25],
      covenantInfo: parseCovenantInfo(logLine.parameters[26]),
      equipment: parseEquippedItems(logLine.parameters[27]),
      interestingAurasJSON: JSON.stringify(logLine.parameters[28]),
      item29: logLine.parameters[29],
      item30: logLine.parameters[30],
      personalRating: logLine.parameters[31],
      highestPvpTier: logLine.parameters[32],
    };
  }
}
