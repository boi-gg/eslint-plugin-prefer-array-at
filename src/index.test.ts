import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";

import plugin from "./index.js";

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
      tsconfigRootDir: "/home/runner/work/eslint-plugin-prefer-array-at/eslint-plugin-prefer-array-at",
    },
    sourceType: "module",
  },
  plugins: {
    "prefer-array-at": plugin,
  },
  rules: {
    "prefer-array-at/prefer-array-at": "error",
  },
} as const;

const eslint = new ESLint({ overrideConfig, overrideConfigFile: true });

const invalidCases = [
  {
    code: "const array: number[] = [1, 2, 3]; array[0];",
  },
  {
    code: "const tuple: [number, number] = [1, 2]; tuple[0];",
  },
] as const;

const validCases = [
  "const array: number[] = [1, 2, 3]; array.at(0);",
  "const fileList = new FileList(); fileList[0];",
  "const obj: Record<number, string> = { 0: 'a' }; obj[0];",
  "const array: number[] = [1, 2, 3]; const i = 0; array[i];",
] as const;

describe("prefer-array-at", () => {
  it("reports and auto-fixes array and tuple numeric literal indexing", async () => {
    for (const testCase of invalidCases) {
      const [result] = await eslint.lintText(testCase.code, { filePath: "test.ts" });

      expect(result.messages).toHaveLength(1);
      expect(result.messages.at(0)?.ruleId).toBe("prefer-array-at/prefer-array-at");
      expect(result.messages.at(0)?.fix).toBeDefined();
    }
  });

  it("does not report non-array indexing", async () => {
    for (const code of validCases) {
      const [result] = await eslint.lintText(code, { filePath: "test.ts" });
      expect(result.messages).toHaveLength(0);
    }
  });
});
