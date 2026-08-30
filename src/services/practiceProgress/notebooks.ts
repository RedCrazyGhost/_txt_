import {
  NotebookFilter,
  NotebookKind,
  ProgressFilter,
  ProgressStatus,
  notebookToProgressRecord,
  type BankLike,
  type BankNotebookGroup,
  type EnrichedNotebook,
  type EnrichedProgressRecord,
  type ListNotebookOptions,
  type ListProgressOptions,
  type NotebookFilterCounts,
  type PracticeNotebook,
  type ProgressStatusCounts
} from "./types";
import { readStore } from "./store";
import {
  enrichNotebook,
  hydrateLegacyWrongNotebook,
  mapRecord,
  notebookGroupKey
} from "./records";

export function listProgressRecords(
  options: ListProgressOptions = {},
  banks: BankLike[] = []
): EnrichedProgressRecord[] {
  const { filter = ProgressFilter.ALL, sort = "updatedAtDesc" } = options;
  let records = Object.values(readStore().notebooks).map((notebook) =>
    mapRecord(notebookToProgressRecord(hydrateLegacyWrongNotebook(notebook, banks, true)), banks)
  );

  if (filter !== ProgressFilter.ALL) {
    records = records.filter((record) => record.status === filter);
  }

  if (sort === "updatedAtDesc") {
    records.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  return records;
}

export function listNotebooks(
  options: ListNotebookOptions = {},
  banks: BankLike[] = []
): EnrichedNotebook[] {
  const { filter = NotebookFilter.ALL, sort = "updatedAtDesc" } = options;
  let notebooks = Object.values(readStore().notebooks).map((notebook) =>
    enrichNotebook(notebook, banks)
  );

  if (filter === NotebookFilter.IN_PROGRESS) {
    notebooks = notebooks.filter((item) => item.status === ProgressStatus.IN_PROGRESS);
  } else if (filter === NotebookFilter.COMPLETED) {
    notebooks = notebooks.filter((item) => item.status === ProgressStatus.COMPLETED);
  } else if (filter === NotebookFilter.HAS_WRONG) {
    notebooks = notebooks.filter((item) => item.wrongQuestionCount > 0);
  } else if (filter === NotebookFilter.INVALID) {
    notebooks = notebooks.filter((item) => item.status === ProgressStatus.INVALID);
  }

  if (sort === "updatedAtDesc") {
    notebooks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  return notebooks;
}

export function buildNotebookAncestorChain(
  notebook: EnrichedNotebook,
  byId: Map<string, EnrichedNotebook>
): EnrichedNotebook[] {
  const chain: EnrichedNotebook[] = [];
  let currentId = notebook.parentNotebookId;
  const seen = new Set<string>();

  while (currentId) {
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const parent = byId.get(currentId);
    if (!parent) break;
    chain.unshift(parent);
    currentId = parent.parentNotebookId;
  }

  return chain;
}

export function findPracticeRoot(
  notebook: EnrichedNotebook,
  byId: Map<string, EnrichedNotebook>
): EnrichedNotebook | null {
  let current: EnrichedNotebook | undefined = notebook;
  const seen = new Set<string>();

  while (current) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    if (current.kind === NotebookKind.PRACTICE) return current;
    if (!current.parentNotebookId) break;
    current = byId.get(current.parentNotebookId);
  }

  return null;
}

function subtreeHasFilteredDescendant(
  notebookId: string,
  notebooks: EnrichedNotebook[],
  filteredIds: Set<string>
): boolean {
  if (filteredIds.has(notebookId)) return true;
  return notebooks.some(
    (item) =>
      item.kind === NotebookKind.WRONG &&
      item.parentNotebookId === notebookId &&
      subtreeHasFilteredDescendant(item.id, notebooks, filteredIds)
  );
}

function getWrongNotebookMountParentId(
  wrong: EnrichedNotebook,
  byId: Map<string, EnrichedNotebook>
): string | undefined {
  if (!wrong.parentNotebookId) return undefined;
  const directParent = byId.get(wrong.parentNotebookId);
  if (directParent?.kind === NotebookKind.PRACTICE) return directParent.id;
  const root = findPracticeRoot(wrong, byId);
  return root?.id ?? wrong.parentNotebookId;
}

export function buildWrongNotebookChildren(
  parentId: string,
  notebooks: EnrichedNotebook[],
  filteredIds: Set<string>
): EnrichedNotebook[] {
  const byId = new Map(notebooks.map((item) => [item.id, item]));
  const matched = notebooks.filter(
    (item) =>
      item.kind === NotebookKind.WRONG &&
      getWrongNotebookMountParentId(item, byId) === parentId &&
      (filteredIds.has(item.id) ||
        filteredIds.has(parentId) ||
        subtreeHasFilteredDescendant(item.id, notebooks, filteredIds))
  );

  return sortWrongNotebookChildren(dedupeWrongNotebookChildren(matched)).map((item) => ({
    ...item,
    children: []
  }));
}

function collectMountedWrongIds(notebook: EnrichedNotebook, mountedIds: Set<string>) {
  if (notebook.kind === NotebookKind.WRONG) {
    mountedIds.add(notebook.id);
  }
  notebook.children.forEach((child) => {
    collectMountedWrongIds(child, mountedIds);
  });
}

function dedupeWrongNotebookChildren(children: EnrichedNotebook[]): EnrichedNotebook[] {
  const seen = new Set<string>();
  return children.filter((child) => {
    if (seen.has(child.id)) return false;
    seen.add(child.id);
    return true;
  });
}

function sortWrongNotebookChildren(children: EnrichedNotebook[]): EnrichedNotebook[] {
  return [...children].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function treeHasFilteredNotebook(notebook: EnrichedNotebook, filteredIds: Set<string>): boolean {
  if (filteredIds.has(notebook.id)) return true;
  return notebook.children.some((child) => treeHasFilteredNotebook(child, filteredIds));
}

function isOrphanWrongRoot(
  wrong: EnrichedNotebook,
  byId: Map<string, EnrichedNotebook>,
  mountedWrongIds: Set<string>
): boolean {
  if (mountedWrongIds.has(wrong.id)) return false;
  if (!wrong.parentNotebookId) return true;
  const parent = byId.get(wrong.parentNotebookId);
  if (!parent) return true;
  if (parent.kind === NotebookKind.PRACTICE) return false;
  return !mountedWrongIds.has(parent.id);
}

function attachWrongUnderPracticeRoot(
  group: BankNotebookGroup,
  practiceRoot: EnrichedNotebook,
  notebooks: EnrichedNotebook[],
  filteredIds: Set<string>,
  mountedWrongIds: Set<string>
) {
  const practiceIdx = group.notebooks.findIndex((item) => item.id === practiceRoot.id);
  const practiceWithChildren = {
    ...(practiceIdx >= 0 ? group.notebooks[practiceIdx] : practiceRoot),
    children: buildWrongNotebookChildren(practiceRoot.id, notebooks, filteredIds)
  };

  if (practiceIdx >= 0) {
    group.notebooks[practiceIdx] = practiceWithChildren;
  } else {
    group.notebooks.push(practiceWithChildren);
  }

  collectMountedWrongIds(practiceWithChildren, mountedWrongIds);
}

function mergeWrongChildTrees(
  left: EnrichedNotebook[],
  right: EnrichedNotebook[]
): EnrichedNotebook[] {
  const byId = new Map<string, EnrichedNotebook>();
  const mergeInto = (child: EnrichedNotebook) => {
    const existing = byId.get(child.id);
    if (!existing) {
      byId.set(child.id, child);
      return;
    }
    byId.set(child.id, {
      ...existing,
      children: mergeWrongChildTrees(existing.children, child.children)
    });
  };
  left.forEach(mergeInto);
  right.forEach(mergeInto);
  return dedupeWrongNotebookChildren(Array.from(byId.values()));
}

function dedupePracticeNotebooks(notebooks: EnrichedNotebook[]): EnrichedNotebook[] {
  const byId = new Map<string, EnrichedNotebook>();
  for (const notebook of notebooks) {
    const existing = byId.get(notebook.id);
    if (!existing) {
      byId.set(notebook.id, notebook);
      continue;
    }
    byId.set(notebook.id, {
      ...existing,
      children: mergeWrongChildTrees(existing.children, notebook.children)
    });
  }
  return Array.from(byId.values());
}

export function listNotebookGroups(
  options: ListNotebookOptions = {},
  banks: BankLike[] = []
): BankNotebookGroup[] {
  const notebooks = listNotebooks({ filter: NotebookFilter.ALL, sort: options.sort }, banks);
  const filteredIds = new Set(
    listNotebooks(options, banks).map((item) => item.id)
  );

  const groups = new Map<string, BankNotebookGroup>();
  const byId = new Map(notebooks.map((item) => [item.id, item]));

  function ensureGroup(notebook: EnrichedNotebook): BankNotebookGroup {
    const groupKey = notebookGroupKey(notebook.name);
    const existing = groups.get(groupKey);
    if (existing) {
      if (!existing.bankIds.includes(notebook.bankId)) {
        existing.bankIds.push(notebook.bankId);
      }
      if (notebook.bankSource && !existing.sources.includes(notebook.bankSource)) {
        existing.sources.push(notebook.bankSource);
      }
      if (notebook.kind === NotebookKind.PRACTICE) {
        existing.name = notebookGroupKey(notebook.name);
        existing.type = notebook.type || existing.type;
        existing.author = notebook.author || existing.author;
        existing.bankSource = notebook.bankSource ?? existing.bankSource;
      }
      return existing;
    }

    const created: BankNotebookGroup = {
      groupKey,
      bankId: notebook.bankId,
      bankIds: [notebook.bankId],
      bankSource: notebook.bankSource,
      sources: notebook.bankSource ? [notebook.bankSource] : [],
      name: groupKey,
      type: notebook.type ?? "",
      author: notebook.author ?? "",
      notebooks: [],
      orphanWrongNotebooks: []
    };
    groups.set(groupKey, created);
    return created;
  }

  notebooks.forEach((notebook) => {
    ensureGroup(notebook);
  });

  const mountedWrongIds = new Set<string>();

  notebooks
    .filter((item) => item.kind === NotebookKind.PRACTICE)
    .forEach((practice) => {
      const children = buildWrongNotebookChildren(practice.id, notebooks, filteredIds);
      const practiceWithChildren = { ...practice, children };
      const includePractice =
        filteredIds.has(practice.id) || treeHasFilteredNotebook(practiceWithChildren, filteredIds);
      if (!includePractice) return;
      const group = ensureGroup(practice);
      group.notebooks.push(practiceWithChildren);
      collectMountedWrongIds(practiceWithChildren, mountedWrongIds);
    });

  notebooks
    .filter((item) => item.kind === NotebookKind.WRONG)
    .forEach((wrong) => {
      if (!filteredIds.has(wrong.id)) return;
      if (mountedWrongIds.has(wrong.id)) return;

      const practiceRoot = findPracticeRoot(wrong, byId);
      if (practiceRoot) {
        const group = ensureGroup(wrong);
        attachWrongUnderPracticeRoot(group, practiceRoot, notebooks, filteredIds, mountedWrongIds);
        return;
      }

      if (!isOrphanWrongRoot(wrong, byId, mountedWrongIds)) return;
      const group = ensureGroup(wrong);
      const orphanWithChildren = {
        ...wrong,
        children: buildWrongNotebookChildren(wrong.id, notebooks, filteredIds)
      };
      group.orphanWrongNotebooks.push(orphanWithChildren);
      collectMountedWrongIds(orphanWithChildren, mountedWrongIds);
    });

  const result = Array.from(groups.values())
    .map((group) => ({
      ...group,
      notebooks: dedupePracticeNotebooks(group.notebooks)
    }))
    .filter(
      (group) => group.notebooks.length > 0 || group.orphanWrongNotebooks.length > 0
    );

  result.sort((a, b) => {
    const aTime = Math.max(
      ...[...a.notebooks, ...a.orphanWrongNotebooks].map((item) => new Date(item.updatedAt).getTime()),
      0
    );
    const bTime = Math.max(
      ...[...b.notebooks, ...b.orphanWrongNotebooks].map((item) => new Date(item.updatedAt).getTime()),
      0
    );
    return bTime - aTime;
  });

  return result;
}

export function countByStatus(records: EnrichedProgressRecord[]): ProgressStatusCounts {
  const counts: ProgressStatusCounts = {
    all: 0,
    inProgress: 0,
    completed: 0,
    invalid: 0,
    notStarted: 0
  };

  records.forEach((record) => {
    counts.all += 1;
    if (counts[record.status as keyof ProgressStatusCounts] !== undefined) {
      counts[record.status as keyof ProgressStatusCounts] += 1;
    }
  });

  return counts;
}

export function countByNotebookFilter(notebooks: EnrichedNotebook[]): NotebookFilterCounts {
  const counts: NotebookFilterCounts = {
    all: notebooks.length,
    inProgress: 0,
    completed: 0,
    hasWrong: 0,
    invalid: 0
  };

  notebooks.forEach((notebook) => {
    if (notebook.status === ProgressStatus.IN_PROGRESS) counts.inProgress += 1;
    if (notebook.status === ProgressStatus.COMPLETED) counts.completed += 1;
    if (notebook.wrongQuestionCount > 0) counts.hasWrong += 1;
    if (notebook.status === ProgressStatus.INVALID) counts.invalid += 1;
  });

  return counts;
}

export function listIncompleteRecords(banks: BankLike[] = []): EnrichedProgressRecord[] {
  return listProgressRecords({ filter: ProgressFilter.IN_PROGRESS }, banks);
}

export function listIncompletePracticeNotebooks(
  bankId: string,
  banks: BankLike[] = []
): EnrichedNotebook[] {
  return listNotebooks({ filter: NotebookFilter.IN_PROGRESS }, banks).filter(
    (notebook) => notebook.bankId === bankId && notebook.kind === NotebookKind.PRACTICE
  );
}

/** 导航角标：未完成做题本 + 错题本数量 */
export function listActionableNotebooks(banks: BankLike[] = []): EnrichedNotebook[] {
  return listNotebooks({ filter: NotebookFilter.IN_PROGRESS }, banks);
}

/** @deprecated 使用 listActionableNotebooks */
export function listActionableWorkspaces(banks: BankLike[] = []): EnrichedNotebook[] {
  return listActionableNotebooks(banks);
}
