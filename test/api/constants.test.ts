import { describe, it, expect } from "vitest";
import {
  doubleAuthUrl,
  familyMessagesUrl,
  loginUrl,
  probeUrl,
  classVieDeLaClasseUrl,
  studentCahierDeTextesUrl,
  studentCarnetCorrespondanceUrl,
  studentEmploiDuTempsUrl,
  studentMessagesUrl,
  studentNotesUrl,
  studentSessionsRdvUrl,
  studentVieScolaireUrl,
  API_BASE,
  API_VERSION,
  DEFAULT_APP_VERSION,
} from "../../src/ecoledirecte/api/constants.js";

describe("loginUrl", () => {
  it("returns bootstrap URL with gtk=1", () => {
    const url = loginUrl({ gtk: true });
    expect(url).toBe(`${API_BASE}/${API_VERSION}/login.awp?gtk=1&v=${DEFAULT_APP_VERSION}`);
  });

  it("returns login POST URL without gtk", () => {
    const url = loginUrl();
    expect(url).toBe(`${API_BASE}/${API_VERSION}/login.awp?v=${DEFAULT_APP_VERSION}`);
  });

  it("respects custom version", () => {
    const url = loginUrl({ version: "5.0.0" });
    expect(url).toBe(`${API_BASE}/${API_VERSION}/login.awp?v=5.0.0`);
  });
});

describe("probeUrl", () => {
  it("returns default probe URL", () => {
    const url = probeUrl();
    expect(url).toBe(`${API_BASE}/${API_VERSION}/rdt/sondages.awp?verbe=get&v=${DEFAULT_APP_VERSION}`);
  });

  it("respects custom version", () => {
    const url = probeUrl({ version: "5.0.0" });
    expect(url).toBe(`${API_BASE}/${API_VERSION}/rdt/sondages.awp?verbe=get&v=5.0.0`);
  });
});

describe("doubleAuthUrl", () => {
  it("returns the get endpoint", () => {
    const url = doubleAuthUrl({ verb: "get" });
    expect(url).toBe(`${API_BASE}/${API_VERSION}/connexion/doubleauth.awp?verbe=get&v=${DEFAULT_APP_VERSION}`);
  });

  it("returns the post endpoint", () => {
    const url = doubleAuthUrl({ verb: "post", version: "5.0.0" });
    expect(url).toBe(`${API_BASE}/${API_VERSION}/connexion/doubleauth.awp?verbe=post&v=5.0.0`);
  });
});

describe("familyMessagesUrl", () => {
  it("returns the default family messages endpoint", () => {
    const url = familyMessagesUrl(828);
    expect(url).toBe(
      `${API_BASE}/${API_VERSION}/familles/828/messages.awp?force=false&typeRecuperation=received&idClasseur=0&orderBy=date&order=desc&query=&onlyRead=&page=0&itemsPerPage=100&getAll=0&verbe=get&v=${DEFAULT_APP_VERSION}`,
    );
  });
});

describe("studentMessagesUrl", () => {
  it("returns the student messages endpoint with custom filters", () => {
    const url = studentMessagesUrl(1154, {
      mailbox: "archived",
      folderId: 12,
      query: "prof principal",
      page: 2,
      itemsPerPage: 20,
      version: "5.0.0",
    });
    expect(url).toBe(
      `${API_BASE}/${API_VERSION}/eleves/1154/messages.awp?force=false&typeRecuperation=archived&idClasseur=12&orderBy=date&order=desc&query=prof%20principal&onlyRead=&page=2&itemsPerPage=20&getAll=0&verbe=get&v=5.0.0`,
    );
  });
});

describe("studentNotesUrl", () => {
  it("returns the student notes endpoint", () => {
    const url = studentNotesUrl(1154);
    expect(url).toBe(
      `${API_BASE}/${API_VERSION}/eleves/1154/notes.awp?verbe=get&v=${DEFAULT_APP_VERSION}`,
    );
  });
});

describe("studentCahierDeTextesUrl", () => {
  it("returns the student homework endpoint", () => {
    const url = studentCahierDeTextesUrl(1154);
    expect(url).toBe(
      `${API_BASE}/${API_VERSION}/Eleves/1154/cahierdetexte.awp?verbe=get&v=${DEFAULT_APP_VERSION}`,
    );
  });
});

describe("studentVieScolaireUrl", () => {
  it("returns the student school life endpoint", () => {
    const url = studentVieScolaireUrl(1154);
    expect(url).toBe(
      `${API_BASE}/${API_VERSION}/eleves/1154/viescolaire.awp?verbe=get&v=${DEFAULT_APP_VERSION}`,
    );
  });
});

describe("classVieDeLaClasseUrl", () => {
  it("returns the class life endpoint", () => {
    const url = classVieDeLaClasseUrl(18);
    expect(url).toBe(
      `${API_BASE}/${API_VERSION}/Classes/18/viedelaclasse.awp?verbe=get&v=${DEFAULT_APP_VERSION}`,
    );
  });
});

describe("studentCarnetCorrespondanceUrl", () => {
  it("returns the carnet de correspondance endpoint", () => {
    const url = studentCarnetCorrespondanceUrl(1154);
    expect(url).toBe(
      `${API_BASE}/${API_VERSION}/eleves/1154/eleveCarnetCorrespondance.awp?verbe=get&v=${DEFAULT_APP_VERSION}`,
    );
  });
});

describe("studentSessionsRdvUrl", () => {
  it("returns the student sessions RDV endpoint", () => {
    const url = studentSessionsRdvUrl(1154);
    expect(url).toBe(
      `${API_BASE}/${API_VERSION}/E/1154/sessionsRdv.awp?verbe=get&v=${DEFAULT_APP_VERSION}`,
    );
  });
});

describe("studentEmploiDuTempsUrl", () => {
  it("returns the student timetable endpoint", () => {
    const url = studentEmploiDuTempsUrl(1154, { version: "5.0.0" });
    expect(url).toBe(
      `${API_BASE}/${API_VERSION}/E/1154/emploidutemps.awp?verbe=get&v=5.0.0`,
    );
  });
});
