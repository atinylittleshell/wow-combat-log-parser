import EventEmitter from "eventemitter3";
import { createShadowlandsParserPipeline } from "./pipeline/shadowlands/createParserPipeline";
import { WowVersion } from "./types";
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
export * from "./pipeline/common/stringToLogLine";
export * from "./pipeline/shadowlands/logLineToCombatEvent";

export interface IParserContext {
  wowVersion: WowVersion | null;
  pipeline: (nextLine: string) => void;
}

const WOW_VERSION_LINE_PARSER = /COMBAT_LOG_VERSION,(\d+),ADVANCED_LOG_ENABLED,\d,BUILD_VERSION,([^,]+),(.+)\s*$/;

export class WoWCombatLogParser extends EventEmitter {
  private context: IParserContext = {
    wowVersion: null,
    pipeline: () => {
      return;
    },
  };

  constructor() {
    super();
  }

  public resetParserStates(): void {
    this.context = {
      wowVersion: null,
      pipeline: () => {
        return;
      },
    };
  }

  public parseLine(line: string): void {
    const wowVersionLineMatches = line.match(WOW_VERSION_LINE_PARSER);
    if (wowVersionLineMatches && wowVersionLineMatches.length > 0) {
      const wowBuild = wowVersionLineMatches[2];
      const wowVersion: WowVersion = wowBuild.startsWith("2.")
        ? "tbc"
        : "shadowlands";
      this.context = {
        wowVersion,
        // TODO: build tbc pipeline and use it accordingly
        pipeline: createShadowlandsParserPipeline(
          combat => {
            this.emit("arena_match_ended", combat);
          },
          malformedCombat => {
            this.emit("malformed_arena_match_detected", malformedCombat);
          }
        ),
      };
    } else {
      if (!this.context.wowVersion) {
        this.context = {
          wowVersion: "shadowlands",
          pipeline: createShadowlandsParserPipeline(
            combat => {
              this.emit("arena_match_ended", combat);
            },
            malformedCombat => {
              this.emit("malformed_arena_match_detected", malformedCombat);
            }
          ),
        };
      }
      this.context.pipeline(line);
    }
  }
}
