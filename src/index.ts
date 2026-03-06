import type { ESLint, Linter, Rule } from "eslint";
import type * as ts from "typescript";

interface RuleOption {
  warnOnUnsupportedArrayLike?: boolean;
}

type TargetKind = "array" | "item" | "warnArguments" | "warnDomTokenList";

const itemMethodTypeNames = new Set<string>([
  "FileList",
  "HTMLCollection",
  "HTMLCollectionOf",
  "NamedNodeMap",
  "NodeList",
  "NodeListOf",
]);

const warnOnlyTypeKinds = {
  DOMTokenList: "warnDomTokenList",
  IArguments: "warnArguments",
} as const satisfies Record<string, TargetKind>;

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

  const symbolName = constrainedType.getSymbol()?.getName();
  const aliasSymbolName = constrainedType.aliasSymbol?.getName();

  if (symbolName && itemMethodTypeNames.has(symbolName)) {
    return "item";
  }

  if (aliasSymbolName && itemMethodTypeNames.has(aliasSymbolName)) {
    return "item";
  }

  if (symbolName && symbolName in warnOnlyTypeKinds) {
    return warnOnlyTypeKinds[symbolName as keyof typeof warnOnlyTypeKinds];
  }

  if (aliasSymbolName && aliasSymbolName in warnOnlyTypeKinds) {
    return warnOnlyTypeKinds[aliasSymbolName as keyof typeof warnOnlyTypeKinds];
  }

  return null;
};

interface ESTreeNode {
  type: string;
}

interface ExpressionNode {
  type: string;
}

interface MemberExpressionProperty {
  type: string;
  value?: unknown;
}

interface ParserServices {
  esTreeNodeToTSNodeMap: Map<ESTreeNode, ts.Node>;
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
  description:
    "Prefer .at()/.item() for supported array-likes and optionally warn on unsupported numeric literal indexing.",
  requiresTypeChecking: true,
};

const preferArrayAtRule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    const options = context.options.at(0) as RuleOption | undefined;
    const warnOnUnsupportedArrayLike = options?.warnOnUnsupportedArrayLike ?? false;

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
          const idx = node.property.value;

          if (targetKind === "warnDomTokenList" || targetKind === "warnArguments") {
            if (!warnOnUnsupportedArrayLike) {
              return;
            }

            context.report({
              data: {
                array: source,
                index: `${idx}`,
                kind: targetKind === "warnDomTokenList" ? "DOMTokenList" : "arguments",
              },
              messageId: "warnUnsupportedIndexing",
              node,
            });
            return;
          }

          const wrappedSource = needsParentheses(node.object) ? `(${source})` : source;
          const method = targetKind === "item" ? "item" : "at";
          const accessor = node.optional ? `?.${method}` : `.${method}`;
          context.report({
            data: { array: source, index: `${idx}`, method },
            fix(fixer) {
              return fixer.replaceText(node, `${wrappedSource}${accessor}(${idx})`);
            },
            messageId: "useMethod",
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
      useMethod: "Use {{array}}.{{method}}({{index}}) instead of {{array}}[{{index}}].",
      warnUnsupportedIndexing:
        "Avoid {{kind}} numeric indexing ({{array}}[{{index}}]); this rule has no safe automatic replacement.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          warnOnUnsupportedArrayLike: {
            type: "boolean",
          },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};

const rules = {
  "prefer-array-at": preferArrayAtRule,
};

type PluginConfigs = Record<string, Array<Linter.Config> | Linter.Config>;
type PluginWithConfigs = { configs: PluginConfigs } & Omit<ESLint.Plugin, "configs">;

const plugin: PluginWithConfigs = {
  configs: {},
  rules,
};

const configs: PluginConfigs = {
  all: {
    plugins: {
      "prefer-array-at": plugin,
    },
    rules: {
      "prefer-array-at/prefer-array-at": ["warn", { warnOnUnsupportedArrayLike: true }],
    },
  },
  recommended: {
    plugins: {
      "prefer-array-at": plugin,
    },
    rules: {
      "prefer-array-at/prefer-array-at": "warn",
    },
  },
};

plugin.configs = configs;

export default plugin;
