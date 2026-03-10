import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { stringify as stringifyYaml } from "yaml";

/**
 * Write spec object to a file in JSON or YAML format.
 */
export function writeSpec(
  outputPath: string,
  spec: object,
  format: "json" | "yaml"
): void {
  mkdirSync(dirname(outputPath), { recursive: true });

  const content =
    format === "yaml"
      ? stringifyYaml(spec, { lineWidth: 0 })
      : JSON.stringify(spec, null, 2);

  writeFileSync(outputPath, content, "utf-8");
}
