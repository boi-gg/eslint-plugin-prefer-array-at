import type { Rule } from "eslint";

const preferArrayAtRule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      MemberExpression(node) {
        if (node.computed && node.property.type === "Literal" && typeof node.property.value === "number") {
          const src = context.sourceCode.getText(node.object);
          const idx = node.property.value;
          context.report({
            data: { array: src, index: `${idx}` },
            fix(fixer) {
              return fixer.replaceText(node, `${src}.at(${idx})`);
            },
            messageId: "useAt",
            node,
          });
        }
      },
    };
  },
  meta: {
    fixable: "code",
    messages: {
      useAt: "Use {{array}}.at({{index}}) instead of {{array}}[{{index}}].",
    },
    type: "suggestion",
  },
} as const;

const rules = {
  "prefer-array-at": preferArrayAtRule,
} as const;

const plugin = {
  rules: {
    "prefer-array-at": preferArrayAtRule,
  },
} as const;

const configs = {
  recommended: {
    plugins: {
      "prefer-array-at": {
        rules,
      },
    },
    rules: {
      "prefer-array-at/prefer-array-at": "warn",
    },
  },
} as const;

export default { ...plugin, configs };
