import { RuleTester } from "eslint";
import { describe, it } from "vitest";

import plugin from "./index.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

const rule = plugin.rules["prefer-array-at"];

describe("prefer-array-at", () => {
  it("should pass valid cases and fail invalid cases", () => {
    ruleTester.run("prefer-array-at", rule, {
      invalid: [
        {
          code: "const array = [1, 2, 3]; array[0];",
          errors: [{ messageId: "useAt" }],
          output: "const array = [1, 2, 3]; array.at(0);",
        },
        {
          code: "const array = [1, 2, 3]; array[1];",
          errors: [{ messageId: "useAt" }],
          output: "const array = [1, 2, 3]; array.at(1);",
        },
        {
          code: "const array = [1, 2, 3]; array[2];",
          errors: [{ messageId: "useAt" }],
          output: "const array = [1, 2, 3]; array.at(2);",
        },
        {
          code: "const fileList = new FileList(); fileList[0];",
          errors: [{ messageId: "useAt" }],
          output: "const fileList = new FileList(); fileList.at(0);",
        },
        {
          code: "console.log(array1[0]);",
          errors: [{ messageId: "useAt" }],
          output: "console.log(array1.at(0));",
        },
        {
          code: "const value = myArray[5];",
          errors: [{ messageId: "useAt" }],
          output: "const value = myArray.at(5);",
        },
        {
          code: "function test() { return items[10]; }",
          errors: [{ messageId: "useAt" }],
          output: "function test() { return items.at(10); }",
        },
      ],
      valid: [
        // Using .at() method - should pass
        "const array = [1, 2, 3]; array.at(0);",
        "const array = [1, 2, 3]; array.at(1);",
        "const array = [1, 2, 3]; array.at(-1);",

        // Using .item() method - should pass
        "const fileList = new FileList(); fileList.item(0);",

        // Using variable index (not a literal number) - should pass
        "const array = [1, 2, 3]; const i = 0; array[i];",

        // Using string literal - should pass
        "const obj = {a: 1}; obj['a'];",

        // Non-computed member access - should pass
        "const obj = {prop: 1}; obj.prop;",
      ],
    });
  });
});
