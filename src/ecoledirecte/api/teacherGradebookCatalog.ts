import { ApiCode, type RawApiResponse } from "./normalize.js";

// ── Catalog sub-types ──────────────────────────────────────────

export interface CatalogSubject {
  code: string;
  label?: string;
  hasGrading: boolean;
  isEditable: boolean;
}

export interface CatalogPeriod {
  code: string;
  label?: string;
  councilDate?: string;
  appreciationOpen: boolean;
  subjects: CatalogSubject[];
}

export interface CatalogClass {
  id: number;
  code?: string;
  label?: string;
  typeEntity: string;
  isPP: boolean;
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

  const source = Array.isArray(raw.data) ? raw.data : [];
  const establishments = source.flatMap((entry) => normalizeEstablishment(entry));

  // Attendance grid is in parametres.grille on the first establishment entry
  const firstParams = source.length > 0
    ? (source[0] as Record<string, unknown>)?.parametres as Record<string, unknown> | undefined
    : undefined;
  const attendanceGrid = normalizeAttendanceGrid(firstParams?.grille);

  return {
    ok: true,
    code: raw.code,
    raw,
    data: { establishments, attendanceGrid },
  };
}

// ── Internal helpers ───────────────────────────────────────────

function normalizeEstablishment(entry: unknown): CatalogEstablishment[] {
  const e = entry as Record<string, unknown>;
  if (typeof e.id !== "number") return [];

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
    id: e.id,
    ...(typeof e.code === "string" ? { code: e.code } : {}),
    ...(typeof e.nom === "string" ? { label: e.nom } : {}),
    classes,
    groups,
  }];
}

function normalizeClass(entry: unknown): CatalogClass[] {
  const e = entry as Record<string, unknown>;
  if (typeof e.idGroupe !== "number") return [];

  const tabPP = Array.isArray(e.tabPP) ? e.tabPP : [];
  const isPP = tabPP.length > 0;

  return [{
    id: e.idGroupe,
    ...(typeof e.code === "string" ? { code: e.code } : {}),
    ...(typeof e.libelle === "string" ? { label: e.libelle } : {}),
    typeEntity: typeof e.typeEntity === "string" ? e.typeEntity : "C",
    isPP,
    periods: normalizePeriods(e.periodes),
  }];
}

function normalizeGroup(entry: unknown): CatalogGroup[] {
  const e = entry as Record<string, unknown>;
  if (typeof e.idGroupe !== "number") return [];

  return [{
    id: e.idGroupe,
    ...(typeof e.code === "string" ? { code: e.code } : {}),
    ...(typeof e.libelle === "string" ? { label: e.libelle } : {}),
    typeEntity: typeof e.typeEntity === "string" ? e.typeEntity : "G",
    periods: normalizePeriods(e.periodes),
  }];
}

function normalizePeriods(value: unknown): CatalogPeriod[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const e = entry as Record<string, unknown>;
    if (typeof e.codePeriode !== "string") return [];
    return [{
      code: e.codePeriode,
      ...(typeof e.libelle === "string" ? { label: e.libelle } : {}),
      ...(typeof e.dateConseil === "string" && e.dateConseil ? { councilDate: e.dateConseil } : {}),
      appreciationOpen: e.saisieAppreciation === true,
      subjects: normalizeSubjects(e.matieres),
    }];
  });
}

function normalizeSubjects(value: unknown): CatalogSubject[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const e = entry as Record<string, unknown>;
    if (typeof e.code !== "string") return [];
    return [{
      code: e.code,
      ...(typeof e.libelle === "string" ? { label: e.libelle } : {}),
      hasGrading: e.avecNotation === true,
      isEditable: e.isEditable === true,
    }];
  });
}

function normalizeAttendanceGrid(value: unknown): CatalogAttendanceSlot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const e = entry as Record<string, unknown>;
    if (typeof e.heureDbt !== "string" || typeof e.heureFin !== "string") return [];
    return [{ start: e.heureDbt, end: e.heureFin }];
  });
}
