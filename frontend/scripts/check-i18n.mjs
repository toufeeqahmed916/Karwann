// Checks that English, Urdu and Sindhi have exactly the same keys and placeholders,
// and that every key used in the source code exists. Run: npm run check:i18n
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const en = JSON.parse(readFileSync(join(root, "locales", "en.json"), "utf8"));
const others = {
  Urdu: JSON.parse(readFileSync(join(root, "locales", "ur.json"), "utf8")),
  Sindhi: JSON.parse(readFileSync(join(root, "locales", "sd.json"), "utf8")),
};

const problems = [];
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

for (const [name, dictionary] of Object.entries(others)) {
  for (const key of Object.keys(en)) {
    if (!(key in dictionary)) problems.push(`Missing in ${name}: ${key}`);
    else if (placeholders(en[key]) !== placeholders(dictionary[key])) {
      problems.push(`Placeholders differ in ${name} for ${key}: {${placeholders(en[key])}} vs {${placeholders(dictionary[key])}}`);
    }
    if (key in dictionary && !String(dictionary[key]).trim()) problems.push(`Empty ${name} text: ${key}`);
  }
  for (const key of Object.keys(dictionary)) if (!(key in en)) problems.push(`Only in ${name}: ${key}`);
}
for (const key of Object.keys(en)) if (!String(en[key]).trim()) problems.push(`Empty English text: ${key}`);

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "locales" ? [] : sourceFiles(path);
    return /\.(jsx?|mjs)$/.test(name) ? [path] : [];
  });
}

const groups = [...new Set(Object.keys(en).map((key) => key.split(".")[0]))].join("|");
const staticKey = /\bt\(\s*["']([\w.]+)["']/g;
const keyLiteral = new RegExp(`["']((?:${groups})\.[\w.]+)["']`, "g");
const templateKey = /\bt\(\s*`([\w.]+)\.\$\{/g;

for (const file of sourceFiles(root)) {
  if (file.endsWith("karwanTranslations.js")) continue; // the landing page has its own text file
  const code = readFileSync(file, "utf8");
  for (const [, key] of [...code.matchAll(staticKey), ...code.matchAll(keyLiteral)]) {
    if (!(key in en)) problems.push(`Used but not defined: ${key} (${file.replace(root, "src")})`);
  }
  for (const [, prefix] of code.matchAll(templateKey)) {
    if (!Object.keys(en).some((key) => key.startsWith(`${prefix}.`))) problems.push(`No keys under prefix: ${prefix}. (${file.replace(root, "src")})`);
  }
}

console.log(`${Object.keys(en).length} keys in English, ${Object.keys(others.Urdu).length} in Urdu, ${Object.keys(others.Sindhi).length} in Sindhi`);
if (problems.length) {
  console.log(problems.join("\n"));
  process.exit(1);
}
console.log("i18n check passed: all three languages are complete.");
