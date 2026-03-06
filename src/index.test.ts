import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";

import plugin from "./index.js";

const WINDOWS_DRIVE_PATH_PATTERN = /^\/([A-Za-z]:\/)/;
const tsconfigRootDir = new URL("..", import.meta.url).pathname.replace(WINDOWS_DRIVE_PATH_PATTERN, "$1");

const overrideConfig = {
  files: ["**/*.ts"],
  languageOptions: {
    ecmaVersion: 2022,
    parser: tseslint.parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ["*.ts"],
        defaultProject: "./tsconfig.json",
      },
      tsconfigRootDir,
    },
    sourceType: "module",
  },
  plugins: {
    "prefer-array-at": plugin,
  },
  rules: {
    "prefer-array-at/prefer-array-at": "error",
  },
};

const overrideConfigAll = {
  ...overrideConfig,
  rules: {
    "prefer-array-at/prefer-array-at": ["error", { warnOnUnsupportedArrayLike: true }],
  },
};

const eslint = new ESLint({ overrideConfig: [overrideConfig], overrideConfigFile: true } as ESLint.Options);
const eslintAll = new ESLint({ overrideConfig: [overrideConfigAll], overrideConfigFile: true } as ESLint.Options);

const applySingleFix = (code: string, fix: NonNullable<ESLint.LintResult["messages"][number]["fix"]>): string => {
  const [start, end] = fix.range;
  if (typeof start !== "number" || typeof end !== "number") {
    return code;
  }

  return `${code.slice(0, start)}${fix.text}${code.slice(end)}`;
};

const invalidCases = [
  {
    code: "const array: number[] = [1, 2, 3]; array[0];",
    output: "const array: number[] = [1, 2, 3]; array.at(0);",
  },
  {
    code: "const tuple: [number, number] = [1, 2]; tuple[0];",
    output: "const tuple: [number, number] = [1, 2]; tuple.at(0);",
  },
  {
    code: "declare const fileList: FileList; fileList[0];",
    output: "declare const fileList: FileList; fileList.item(0);",
  },
  {
    code: "declare const nodes: NodeList; nodes[0];",
    output: "declare const nodes: NodeList; nodes.item(0);",
  },
  {
    code: "declare const nodes: NodeListOf<Element>; nodes[0];",
    output: "declare const nodes: NodeListOf<Element>; nodes.item(0);",
  },
  {
    code: "declare const collection: HTMLCollection; collection[0];",
    output: "declare const collection: HTMLCollection; collection.item(0);",
  },
  {
    code: "declare const collection: HTMLCollectionOf<Element>; collection[0];",
    output: "declare const collection: HTMLCollectionOf<Element>; collection.item(0);",
  },
  {
    code: "declare const map: NamedNodeMap; map[0];",
    output: "declare const map: NamedNodeMap; map.item(0);",
  },
] as const;

const validCases = [
  "const array: number[] = [1, 2, 3]; array.at(0);",
  "declare const fileList: FileList; fileList.item(0);",
  "declare const nodes: NodeListOf<Element>; nodes.item(0);",
  "declare const collection: HTMLCollectionOf<Element>; collection.item(0);",
  "declare const map: NamedNodeMap; map.item(0);",
  "declare const tokenList: DOMTokenList; tokenList[0];",
  "function fn() { return arguments[0]; }",
  "const obj: Record<number, string> = { 0: 'a' }; obj[0];",
  "const array: number[] = [1, 2, 3]; const i = 0; array[i];",
] as const;

describe("prefer-array-at", () => {
  it("reports and auto-fixes array and tuple numeric literal indexing", async () => {
    for (const testCase of invalidCases) {
      const [result] = await eslint.lintText(testCase.code, { filePath: "test.ts" });
      const fix = result.messages.at(0)?.fix;

      expect(result.messages).toHaveLength(1);
      expect(result.messages.at(0)?.ruleId).toBe("prefer-array-at/prefer-array-at");
      expect(fix).toBeDefined();
      if (!fix) {
        throw new Error("Expected a fix for invalid case");
      }
      expect(applySingleFix(testCase.code, fix)).toBe(testCase.output);
    }
  });

  it("does not report non-array indexing", async () => {
    for (const code of validCases) {
      const [result] = await eslint.lintText(code, { filePath: "test.ts" });
      expect(result.messages).toHaveLength(0);
    }
  });

  it("reports unsupported DOMTokenList/arguments numeric indexing in all config mode", async () => {
    const unsupportedCases = [
      "declare const tokenList: DOMTokenList; tokenList[0];",
      "function fn() { return arguments[0]; }",
    ];

    for (const code of unsupportedCases) {
      const [result] = await eslintAll.lintText(code, { filePath: "test.ts" });
      expect(result.messages).toHaveLength(1);
      expect(result.messages.at(0)?.ruleId).toBe("prefer-array-at/prefer-array-at");
      expect(result.messages.at(0)?.messageId).toBe("warnUnsupportedIndexing");
      expect(result.messages.at(0)?.fix).toBeUndefined();
    }
  });
});
