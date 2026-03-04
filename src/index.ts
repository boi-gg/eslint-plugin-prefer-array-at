import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import type * as ts from "typescript";

const isArrayType = (type: ts.Type, checker: ts.TypeChecker): boolean => {
  const constrainedType = checker.getNonNullableType(checker.getBaseConstraintOfType(type) ?? type);

  if (constrainedType.isUnion()) {
    return constrainedType.types.every((unionType) => isArrayType(unionType, checker));
  }

  if (constrainedType.isIntersection()) {
    return constrainedType.types.some((intersectionType) => isArrayType(intersectionType, checker));
  }

  return checker.isArrayType(constrainedType) || checker.isTupleType(constrainedType);
};

interface ParserServices {
  esTreeNodeToTSNodeMap: Map<TSESTree.Node, ts.Node>;
  program: ts.Program;
}

const isNumberLiteral = (
  property: TSESTree.MemberExpression["property"],
): property is { value: number } & TSESTree.Literal =>
  (property.type as string) === "Literal" && typeof property.value === "number";

const needsParentheses = (node: TSESTree.Expression): boolean =>
  !(
    (node.type as string) === "Identifier" ||
    (node.type as string) === "ThisExpression" ||
    (node.type as string) === "Super" ||
    (node.type as string) === "CallExpression" ||
    (node.type as string) === "ChainExpression" ||
    (node.type as string) === "Literal" ||
    (node.type as string) === "MemberExpression"
  );

const preferArrayAtRule = {
  create(context: TSESLint.RuleContext<"useAt", []>): TSESLint.RuleListener {
    const parserServices = context.sourceCode.parserServices as Partial<ParserServices>;
    if (!parserServices.program || !parserServices.esTreeNodeToTSNodeMap) {
      throw new Error("The prefer-array-at rule requires type information. Set parserOptions.projectService or parserOptions.project.");
    }

    const checker = parserServices.program.getTypeChecker();

    return {
      MemberExpression(node) {
        if (node.computed && isNumberLiteral(node.property)) {
          const memberTsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
          const objectTsNode =
            parserServices.esTreeNodeToTSNodeMap.get(node.object) ??
            (memberTsNode as { expression?: ts.Node } | undefined)?.expression;
          if (!objectTsNode) {
            return;
          }

          const objectType = checker.getTypeAtLocation(objectTsNode);
          if (!isArrayType(objectType, checker)) {
            return;
          }

          const source = context.sourceCode.getText(node.object);
          const wrappedSource = needsParentheses(node.object) ? `(${source})` : source;
          const accessor = node.optional ? "?.at" : ".at";
          const idx = node.property.value;
          context.report({
            data: { array: source, index: `${idx}` },
            fix(fixer) {
              return fixer.replaceText(node, `${wrappedSource}${accessor}(${idx})`);
            },
            messageId: "useAt",
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      requiresTypeChecking: true,
    },
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
