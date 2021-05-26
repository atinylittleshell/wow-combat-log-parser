import { Subject } from "rxjs";
import { ICombatData, IMalformedCombatData } from "../../CombatData";
import { combatEventsToSegment } from "./combatEventsToSegment";
import { logLineToCombatEvent } from "../common/logLineToCombatEvent";
import { segmentToCombat } from "./segmentToCombat";
import { stringToLogLine } from "../common/stringToLogLine";

export const createShadowlandsParserPipeline = (
  onValidCombat: (combat: ICombatData) => void,
  onMalformedCombat: (combat: IMalformedCombatData) => void
) => {
  const rawLogs = new Subject<string>();

  rawLogs
    .pipe(
      stringToLogLine(),
      logLineToCombatEvent("shadowlands"),
      combatEventsToSegment(),
      segmentToCombat()
    )
    .subscribe({
      next: v => {
        if (v.isWellFormed) {
          onValidCombat(v);
        } else {
          onMalformedCombat(v);
        }
      },
    });

  return (nextLine: string) => {
    rawLogs.next(nextLine);
  };
};
