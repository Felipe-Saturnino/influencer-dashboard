import { Children, Fragment, isValidElement, type ReactNode } from "react";

export type SelectListaComBuscaOption = {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
};

function nodeToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (isValidElement(node)) {
    const children = (node.props as { children?: ReactNode }).children;
    if (children != null) return nodeToText(children);
  }
  return "";
}

/** Lê `<option>` / `<optgroup>` filhos de um `<select>` legado. */
export function extractSelectOptionsFromChildren(children: ReactNode): SelectListaComBuscaOption[] {
  const out: SelectListaComBuscaOption[] = [];

  function walk(nodes: ReactNode, group?: string) {
    Children.forEach(nodes, (child) => {
      if (child == null || typeof child === "boolean") return;
      if (isValidElement(child) && child.type === Fragment) {
        walk((child.props as { children?: ReactNode }).children, group);
        return;
      }
      if (!isValidElement(child)) return;
      if (child.type === "optgroup") {
        const props = child.props as { label?: string; children?: ReactNode };
        walk(props.children, props.label ? String(props.label) : undefined);
        return;
      }
      if (child.type === "option") {
        const props = child.props as {
          value?: string | number;
          children?: ReactNode;
          disabled?: boolean;
        };
        out.push({
          value: String(props.value ?? ""),
          label: nodeToText(props.children),
          disabled: Boolean(props.disabled),
          group,
        });
      }
    });
  }

  walk(children);
  return out;
}
