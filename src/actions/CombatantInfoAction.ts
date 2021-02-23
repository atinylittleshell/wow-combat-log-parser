import { ILogLine, CombatantInfo, EquippedItem, CovenantInfo } from "../types";

function parseCovenantInfo(val: any[]): CovenantInfo {
  return {
    soulbindId: val[0],
    covenantId: val[1],
    conduitIdsJSON: JSON.stringify(val[4]),
    item2: val[2],
    item3JSON: JSON.stringify(val[3]),
  };
}

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
    const jsData = logLine.jsonParameters["data"];

    this.info = {
      teamId: parseInt(jsData[1]),
      strength: parseInt(jsData[2]),
      agility: parseInt(jsData[3]),
      stamina: parseInt(logLine.parameters[4]),
      intelligence: parseInt(jsData[5]),
      dodge: parseInt(jsData[6]),
      parry: parseInt(jsData[7]),
      block: parseInt(jsData[8]),
      critMelee: parseInt(jsData[9]),
      critRanged: parseInt(jsData[10]),
      critSpell: parseInt(jsData[11]),
      speed: parseInt(jsData[12]),
      lifesteal: parseInt(jsData[13]),
      hasteMelee: parseInt(jsData[14]),
      hasteRanged: parseInt(jsData[15]),
      hasteSpell: parseInt(jsData[16]),
      avoidance: parseInt(jsData[17]),
      mastery: parseInt(jsData[18]),
      versatilityDamgeDone: parseInt(jsData[19]),
      versatilityHealingDone: parseInt(jsData[20]),
      versatilityDamageTaken: parseInt(jsData[21]),
      armor: parseInt(jsData[22]),
      specId: parseInt(jsData[23]),
      talents: jsData[24],
      pvpTalents: jsData[25],
      covenantInfo: parseCovenantInfo(jsData[26]),
      equipment: parseEquippedItems(jsData[27]),
      interestingAurasJSON: JSON.stringify(jsData[28]),
      item29: parseInt(jsData[29]),
      item30: parseInt(jsData[30]),
      personalRating: parseInt(jsData[31]),
      highestPvpTier: parseInt(jsData[32]),
    };
  }
}
