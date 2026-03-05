import type { ESLint, Rule } from "eslint";
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

interface ExpressionNode {
  type: string;
}

interface MemberExpressionProperty {
  type: string;
  value?: unknown;
}

interface ParserServices {
  esTreeNodeToTSNodeMap: Map<unknown, ts.Node>;
  program: ts.Program;
}

const isNumberLiteral = (
  property: MemberExpressionProperty,
): property is { value: number } & MemberExpressionProperty =>
  property.type === "Literal" && typeof property.value === "number";

const nodeTypesWithoutParentheses = new Set<string>([
  "CallExpression",
  "ChainExpression",
  "Identifier",
  "Literal",
  "MemberExpression",
  "Super",
  "ThisExpression",
]);

const needsParentheses = (node: ExpressionNode): boolean => !nodeTypesWithoutParentheses.has(node.type);

const ruleDocs = {
  description: "Prefer .at() for arrays/tuples and .item() for FileList numeric index access.",
  requiresTypeChecking: true,
};

const preferArrayAtRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
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
} satisfies ESLint.Plugin;

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
