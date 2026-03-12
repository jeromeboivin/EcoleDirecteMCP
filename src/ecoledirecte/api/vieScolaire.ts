import { ApiCode, type RawApiResponse } from "./normalize.js";

export interface VieScolaireItem {
  id: number;
  studentId?: number;
  typeElement?: string;
  date?: string;
  displayDate?: string;
  label?: string;
  motif?: string;
  justifie?: boolean;
  par?: string;
  pointsPermis?: number;
  commentaire?: string;
  typeJustification?: string;
  justifieEd?: boolean;
  dontNeedJustifiePrim?: boolean;
  aFaire?: string;
  dateDeroulement?: string;
  matiere?: string;
  presence?: boolean;
  jour?: number;
}

export interface VieScolaireSettings {
  justificationEnLigne?: boolean;
  absenceCommentaire?: boolean;
  retardCommentaire?: boolean;
  sanctionsVisible?: boolean;
  sanctionParQui?: boolean;
  sanctionCommentaire?: boolean;
  encouragementsVisible?: boolean;
  encouragementParQui?: boolean;
  encouragementCommentaire?: boolean;
  afficherPermisPoint?: boolean;
}

export interface VieScolairePayload {
  absencesRetards: VieScolaireItem[];
  dispenses: VieScolaireItem[];
  sanctionsEncouragements: VieScolaireItem[];
  settings: VieScolaireSettings;
  permisPoint?: Record<string, unknown>;
}

export interface NormalizedVieScolaireResponse {
  ok: boolean;
  code: number;
  raw: RawApiResponse;
  data?: VieScolairePayload;
  message?: string;
}

export function normalizeVieScolaireResponse(raw: RawApiResponse): NormalizedVieScolaireResponse {
  if (raw.code !== ApiCode.OK) {
    return {
      ok: false,
      code: raw.code,
      raw,
      message: raw.message || `Unexpected code ${raw.code}`,
    };
  }

  const data = asRecord(raw.data);
  return {
    ok: true,
    code: raw.code,
    raw,
    data: {
      absencesRetards: Array.isArray(data?.absencesRetards)
        ? data.absencesRetards.flatMap((item) => normalizeVieScolaireItem(item))
        : [],
      dispenses: Array.isArray(data?.dispenses)
        ? data.dispenses.flatMap((item) => normalizeVieScolaireItem(item))
        : [],
      sanctionsEncouragements: Array.isArray(data?.sanctionsEncouragements)
        ? data.sanctionsEncouragements.flatMap((item) => normalizeVieScolaireItem(item))
        : [],
      settings: normalizeSettings(data?.parametrage),
      ...(asRecord(data?.permisPoint) ? { permisPoint: data?.permisPoint as Record<string, unknown> } : {}),
    },
  };
}

function normalizeVieScolaireItem(value: unknown): VieScolaireItem[] {
  const item = asRecord(value);
  const id = asNumber(item?.id);
  if (id === undefined) return [];

  return [{
    id,
    ...(asNumber(item?.idEleve) !== undefined ? { studentId: asNumber(item?.idEleve) } : {}),
    ...(asString(item?.typeElement) ? { typeElement: asString(item?.typeElement) } : {}),
    ...(asString(item?.date) ? { date: asString(item?.date) } : {}),
    ...(asString(item?.displayDate) ? { displayDate: asString(item?.displayDate) } : {}),
    ...(asString(item?.libelle) ? { label: asString(item?.libelle) } : {}),
    ...(asString(item?.motif) ? { motif: asString(item?.motif) } : {}),
    ...(asBooleanLike(item?.justifie) !== undefined ? { justifie: asBooleanLike(item?.justifie) } : {}),
    ...(asString(item?.par) ? { par: asString(item?.par) } : {}),
    ...(asNumber(item?.pointsPermis) !== undefined ? { pointsPermis: asNumber(item?.pointsPermis) } : {}),
    ...(asString(item?.commentaire) ? { commentaire: asString(item?.commentaire) } : {}),
    ...(asString(item?.typeJustification) ? { typeJustification: asString(item?.typeJustification) } : {}),
    ...(asBooleanLike(item?.justifieEd) !== undefined ? { justifieEd: asBooleanLike(item?.justifieEd) } : {}),
    ...(asBooleanLike(item?.dontNeedJustifiePrim) !== undefined ? { dontNeedJustifiePrim: asBooleanLike(item?.dontNeedJustifiePrim) } : {}),
    ...(asString(item?.aFaire) ? { aFaire: asString(item?.aFaire) } : {}),
    ...(asString(item?.dateDeroulement) ? { dateDeroulement: asString(item?.dateDeroulement) } : {}),
    ...(asString(item?.matiere) ? { matiere: asString(item?.matiere) } : {}),
    ...(asBooleanLike(item?.presence) !== undefined ? { presence: asBooleanLike(item?.presence) } : {}),
    ...(asNumber(item?.jour) !== undefined ? { jour: asNumber(item?.jour) } : {}),
  }];
}

function normalizeSettings(value: unknown): VieScolaireSettings {
  const settings = asRecord(value);
  return {
    justificationEnLigne: asBooleanLike(settings?.justificationEnLigne),
    absenceCommentaire: asBooleanLike(settings?.absenceCommentaire),
    retardCommentaire: asBooleanLike(settings?.retardCommentaire),
    sanctionsVisible: asBooleanLike(settings?.sanctionsVisible),
    sanctionParQui: asBooleanLike(settings?.sanctionParQui),
    sanctionCommentaire: asBooleanLike(settings?.sanctionCommentaire),
    encouragementsVisible: asBooleanLike(settings?.encouragementsVisible),
    encouragementParQui: asBooleanLike(settings?.encouragementParQui),
    encouragementCommentaire: asBooleanLike(settings?.encouragementCommentaire),
    afficherPermisPoint: asBooleanLike(settings?.afficherPermisPoint),
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === 1) return true;
  if (value === "0" || value === 0) return false;
  return undefined;
}