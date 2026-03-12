import { describe, expect, it } from "vitest";
import { ApiCode, type RawApiResponse } from "../../src/ecoledirecte/api/normalize.js";
import { normalizeFamilyInvoicesResponse } from "../../src/ecoledirecte/api/familyInvoices.js";

describe("normalizeFamilyInvoicesResponse", () => {
  it("normalizes an invoice array from a realistic payload", () => {
    const raw: RawApiResponse = {
      code: ApiCode.OK,
      token: "",
      message: "",
      data: [
        {
          id: 1,
          libelle: "Facture octobre 2025",
          date: "2025-10-01",
          type: "facture",
          signatureDemandee: false,
          etatSignatures: [],
          signature: {},
        },
        {
          id: 2,
          libelle: "Facture novembre 2025",
          date: "2025-11-01",
          type: "facture",
          signatureDemandee: true,
        },
      ],
    };

    const result = normalizeFamilyInvoicesResponse(raw);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      invoices: [
        {
          id: 1,
          libelle: "Facture octobre 2025",
          date: "2025-10-01",
          type: "facture",
          signatureDemandee: false,
          etatSignatures: [],
          signature: {},
        },
        {
          id: 2,
          libelle: "Facture novembre 2025",
          date: "2025-11-01",
          type: "facture",
          signatureDemandee: true,
        },
      ],
    });
  });

  it("returns an error for non-200 API codes", () => {
    const raw: RawApiResponse = {
      code: ApiCode.EXPIRED_KEY,
      token: "",
      message: "Session expirée",
    };

    const result = normalizeFamilyInvoicesResponse(raw);

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Session expirée");
  });
});
