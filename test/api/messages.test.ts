import { describe, expect, it } from "vitest";
import { ApiCode, type RawApiResponse } from "../../src/ecoledirecte/api/normalize.js";
import {
  normalizeMessageDetailResponse,
  normalizeMessagesResponse,
} from "../../src/ecoledirecte/api/messages.js";

describe("normalizeMessagesResponse", () => {
  it("normalizes folders, settings, pagination, and message summaries", () => {
    const raw: RawApiResponse = {
      code: ApiCode.OK,
      token: "",
      message: "",
      data: {
        classeurs: [{ id: 9, libelle: "Parents profs" }],
        parametrage: {
          isActif: "1",
          canParentsLireMessagesEnfants: "1",
          disabledNotification: "0",
          notificationEmailEtablissement: "1",
          destProf: "1",
          destEleve: "0",
        },
        pagination: {
          messagesRecusCount: 4,
          messagesRecusNotReadCount: 1,
          messagesDraftCount: 2,
          lastPageLoaded: { "-1": 0 },
        },
        messages: {
          received: [
            {
              id: 101,
              read: false,
              subject: "Réunion parents-professeurs",
              content: "PGgxPkJvbmpvdXI8L2gxPg==",
              date: "2026-03-11 18:00",
              transferred: false,
              answered: true,
              idClasseur: 0,
              idDossier: -1,
              responseId: 55,
              from: {
                id: 77,
                role: "P",
                civilite: "Mme",
                prenom: "Anne",
                nom: "ROUDIER-BOIVIN",
              },
              to: [
                {
                  id: 1154,
                  role: "E",
                  prenom: "Antonin",
                  nom: "BOIVIN",
                  libelleClasse: "3B",
                },
              ],
              files: [{ id: 7, libelle: "convocation.pdf", unc: "abc123" }],
            },
          ],
        },
      },
    };

    const result = normalizeMessagesResponse(raw, "received");

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      folders: [{ id: 9, label: "Parents profs", isCustom: true }],
      settings: {
        active: true,
        canParentsReadStudentMessages: true,
        notificationsDisabled: false,
        notifyByEmail: true,
        recipients: {
          admin: undefined,
          students: false,
          families: undefined,
          teachers: true,
          workplaces: undefined,
          enterprises: undefined,
        },
      },
      pagination: {
        messagesReceivedCount: 4,
        messagesUnreadCount: 1,
        messagesDraftCount: 2,
        lastPageLoaded: { "-1": 0 },
      },
      messages: [
        {
          id: 101,
          mailbox: "received",
          read: false,
          subject: "Réunion parents-professeurs",
          date: "2026-03-11 18:00",
          draft: false,
          transferred: false,
          answered: true,
          folderId: 0,
          dossierId: -1,
          responseId: 55,
          from: {
            id: 77,
            role: "P",
            name: "Mme Anne ROUDIER-BOIVIN",
          },
          to: [
            {
              id: 1154,
              role: "E",
              name: "Antonin BOIVIN",
              className: "3B",
            },
          ],
          attachmentCount: 1,
          attachments: [{ id: 7, name: "convocation.pdf", unc: "abc123" }],
          hasContent: true,
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

    const result = normalizeMessagesResponse(raw, "received");

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Session expirée");
  });

  it("normalizes a family message detail payload and decodes its content", () => {
    const raw: RawApiResponse = {
      code: ApiCode.OK,
      token: "",
      message: "",
      data: {
        id: 18213,
        responseId: 0,
        forwardId: 0,
        mtype: "received",
        read: true,
        idDossier: -1,
        idClasseur: 0,
        transferred: false,
        answered: false,
        brouillon: false,
        canAnswer: true,
        subject: "Re rappel.",
        content: "PGRpdj5Cb25qb3VyPC9kaXY+",
        date: "2026-03-11 06:12:59",
        to: [],
        files: [{ id: 9, libelle: "convocation.pdf", unc: "file-9" }],
        from: {
          nom: "JOSEPH",
          prenom: "C.",
          particule: "",
          civilite: "Mme",
          role: "P",
          id: 16,
          read: true,
          fonctionPersonnel: "",
        },
      },
    };

    const result = normalizeMessageDetailResponse(raw);

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      id: 18213,
      mailbox: "received",
      read: true,
      subject: "Re rappel.",
      contentHtml: "<div>Bonjour</div>",
      date: "2026-03-11 06:12:59",
      draft: false,
      transferred: false,
      answered: false,
      canAnswer: true,
      folderId: 0,
      dossierId: -1,
      responseId: 0,
      forwardId: 0,
      from: {
        id: 16,
        role: "P",
        name: "Mme C. JOSEPH",
        read: true,
      },
      to: [],
      attachmentCount: 1,
      attachments: [{ id: 9, name: "convocation.pdf", unc: "file-9" }],
    });
  });
});