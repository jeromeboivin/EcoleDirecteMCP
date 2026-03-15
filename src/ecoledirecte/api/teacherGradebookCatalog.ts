import { ApiCode, type RawApiResponse } from "./normalize.js";

// ── Catalog sub-types ──────────────────────────────────────────

export interface CatalogSubject {
  code: string;
  label?: string;
  shortLabel?: string;
  hasGrading: boolean;
  isEditable: boolean;
  editability?: string;
}

export interface CatalogPeriod {
  code: string;
  label?: string;
  shortLabel?: string;
  state?: string;
  councilDate?: string;
  startDate?: string;
  endDate?: string;
  appreciationOpen: boolean;
  classAppreciationOpen: boolean;
  subjects: CatalogSubject[];
}

export interface CatalogClass {
  id: number;
  code?: string;
  label?: string;
  typeEntity: string;
  isPP: boolean;
  principalProfessorIds?: number[];
  periods: CatalogPeriod[];
}

export interface CatalogGroup {
  id: number;
  code?: string;
  label?: string;
  typeEntity: string;
  periods: CatalogPeriod[];
}

export interface CatalogEstablishment {
  id: number;
  code?: string;
  label?: string;
  classes: CatalogClass[];
  groups: CatalogGroup[];
}

export interface CatalogAttendanceSlot {
  start: string;
  end: string;
}

// ── Top-level payload ──────────────────────────────────────────

export interface TeacherGradebookCatalogPayload {
  establishments: CatalogEstablishment[];
  attendanceGrid: CatalogAttendanceSlot[];
}

export interface NormalizedTeacherGradebookCatalogResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: TeacherGradebookCatalogPayload;
  message?: string;
}

// ── Normalizer ─────────────────────────────────────────────────

export function normalizeTeacherGradebookCatalogResponse(
  raw: RawApiResponse,
): NormalizedTeacherGradebookCatalogResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const source = normalizeCatalogSource(raw.data);
  const topLevelGroups = normalizeTopLevelGroups(source.rootGroupes);
  const establishmentsById = new Map<number, CatalogEstablishment>();

  for (const entry of source.establishments) {
    for (const establishment of normalizeEstablishment(entry)) {
      establishmentsById.set(establishment.id, establishment);
    }
  }

  for (const [establishmentId, groups] of topLevelGroups.entries()) {
    const previous = establishmentsById.get(establishmentId);
    establishmentsById.set(establishmentId, {
      id: establishmentId,
      ...(previous?.code ? { code: previous.code } : {}),
      ...(previous?.label ? { label: previous.label } : {}),
      classes: previous?.classes ?? [],
      groups: mergeGroups(previous?.groups ?? [], groups),
    });
  }

  const establishments = [...establishmentsById.values()].sort((left, right) => left.id - right.id);

  return {
    ok: true,
    code: raw.code,
    raw,
    data: { establishments, attendanceGrid: source.attendanceGrid },
  };
}

// ── Internal helpers ───────────────────────────────────────────

function normalizeCatalogSource(value: unknown): {
  establishments: unknown[];
  rootGroupes: unknown[];
  attendanceGrid: CatalogAttendanceSlot[];
} {
  if (Array.isArray(value)) {
    return {
      establishments: value,
      rootGroupes: [],
      attendanceGrid: normalizeAttendanceGridCollection(value),
    };
  }

  const source = asRecord(value);
  const establishments = Array.isArray(source?.etablissements) ? source.etablissements : [];
  const rootGroupes = [
    ...(Array.isArray(source?.groupes) ? source.groupes : []),
    ...(Array.isArray(source?.autresGroupes) ? source.autresGroupes : []),
  ];
  return {
    establishments,
    rootGroupes,
    attendanceGrid: normalizeAttendanceGridCollection(establishments),
  };
}

