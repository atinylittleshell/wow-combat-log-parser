import { ILogLine, WowVersion } from "../types";
import { parseQuotedName } from "../utils";
import { CombatAction } from "./CombatAction";

export class CombatAbsorbAction extends CombatAction {
  public static supports(logLine: ILogLine): boolean {
    return super.supports(logLine) && logLine.event.endsWith("_ABSORBED");
  }

  public readonly absorbedAmount: number;

  public readonly shieldOwnerUnitName: string;
  public readonly shieldOwnerUnitId: string;
  public readonly shieldOwnerUnitFlags: number;

  public readonly shieldSpellId: string;
  public readonly shieldSpellName: string;
  public readonly shieldSpellSchool: string;
  public readonly critical: boolean | null;

  constructor(logLine: ILogLine, wowVersion: WowVersion) {
    super(logLine);
    if (!CombatAbsorbAction.supports(logLine)) {
      throw new Error("event not supported");
    }

    // 8/20 22:11:20.529 SPELL_ABSORBED,
    //                0                     1              2       3
    // ATTACKER: Player-1084-09FC4747,"Acèdin-TarrenMill",0x10548,0x0,
    //                 4                  5               6   7
    // DEFENDER: Player-570-09AB722E, "Wuzzle-Azshara",0x511,0x0,
    //                  8            9           10
    // ATTACK SPELL: 184575,"Blade of Justice",0x1,
    //                    11                12             13   14
    // SHIELD OWNER: Player-570-09AB722E,"Wuzzle-Azshara",0x511,0x0,
    //                   15      16         17  18  19   20
    // SHIELD SPELL: 324867, "Fleshcraft",0x20,1830,3329,nil
    // spell id, spell name, spell school, absorbed amount, base incoming damage, crit flag

    // TBC
    // 5/21 16:34:31.398  SPELL_ABSORBED,
    //   0                        1               2    3
    // Player-4395-01C5EEA8,"Assinoth-Whitemane",0x511,0x0,
    //  4                       5                  6      7
    // Player-4700-01A0750A,"Darshath-Kirtonos",0x10548,0x0,
    //   8     9       10
    // 11269,"Ambush",0x1,
    //        11                   12               13   14
    // Player-4700-01A0750A,"Darshath-Kirtonos",0x10548,0x0,
    //  15    16                 17   18    19
    // 10901,"Power Word: Shield",0x2,1424,1518

    // 5/24 11:56:30.749  SPELL_ABSORBED,
    // Pet-0-4390-572-19853-17252-01004BFD4E,"Jhuuthun",0x1112,0x0,
    // Player-4731-01DFE217,"Synthesizer-Earthfury",0x10548,0x0,
    // Player-4726-0135B902,"Aetarius-Sulfuras",0x548,0x0,
    // 10901,"Power Word: Shield",0x2,163,215

    // 5/24 11:56:34.833  SPELL_ABSORBED,
    // Player-4395-01C5EEA8,"Assinoth-Whitemane",0x511,0x0,
    // Player-4731-01DFE217,"Synthesizer-Earthfury",0x10548,0x0,
    // 17348,"Hemorrhage",0x1,
    // Player-4731-01DFE217,"Synthesizer-Earthfury",0x10548,0x0,10193,"Mana Shield",0x40,348,432

    this.shieldOwnerUnitId = logLine.parameters[11].toString();
    this.shieldOwnerUnitName = parseQuotedName(logLine.parameters[12]);
    this.shieldOwnerUnitFlags = logLine.parameters[13];

    this.shieldSpellId = logLine.parameters[15].toString();
    this.shieldSpellName = parseQuotedName(logLine.parameters[16]);
    this.shieldSpellSchool = logLine.parameters[17].toString();

    this.absorbedAmount = logLine.parameters[18];
    if (wowVersion === "shadowlands") {
      this.critical = logLine.parameters[20] === "1";
    } else {
      this.critical = null;
    }
  }
}
