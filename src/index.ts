import EventEmitter from "eventemitter3";
import { createShadowlandsParserPipeline } from "./pipeline/shadowlands";
import { createTBCParserPipeline } from "./pipeline/tbc";
import { WowVersion } from "./types";
import { PIPELINE_FLUSH_SIGNAL } from "./utils";
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
export * from "./pipeline/common/logLineToCombatEvent";

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

  constructor(wowVersion: WowVersion | null = null) {
    super();
    this.resetParserStates(wowVersion);
  }

  public resetParserStates(wowVersion: WowVersion | null = null): void {
    if (wowVersion === null) {
      this.context = {
        wowVersion,
        pipeline: () => {
          return;
        },
      };
    } else {
      this.setWowVersion(wowVersion);
    }
  }

  public flush(): void {
    if (this.context.wowVersion) {
      this.context.pipeline(PIPELINE_FLUSH_SIGNAL);
    }
  }

  public parseLine(line: string): void {
    const wowVersionLineMatches = line.match(WOW_VERSION_LINE_PARSER);
    if (wowVersionLineMatches && wowVersionLineMatches.length > 0) {
      if (this.context.wowVersion) {
        this.context.pipeline(PIPELINE_FLUSH_SIGNAL);
      }

      const wowBuild = wowVersionLineMatches[2];
      const wowVersion: WowVersion = wowBuild.startsWith("2.")
        ? "tbc"
        : "shadowlands";
      this.setWowVersion(wowVersion);
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

  private setWowVersion(wowVersion: WowVersion) {
    const pipelineFactory =
      wowVersion === "tbc"
        ? createTBCParserPipeline
        : createShadowlandsParserPipeline;
    this.context = {
      wowVersion,
      pipeline: pipelineFactory(
        combat => {
          this.emit("arena_match_ended", combat);
        },
        malformedCombat => {
          this.emit("malformed_arena_match_detected", malformedCombat);
        }
      ),
    };
  }
}