function normalizeAttendanceGridCollection(values: unknown[]): CatalogAttendanceSlot[] {
  const slots: CatalogAttendanceSlot[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const entry = asRecord(value);
    const params = asRecord(entry?.parametres);
    for (const slot of normalizeAttendanceGrid(params?.grille)) {
      const key = `${slot.start}-${slot.end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      slots.push(slot);
    }
  }

  return slots;
}

function normalizeEstablishment(entry: unknown): CatalogEstablishment[] {
  const e = entry as Record<string, unknown>;
  const id = typeof e.id === "number" ? e.id : undefined;
  if (id === undefined) return [];

  const niveaux = Array.isArray(e.niveaux) ? e.niveaux : [];
  const classes: CatalogClass[] = [];
  const groups: CatalogGroup[] = [];

  for (const niv of niveaux) {
    const n = niv as Record<string, unknown>;
    const classList = Array.isArray(n.classes) ? n.classes : [];
    const groupList = Array.isArray(n.groupes) ? n.groupes : [];
    for (const cls of classList) classes.push(...normalizeClass(cls));
    for (const grp of groupList) groups.push(...normalizeGroup(grp));
  }

  return [{
    id,
    ...(typeof e.code === "string" ? { code: e.code } : {}),
    ...(typeof e.nom === "string"
      ? { label: e.nom }
      : typeof e.libelle === "string"
        ? { label: e.libelle }
        : {}),
    classes,
    groups,
  }];
}

function normalizeClass(entry: unknown): CatalogClass[] {
  const e = entry as Record<string, unknown>;
  const id = typeof e.idGroupe === "number"
    ? e.idGroupe
    : typeof e.id === "number"
      ? e.id
      : undefined;
  if (id === undefined) return [];

  const tabPP = Array.isArray(e.tabPP) ? e.tabPP : [];
  const principalProfessorIds = tabPP.flatMap((value) => normalizePrincipalProfessorId(value));
  const isPP = e.isPP === true || principalProfessorIds.length > 0;

  return [{
    id,
    ...(typeof e.code === "string" ? { code: e.code } : {}),
    ...(typeof e.libelle === "string" ? { label: e.libelle } : {}),
    typeEntity: typeof e.typeEntity === "string" ? e.typeEntity : "C",
    isPP,
    ...(principalProfessorIds.length > 0 ? { principalProfessorIds } : {}),
    periods: normalizePeriods(e.periodes),
  }];
}

function normalizePrincipalProfessorId(value: unknown): number[] {
  const entry = asRecord(value);
  const id = typeof entry?.idPP === "number"
    ? entry.idPP
    : typeof entry?.id === "number"
      ? entry.id
      : undefined;
  return id !== undefined ? [id] : [];
}

function normalizeGroup(entry: unknown): CatalogGroup[] {
  const e = entry as Record<string, unknown>;
  const id = typeof e.idGroupe === "number"
    ? e.idGroupe
    : typeof e.id === "number"
      ? e.id
      : undefined;
  if (id === undefined) return [];

  return [{
    id,
    ...(typeof e.code === "string" ? { code: e.code } : {}),
    ...(typeof e.libelle === "string" ? { label: e.libelle } : {}),
    typeEntity: typeof e.typeEntity === "string" ? e.typeEntity : "G",
    periods: normalizePeriods(e.periodes),
  }];
}

function normalizePeriods(value: unknown): CatalogPeriod[] {
  if (!Array.isArray(value)) return [];
  const periods = new Map<string, CatalogPeriod>();

  for (const entry of value) {
    const e = entry as Record<string, unknown>;
    if (typeof e.codePeriode !== "string") continue;

    const period: CatalogPeriod = {
      code: e.codePeriode,
      ...(typeof e.libelle === "string" ? { label: e.libelle } : {}),
      ...(typeof e.libelleCourt === "string" && e.libelleCourt ? { shortLabel: e.libelleCourt } : {}),
      ...(typeof e.etat === "string" && e.etat ? { state: e.etat } : {}),
      ...(typeof e.dateConseil === "string" && e.dateConseil ? { councilDate: e.dateConseil } : {}),
      ...(typeof e.dateDebut === "string" && e.dateDebut ? { startDate: e.dateDebut } : {}),
      ...(typeof e.dateFin === "string" && e.dateFin ? { endDate: e.dateFin } : {}),
      appreciationOpen: e.saisieAppreciation === true,
      classAppreciationOpen: e.saisieAppreciationClasse === true,
      subjects: normalizeSubjects(e.matieres),
    };

    const previous = periods.get(period.code);
    if (!previous) {
      periods.set(period.code, period);
      continue;
    }

    periods.set(period.code, {
      ...previous,
      ...period,
      appreciationOpen: previous.appreciationOpen || period.appreciationOpen,
      classAppreciationOpen: previous.classAppreciationOpen || period.classAppreciationOpen,
      subjects: previous.subjects.length > 0 ? previous.subjects : period.subjects,
    });
  }

  return [...periods.values()];
}

function normalizeSubjects(value: unknown): CatalogSubject[] {
  if (!Array.isArray(value)) return [];
  const subjects = new Map<string, CatalogSubject>();

  for (const entry of value) {
    const e = entry as Record<string, unknown>;
    if (typeof e.code !== "string") continue;

    const editability = typeof e.isEditable === "string" && e.isEditable.trim()
      ? e.isEditable.trim()
      : undefined;

    subjects.set(e.code, {
      code: e.code,
      ...(typeof e.libelle === "string" ? { label: e.libelle } : {}),
      ...(typeof e.libelleCourt === "string" && e.libelleCourt ? { shortLabel: e.libelleCourt } : {}),
      hasGrading: e.avecNotation === true,
      isEditable: e.isEditable === true || (editability !== undefined && editability.toLowerCase() !== "jamais"),
      ...(editability ? { editability } : {}),
    });
  }

  return [...subjects.values()];
}

function normalizeAttendanceGrid(value: unknown): CatalogAttendanceSlot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const e = entry as Record<string, unknown>;
    if (typeof e.heureDbt !== "string" || typeof e.heureFin !== "string") return [];
    return [{ start: e.heureDbt, end: e.heureFin }];
  });
}

function normalizeTopLevelGroups(value: unknown): Map<number, CatalogGroup[]> {
  const byEstablishment = new Map<number, CatalogGroup[]>();
  if (!Array.isArray(value)) return byEstablishment;

  for (const entry of value) {
    const group = normalizeGroup(entry)[0];
    const etabId = typeof (entry as Record<string, unknown>).etabId === "number"
      ? (entry as Record<string, unknown>).etabId as number
      : undefined;

    if (!group || etabId === undefined) continue;
    const existing = byEstablishment.get(etabId) ?? [];
    existing.push(group);
    byEstablishment.set(etabId, existing);
  }

  return byEstablishment;
}

function mergeGroups(primary: CatalogGroup[], secondary: CatalogGroup[]): CatalogGroup[] {
  const merged = new Map<number, CatalogGroup>();

  for (const candidate of [...primary, ...secondary]) {
    const previous = merged.get(candidate.id);
    merged.set(candidate.id, {
      ...(previous ?? {}),
      ...candidate,
      id: candidate.id,
      typeEntity: candidate.typeEntity,
      periods: previous ? mergePeriods(previous.periods, candidate.periods) : candidate.periods,
    });
  }

  return [...merged.values()].sort((left, right) => {
    const leftLabel = left.label ?? left.code ?? `${left.id}`;
    const rightLabel = right.label ?? right.code ?? `${right.id}`;
    return leftLabel.localeCompare(rightLabel, "fr", { sensitivity: "base" });
  });
}

function mergePeriods(primary: CatalogPeriod[], secondary: CatalogPeriod[]): CatalogPeriod[] {
  const merged = new Map<string, CatalogPeriod>();

  for (const period of [...primary, ...secondary]) {
    const previous = merged.get(period.code);
    merged.set(period.code, {
      ...(previous ?? {}),
      ...period,
      code: period.code,
      appreciationOpen: (previous?.appreciationOpen ?? false) || period.appreciationOpen,
      classAppreciationOpen: (previous?.classAppreciationOpen ?? false) || period.classAppreciationOpen,
      subjects: previous?.subjects?.length ? previous.subjects : period.subjects,
    });
  }

  return [...merged.values()];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? value as Record<string, unknown> : undefined;
}
