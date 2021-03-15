import EventEmitter from "eventemitter3";
import { createParserPipeline } from "./pipeline/createParserPipeline";
export { ICombatData, IMalformedCombatData } from "./CombatData";
export { ICombatUnit } from "./CombatUnit";
export * from "./types";
export * from "./utils";
export * from "./actions/CombatAction";
export * from "./actions/ArenaMatchEnd";
export * from "./actions/ArenaMatchStart";
export * from "./actions/CombatHpUpdateAction";
export * from "./actions/CombatExtraSpellAction";
export * from "./classMetadata";
export * from "./covenantMetadata";
export * from "./pipeline/stringToLogLine";
export * from "./pipeline/logLineToCombatEvent";

export class WoWCombatLogParser extends EventEmitter {
  private pipeline: (nextLine: string) => void = () => {
    return;
  };

  constructor() {
    super();
    this.resetParserStates();
  }

  public resetParserStates(): void {
    this.pipeline = createParserPipeline(
      combat => {
        this.emit("arena_match_ended", combat);
      },
      malformedCombat => {
        this.emit("malformed_arena_match_detected", malformedCombat);
      }
    );
  }

  public parseLine(line: string): void {
    this.pipeline(line);
  }
}
