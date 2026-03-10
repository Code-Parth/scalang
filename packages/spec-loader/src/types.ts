export interface LoadSpecResult {
  spec: Record<string, unknown>;
  raw: string;
  format: "json" | "yaml";
}
