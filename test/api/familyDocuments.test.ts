import { describe, expect, it } from "vitest";
import { ApiCode, type RawApiResponse } from "../../src/ecoledirecte/api/normalize.js";
import { normalizeFamilyDocumentsResponse } from "../../src/ecoledirecte/api/familyDocuments.js";

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
