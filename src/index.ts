import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import type * as ts from "typescript";

type TargetKind = "array" | "fileList";

const resolveTargetKind = (type: ts.Type, checker: ts.TypeChecker): null | TargetKind => {
  const constrainedType = checker.getNonNullableType(checker.getBaseConstraintOfType(type) ?? type);

  if (constrainedType.isUnion()) {
    const kinds = constrainedType.types.map((unionType) => resolveTargetKind(unionType, checker));
    const firstKind = kinds.at(0);
    return firstKind != null && kinds.every((kind) => kind === firstKind) ? firstKind : null;
  }

  if (constrainedType.isIntersection()) {
    for (const intersectionType of constrainedType.types) {
      const kind = resolveTargetKind(intersectionType, checker);
      if (kind) {
        return kind;
      }
    }
    return null;
  }

  if (checker.isArrayType(constrainedType) || checker.isTupleType(constrainedType)) {
    return "array";
  }

  return constrainedType.getSymbol()?.getName() === "FileList" || constrainedType.aliasSymbol?.getName() === "FileList"
    ? "fileList"
    : null;
};

interface ParserServices {
  esTreeNodeToTSNodeMap: Map<TSESTree.Node, ts.Node>;
  program: ts.Program;
}

const literalPropertyType = "Literal" as TSESTree.Literal["type"];

const isNumberLiteral = (
  property: TSESTree.MemberExpression["property"],
): property is { value: number } & TSESTree.Literal =>
  property.type === literalPropertyType && typeof property.value === "number";

const nodeTypesWithoutParentheses = new Set<string>([
  "CallExpression",
  "ChainExpression",
  "Identifier",
  "Literal",
  "MemberExpression",
  "Super",
  "ThisExpression",
]);

const needsParentheses = (node: TSESTree.Expression): boolean => !nodeTypesWithoutParentheses.has(node.type);

const ruleDocs: { requiresTypeChecking: true } & TSESLint.RuleMetaDataDocs = {
  description: "Prefer .at() for arrays/tuples and .item() for FileList numeric index access.",
  requiresTypeChecking: true,
};

const preferArrayAtRule: TSESLint.RuleModule<"useAt"> = {
  create(context) {
    const parserServices = context.sourceCode.parserServices as Partial<ParserServices>;
    if (!parserServices.program || !parserServices.esTreeNodeToTSNodeMap) {
      throw new Error(
        "The prefer-array-at rule requires type information. Set either parserOptions.projectService or parserOptions.project.",
      );
    }

    const checker = parserServices.program.getTypeChecker();
    const esTreeNodeToTSNodeMap = parserServices.esTreeNodeToTSNodeMap;

    return {
      MemberExpression(node) {
        if (node.computed && isNumberLiteral(node.property)) {
          const memberTsNode = esTreeNodeToTSNodeMap.get(node);
          const objectTsNode =
            esTreeNodeToTSNodeMap.get(node.object) ??
            // Optional-chain and parenthesized expressions can miss a direct object mapping in some parser-service cases.
            (memberTsNode as { expression?: ts.Node } | undefined)?.expression;
          if (!objectTsNode) {
            return;
          }

          const objectType = checker.getTypeAtLocation(objectTsNode);
          const targetKind = resolveTargetKind(objectType, checker);
          if (!targetKind) {
            return;
          }

          const source = context.sourceCode.getText(node.object);
          const wrappedSource = needsParentheses(node.object) ? `(${source})` : source;
          const method = targetKind === "fileList" ? "item" : "at";
          const accessor = node.optional ? `?.${method}` : `.${method}`;
          const idx = node.property.value;
          context.report({
            data: { array: source, index: `${idx}`, method },
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
    docs: ruleDocs,
    fixable: "code",
    messages: {
      useAt: "Use {{array}}.{{method}}({{index}}) instead of {{array}}[{{index}}].",
    },
    schema: [],
    type: "suggestion",
  },
};

const rules = {
  "prefer-array-at": preferArrayAtRule,
};

const plugin = {
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

const configs = {
  recommended: {
    plugins: {
      "prefer-array-at": plugin,
    },
    rules: {
      "prefer-array-at/prefer-array-at": "warn",
    },
  },
};

export default { ...plugin, configs };
