import { buildLocalRepairDraft } from "../src/lib/repairDraftParser.ts";
import { repairParserScenarios } from "./repair-parser-scenarios.mts";

type DraftKey = "description" | "laborCost" | "partsCost" | "kilometer" | "paymentStatus" | "paidAmount" | "notes";

const checkedKeys: DraftKey[] = ["description", "laborCost", "partsCost", "kilometer", "paymentStatus", "paidAmount", "notes"];

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("tr-TR") : value;
}

function matchExpected(actual: unknown, expected: unknown) {
  if (expected === undefined) {
    return true;
  }

  if (typeof expected === "string") {
    return normalizeText(actual) === normalizeText(expected);
  }

  return actual === expected;
}

let exactPassCount = 0;
const fieldFailures = new Map<DraftKey, number>();

for (const key of checkedKeys) {
  fieldFailures.set(key, 0);
}

for (const scenario of repairParserScenarios) {
  const draft = buildLocalRepairDraft(scenario.transcript);
  const failures: string[] = [];

  for (const key of checkedKeys) {
    if (!(key in scenario.expected)) continue;
    const actual = draft[key];
    const expected = scenario.expected[key];

    if (!matchExpected(actual, expected)) {
      fieldFailures.set(key, (fieldFailures.get(key) ?? 0) + 1);
      failures.push(`${key}: beklenen=${String(expected)} gelen=${String(actual)}`);
    }
  }

  if (failures.length === 0) {
    exactPassCount += 1;
    console.log(`PASS ${scenario.id}`);
  } else {
    console.log(`FAIL ${scenario.id}`);
    console.log(`  transcript: ${scenario.transcript}`);
    for (const line of failures) {
      console.log(`  - ${line}`);
    }
  }
}

console.log("");
console.log(`Toplam senaryo: ${repairParserScenarios.length}`);
console.log(`Tam gecen: ${exactPassCount}`);
console.log(`Basarisiz: ${repairParserScenarios.length - exactPassCount}`);
console.log("");
console.log("Alan bazli hata sayisi:");
for (const key of checkedKeys) {
  console.log(`- ${key}: ${fieldFailures.get(key) ?? 0}`);
}
