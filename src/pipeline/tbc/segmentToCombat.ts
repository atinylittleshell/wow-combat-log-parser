import { pipe } from "rxjs";
import { filter, map } from "rxjs/operators";
import {
  CombatData,
  ICombatData,
  IMalformedCombatData,
} from "../../CombatData";
import { ICombatEventSegment } from "../../types";
import { computeCanonicalHash, nullthrows } from "../../utils";
import { isNonNull } from "../common/utils";

export const segmentToCombat = () => {
  return pipe(
    map((segment: ICombatEventSegment):
      | ICombatData
      | IMalformedCombatData
      | null => {
      if (segment.events.length >= 3) {
        const combat = new CombatData();
        combat.startTime = segment.events[0].timestamp || 0;
        segment.events.forEach(e => {
          combat.readEvent(e);
        });
        combat.end();

        if (combat.isWellFormed) {
          const plainCombatDataObject: ICombatData = {
            id: computeCanonicalHash(segment.lines),
            wowVersion: "tbc",
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

      return null;
    }),
    filter(isNonNull)
  );
};
