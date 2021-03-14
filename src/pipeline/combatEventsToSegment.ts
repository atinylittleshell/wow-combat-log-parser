import { Observable } from "rxjs";
import { ArenaMatchEnd } from "../actions/ArenaMatchEnd";
import { ArenaMatchStart } from "../actions/ArenaMatchStart";
import { CombatEvent } from "./logLineToCombatEvent";

const COMBAT_AUTO_TIMEOUT_SECS = 60;

export interface ICombatEventSegment {
  events: CombatEvent[];
  lines: string[];
}

export const combatEventsToSegment = () => {
  return (input: Observable<CombatEvent | string>) => {
    return new Observable<ICombatEventSegment>(output => {
      let lastTimestamp = 0;
      let currentBuffer: ICombatEventSegment = { events: [], lines: [] };

      input.subscribe({
        next: event => {
          // this means the line could not be parsed correctly, in which case we
          // still want to store it as raw log in the "lines" buffer.
          if (typeof event === "string") {
            currentBuffer.lines.push(event);
            return;
          }

          const emitCurrentBuffer = () => {
            if (!currentBuffer.lines.length) {
              return;
            }

            output.next(currentBuffer);

            currentBuffer = {
              events: [],
              lines: [],
            };
          };

          const timeout =
            event.timestamp - lastTimestamp > COMBAT_AUTO_TIMEOUT_SECS * 1000;

          if (timeout || event instanceof ArenaMatchStart) {
            emitCurrentBuffer();
          }

          currentBuffer.events.push(event);
          currentBuffer.lines.push(event.logLine.raw);

          if (event instanceof ArenaMatchEnd) {
            emitCurrentBuffer();
          }

          lastTimestamp = event.timestamp;
        },
        error: e => {
          output.error(e);
        },
        complete: () => {
          output.complete();
        },
      });
    });
  };
};
