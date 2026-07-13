export function flattenCategoryTree(nodes, expandedIds = new Set(), depth = 0) {
  const flat = [];
  for (const node of nodes || []) {
    const children = Array.isArray(node.children) ? node.children : [];
    const hasChildren = children.length > 0;
    flat.push({
      ...node,
      children,
      childCount: children.length,
      depth,
      hasChildren,
      key: node.categoryId,
    });
    if (hasChildren && expandedIds.has(node.categoryId)) {
      flat.push(...flattenCategoryTree(children, expandedIds, depth + 1));
    }
  }
  return flat;
}

export function collectExpandableCategoryIds(nodes) {
  const ids = [];
  for (const node of nodes || []) {
    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length > 0) {
      ids.push(node.categoryId);
      ids.push(...collectExpandableCategoryIds(children));
    }
  }
  return ids;
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
