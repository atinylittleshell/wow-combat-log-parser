import { CombatUnitClass } from "./types";

export const parseQuotedName = (quotedName: string): string => {
  return quotedName.replace(/"/g, "");
};

export const getClassColor = (unitClass: CombatUnitClass): string => {
  switch (unitClass) {
    default:
      return "#607D8B";
    case CombatUnitClass.DeathKnight:
      return "#C41F3B";
    case CombatUnitClass.DemonHunter:
      return "#A330C9";
    case CombatUnitClass.Druid:
      return "#FF7D0A";
    case CombatUnitClass.Hunter:
      return "#A9D271";
    case CombatUnitClass.Mage:
      return "#40C7EB";
    case CombatUnitClass.Monk:
      return "#00FF96";
    case CombatUnitClass.Paladin:
      return "#F58CBA";
    case CombatUnitClass.Priest:
      return "#FFFFFF";
    case CombatUnitClass.Rogue:
      return "#FFF569";
    case CombatUnitClass.Shaman:
      return "#0070DE";
    case CombatUnitClass.Warlock:
      return "#8787ED";
    case CombatUnitClass.Warrior:
      return "#C79C6E";
  }
};
