import { AST_NODE_TYPES, ESLintUtils, type TSESLint } from "@typescript-eslint/utils";
import ts from "typescript";

const isArrayType = (type: ts.Type, checker: ts.TypeChecker): boolean => {
  const constrainedType = checker.getBaseConstraintOfType(type) ?? type;

  if (constrainedType.isUnion()) {
    return constrainedType.types.every((unionType) => isArrayType(unionType, checker));
  }

  if (constrainedType.isIntersection()) {
    return constrainedType.types.some((intersectionType) => isArrayType(intersectionType, checker));
  }

  return checker.isArrayType(constrainedType) || checker.isTupleType(constrainedType);
};

const preferArrayAtRule = {
  create(context: TSESLint.RuleContext<"useAt", []>): TSESLint.RuleListener {
    const parserServices = ESLintUtils.getParserServices(context);
    const checker = parserServices.program.getTypeChecker();

    return {
      MemberExpression(node) {
        if (node.computed && node.property.type === AST_NODE_TYPES.Literal && typeof node.property.value === "number") {
          const objectType = checker.getTypeAtLocation(parserServices.esTreeNodeToTSNodeMap.get(node.object));
          if (!isArrayType(objectType, checker)) {
            return;
          }

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
