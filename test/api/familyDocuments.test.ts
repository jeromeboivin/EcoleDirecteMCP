import { describe, expect, it } from "vitest";
import { ApiCode, type RawApiResponse } from "../../src/ecoledirecte/api/normalize.js";
import {
  documentDownloadFileType,
  normalizeFamilyDocumentsResponse,
  type DocumentCategory,
  type DocumentEntry,
} from "../../src/ecoledirecte/api/familyDocuments.js";

describe("normalizeFamilyDocumentsResponse", () => {
  it("normalizes sectioned document categories from a realistic payload", () => {
    const raw: RawApiResponse = {
      code: ApiCode.OK,
      token: "",
      message: "",
      data: {
        factures: [
          { id: 1, libelle: "Facture oct 2025", date: "2025-10-01", type: "facture", signatureDemandee: false },
        ],
        notes: [
          { id: 2, libelle: "Bulletin T1", date: "2025-12-15", type: "note" },
          { id: 3, libelle: "Bulletin T2", date: "2026-03-01", type: "note" },
        ],
        viescolaire: [],
        administratifs: [
          { id: 4, libelle: "Attestation scolaire", type: "administratif" },
        ],
        inscriptions: [],
        entreprises: [],
        listesPiecesAVerser: [{ id: 10, libelle: "Photo identité" }],
      },
    };

    const result = normalizeFamilyDocumentsResponse(raw);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      factures: [{ id: 1, libelle: "Facture oct 2025", date: "2025-10-01", type: "facture", signatureDemandee: false }],
      notes: [
        { id: 2, libelle: "Bulletin T1", date: "2025-12-15", type: "note" },
        { id: 3, libelle: "Bulletin T2", date: "2026-03-01", type: "note" },
      ],
      viescolaire: [],
      administratifs: [{ id: 4, libelle: "Attestation scolaire", type: "administratif" }],
      inscriptions: [],
      entreprises: [],
      listesPiecesAVerser: [{ id: 10, libelle: "Photo identité" }],
    });
  });

  it("returns an error for non-200 API codes", () => {
    const raw: RawApiResponse = {
      code: ApiCode.EXPIRED_KEY,
      token: "",
      message: "Session expirée",
    };

    const result = normalizeFamilyDocumentsResponse(raw);

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Session expirée");
  });
});

describe("documentDownloadFileType", () => {
  const entry: DocumentEntry = { id: 1, libelle: "test" };

  it("returns 'Note' for notes category", () => {
    expect(documentDownloadFileType("notes", entry)).toBe("Note");
  });

  it("returns 'Facture' for factures category", () => {
    expect(documentDownloadFileType("factures", entry)).toBe("Facture");
  });

  it("returns 'VieScolaire' for viescolaire category", () => {
    expect(documentDownloadFileType("viescolaire", entry)).toBe("VieScolaire");
  });

  it("returns empty string for administratifs category", () => {
    expect(documentDownloadFileType("administratifs", entry)).toBe("");
  });

  it("returns entry type for inscriptions category", () => {
    const inscriptionEntry: DocumentEntry = { id: 42, type: "INSCR_DOC_A_SIGNER" };
    expect(documentDownloadFileType("inscriptions", inscriptionEntry)).toBe("INSCR_DOC_A_SIGNER");
  });

  it("returns empty string for inscriptions without type", () => {
    expect(documentDownloadFileType("inscriptions", entry)).toBe("");
  });

  it("returns empty string for entreprises category", () => {
    expect(documentDownloadFileType("entreprises", entry)).toBe("");
  });
});
