import { pipe } from "rxjs";
import { filter, map } from "rxjs/operators";
import { ArenaMatchEnd } from "../actions/ArenaMatchEnd";
import { ArenaMatchStart } from "../actions/ArenaMatchStart";
import { CombatData, ICombatData, IMalformedCombatData } from "../CombatData";
import { computeCanonicalHash, nullthrows } from "../utils";
import { ICombatEventSegment } from "./combatEventsToSegments";
import { isNonNull } from "./common";

export const segmentToCombat = () => {
  return pipe(
    map((segment: ICombatEventSegment):
      | ICombatData
      | IMalformedCombatData
      | null => {
      if (
        segment.events.length >= 3 &&
        segment.events[0] instanceof ArenaMatchStart &&
        segment.events[segment.events.length - 1] instanceof ArenaMatchEnd
      ) {
        const combat = new CombatData();
        combat.startTime = segment.events[0].timestamp || 0;
        segment.events.forEach(e => {
          combat.readLogLine(e.logLine);
        });
        combat.end();

        if (combat.isWellFormed) {
          const plainCombatDataObject: ICombatData = {
            id: computeCanonicalHash(segment.lines),
            isWellFormed: true,
            startTime: combat.startTime,
            endTime: combat.endTime,
            units: combat.units,
            playerTeamId: combat.playerTeamId,
            playerTeamRating: combat.playerTeamRating,
            result: combat.result,
            hasAdvancedLogging: combat.hasAdvancedLogging,
            rawLines: segment.lines,
            linesNotParsedCount: segment.lines.length - segment.events.length,
            startInfo: nullthrows(combat.startInfo),
            endInfo: nullthrows(combat.endInfo),
          };
          return plainCombatDataObject;
        }
      }

      if (
        segment.events.length >= 1 &&
        segment.events[0] instanceof ArenaMatchStart
      ) {
        const malformedCombatObject: IMalformedCombatData = {
          id: computeCanonicalHash(segment.lines),
          isWellFormed: false,
          startTime: segment.events[0].timestamp,
          rawLines: segment.lines,
          linesNotParsedCount: segment.lines.length - segment.events.length,
        };
        return malformedCombatObject;
      }

      return null;
    }),
    filter(isNonNull)
  );
};
