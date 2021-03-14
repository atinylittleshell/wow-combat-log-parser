import { Subject } from "rxjs";
import { ICombatData, IMalformedCombatData } from "../CombatData";
import { combatEventsToSegments } from "./combatEventsToSegments";
import { logLineToCombatEvent } from "./logLineToCombatEvent";
import { segmentToCombat } from "./segmentToCombat";
import { stringToLogLine } from "./stringToLogLine";

export const createParserPipeline = (
  onValidCombat: (combat: ICombatData) => void,
  onMalformedCombat: (combat: IMalformedCombatData) => void
) => {
  const subject = new Subject<string>();

  subject
    .pipe(
      stringToLogLine(),
      logLineToCombatEvent(),
      combatEventsToSegments(),
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
    subject.next(nextLine);
  };
};
