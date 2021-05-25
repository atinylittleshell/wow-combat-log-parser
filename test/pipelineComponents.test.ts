import path from "path";
import fs from "fs";
import { from } from "rxjs";
import { dedup } from "../src/pipeline/tbc/dedup";

describe("pipeline component tests", () => {
  describe("dedup", () => {
    it("should remove duplicate lines", async () => {
      const inputLines = fs
        .readFileSync(path.join(__dirname, "logs", "test_dedup.txt"))
        .toString()
        .split("\n");

      const outputLines: string[] = [];
      from(inputLines)
        .pipe(dedup())
        .forEach(line => outputLines.push(line));

      expect(outputLines).toHaveLength(6);
    });
  });
});
