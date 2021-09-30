import _ from "lodash";
import { pipe } from "rxjs";
import { filter, map } from "rxjs/operators";
import {
  CombatData,
  ICombatData,
  IMalformedCombatData,
} from "../../CombatData";
import {
  CombatUnitReaction,
  CombatUnitType,
  ICombatEventSegment,
} from "../../types";
import { computeCanonicalHash, nullthrows } from "../../utils";
import { isNonNull } from "../common/utils";

export const segmentToCombat = () => {
  return pipe(
    map((segment: ICombatEventSegment):
      | ICombatData
      | IMalformedCombatData
      | null => {
      if (segment.events.length >= 3) {
        const combat = new CombatData("tbc");
        combat.startTime = segment.events[0].timestamp || 0;
        segment.events.forEach(e => {
          combat.readEvent(e);
        });
        combat.end();

        const friendlyTeamCount = _.values(combat.units).filter(
          u =>
            u.type === CombatUnitType.Player &&
            u.reaction === CombatUnitReaction.Friendly
        ).length;
        const enemyTeamCount = _.values(combat.units).filter(
          u =>
            u.type === CombatUnitType.Player &&
            u.reaction === CombatUnitReaction.Hostile
        ).length;
        const biggestTeam = Math.max(friendlyTeamCount, enemyTeamCount);

        let inferredBracket = "2v2";
        if (biggestTeam > 2) {
          inferredBracket = "3v3";
        }
        if (biggestTeam > 3) {
          inferredBracket = "5v5";
        }

        if (combat.isWellFormed) {
          const plainCombatDataObject: ICombatData = {
            events: combat.events,
            id: computeCanonicalHash(segment.lines),
            wowVersion: combat.wowVersion,
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
            startInfo: {
              bracket: combat.startInfo?.bracket || inferredBracket,
              isRanked: combat.startInfo?.isRanked || false,
              item1: combat.startInfo?.item1 || "",
              timestamp: combat.startInfo?.timestamp || 0,
              zoneId: combat.startInfo?.zoneId || "",
            },
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
