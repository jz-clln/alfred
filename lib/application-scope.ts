// null means all applications; this cookie value means only unassigned records.
export const UNASSIGNED_APPLICATION = "unassigned";

export function filterApplication(
  query: { filter: (column: string, operator: string, value: string | null) => unknown },
  scope: string | null,
  column = "application_id",
) {
  if (scope === UNASSIGNED_APPLICATION) query.filter(column, "is", null);
  else if (scope) query.filter(column, "eq", scope);
}

const COLORS = ["#46657F", "#7A5C14", "#9F4530", "#527A5A", "#79589F", "#287F8D"];

export function applicationColor(id: string): string {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}
