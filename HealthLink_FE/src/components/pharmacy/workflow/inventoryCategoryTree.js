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

export function buildCategoryTree(items) {
  const map = {};
  const roots = [];

  items.forEach((item) => {
    const cat = item.category || 'Uncategorized';
    if (!map[cat]) {
      map[cat] = { name: cat, count: 0, items: [] };
    }
    map[cat].count++;
    map[cat].items.push(item);
  });

  Object.values(map).forEach((node) => {
    const parent = findParentCategory(node.name, map);
    if (parent) {
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function findParentCategory(name, map) {
  const parts = name.split(' > ');
  if (parts.length <= 1) return null;
  const parentName = parts.slice(0, -1).join(' > ');
  return map[parentName] || null;
}

export function filterByCategory(items, categoryName) {
  if (!categoryName) return items;
  return items.filter((item) => {
    const cat = item.category || 'Uncategorized';
    return cat === categoryName || cat.startsWith(categoryName + ' > ');
  });
}
