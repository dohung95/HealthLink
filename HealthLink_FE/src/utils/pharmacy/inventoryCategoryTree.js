export function flattenCategoryTree(nodes, depth = 0) {
  const flat = [];
  for (const node of nodes) {
    flat.push({ ...node, depth, key: node.categoryId });
    if (node.children?.length) {
      flat.push(...flattenCategoryTree(node.children, depth + 1));
    }
  }
  return flat;
}
