import { createServer } from "node:http";

const port = Number(process.env.MOCK_BACKEND_PORT ?? 8765);

function freshState() {
  return {
    status: "started",
    phase: "candidate",
    transitioned: false,
    pixValidated: false,
    educationPresent: false,
    addressProof: null,
    classifyIsDocument: true,
    failNextProof: false,
    address: {
      zipcode: null,
      street: null,
      number: null,
      complement: null,
      neighborhood: null,
      city: null,
      state: null,
      missing_fields: ["zipcode", "street", "number", "city", "state"],
    },
    document: {
      doc_type: null,
      analysis_status: null,
      analysis_reason: null,
      missing_fields: ["doc_type"],
      next_slot: null,
      photos: {},
    },
    selfie: {
      taken_at: null,
      analysis_status: "pending",
      analysis_reason: null,
      hub_whatsapp: "5511920062177",
    },
  };
}

let state = freshState();

function json(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function candidateMe() {
  return {
    status: state.status,
    profile: {
      name: "Promotor E2E V7M",
      birth_date: "1990-01-01",
      mother_name: "Maria E2E",
      father_name: "José E2E",
      birthplace: "São Paulo/SP",
      marital_status: "solteiro",
      nationality: "brasileira",
      education_level: state.educationPresent ? "medio" : null,
      education_completed: state.educationPresent ? true : null,
    },
    address: state.address,
    address_proof: state.addressProof,
    documents: state.document.doc_type
      ? { [state.document.doc_type]: state.document }
      : {},
    selfie: state.selfie,
    pix_validated: state.pixValidated,
  };
}

function roles() {
  if (state.phase === "training") return ["training", "promoter"];
  if (state.phase === "promoter") return ["promoter"];
  return ["candidate"];
}

function handle(request, response) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const path = url.pathname;

  if (path === "/health") return json(response, 200, { ok: true });
  if (path === "/__reset" && request.method === "POST") {
    state = freshState();
    return json(response, 200, { ok: true });
  }
  if (path === "/__approve" && request.method === "POST") {
    state.phase = "training";
    return json(response, 200, { ok: true });
  }
  if (path === "/__classify" && request.method === "POST") {
    state.classifyIsDocument = url.searchParams.get("document") !== "0";
    return json(response, 200, { ok: true });
  }
  if (path === "/__fail-next-proof" && request.method === "POST") {
    state.failNextProof = true;
    return json(response, 200, { ok: true });
  }
  if (path === "/__stage" && request.method === "POST") {
    state.status = url.searchParams.get("status") ?? state.status;
    state.pixValidated = url.searchParams.get("pix") === "1";
    state.educationPresent = url.searchParams.get("education") === "1";
    if (["address", "documents", "pix", "education", "selfie"].includes(state.status)) {
      state.address = {
        zipcode: "01310100",
        street: "Avenida Paulista",
        number: "1000",
        complement: "",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        missing_fields: [],
      };
    }
    if (["pix", "education", "selfie"].includes(state.status)) {
      state.document = {
        doc_type: "rg",
        analysis_status: "pending",
        analysis_reason: null,
        missing_fields: [],
        front_photo: "/media/front.jpg",
        back_photo: "/media/back.jpg",
        next_slot: null,
        photos: {
          rg_front: { status: "pending" },
          rg_back: { status: "pending" },
        },
      };
      state.addressProof = {
        exists: true,
        photo: "/media/address-proof.jpg",
        status: "pending",
        reason: null,
        needs_kinship: false,
        kinship_relation: null,
      };
    }
    return json(response, 200, { ok: true });
  }

  if (path === "/api/v1/collaborators/auth/check" && request.method === "POST") {
    return json(response, 200, {
      found: true,
      external_id: "candidate-e2e",
      otp_sent: true,
      otp_wait: 1,
    });
  }
  if (path === "/api/v1/collaborators/auth/login" && request.method === "POST") {
    return json(response, 200, {
      access_token: "access-e2e",
      refresh_token: "refresh-e2e",
      token_type: "bearer",
    });
  }
  if (path === "/api/v1/collaborators/auth/join" && request.method === "POST") {
    return json(response, 200, {
      access_token: "access-e2e",
      refresh_token: "refresh-e2e",
      token_type: "bearer",
    });
  }
  if (path === "/api/v1/collaborators/auth/refresh" && request.method === "POST") {
    state.transitioned = true;
    return json(response, 200, {
      access_token: "access-promoted-e2e",
      refresh_token: "refresh-promoted-e2e",
    });
  }
  if (path === "/api/v1/collaborators/whoami") {
    return json(response, 200, {
      external_id: "candidate-e2e",
      roles: roles(),
      name: "Promotor E2E V7M",
    });
  }
  if (path === "/api/v1/collaborators/candidate/me") {
    return json(response, 200, candidateMe());
  }
  if (path === "/api/v1/collaborators/candidate/profile" && request.method === "POST") {
    state.status = "profile";
    return json(response, 200, candidateMe());
  }
  if (path === "/api/v1/collaborators/candidate/address") {
    if (request.method === "GET") return json(response, 200, state.address);
    if (request.method === "POST") {
      state.address = {
        zipcode: "01310100",
        street: "Avenida Paulista",
        number: null,
        complement: "",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        missing_fields: ["number"],
      };
      return json(response, 200, candidateMe());
    }
    if (request.method === "PATCH") {
      state.address.number = "1000";
      state.address.missing_fields = [];
      state.status = "address";
      return json(response, 200, candidateMe());
    }
  }
  if (path === "/api/v1/collaborators/candidate/document") {
    return json(response, 200, state.document);
  }
  if (
    path === "/api/v1/collaborators/candidate/documents/classify" &&
    request.method === "POST"
  ) {
    return json(response, 200, {
      is_document: state.classifyIsDocument,
      doc_type: state.classifyIsDocument ? "rg" : null,
      side: "front",
    });
  }
  if (
    path.startsWith("/api/v1/collaborators/candidate/documents/photo/") &&
    request.method === "POST"
  ) {
    const slot = path.split("/").at(-1);
    state.document.doc_type = slot.startsWith("cnh_") ? "cnh" : "rg";
    state.document.analysis_status = "pending";
    state.document.missing_fields = [];
    state.document.photos[slot] = { status: "pending" };
    if (slot.endsWith("_front")) state.document.front_photo = "/media/front.jpg";
    if (slot.endsWith("_back")) state.document.back_photo = "/media/back.jpg";
    if (slot.endsWith("_full")) state.document.full_photo = "/media/full.jpg";
    state.status = "documents";
    return json(response, 200, { accepted: true, poll_after_ms: 10 });
  }
  if (
    path === "/api/v1/collaborators/candidate/documents/address-proof" &&
    request.method === "POST"
  ) {
    if (state.failNextProof) {
      state.failNextProof = false;
      return json(response, 503, {
        detail: "Falha temporária ao armazenar o comprovante.",
        code: "UPLOAD_TEMPORARY_FAILURE",
      });
    }
    state.addressProof = {
      exists: true,
      photo: "/media/address-proof.jpg",
      status: "pending",
      reason: null,
      needs_kinship: false,
      kinship_relation: null,
    };
    return json(response, 200, candidateMe());
  }
  if (path === "/api/v1/collaborators/candidate/pix" && request.method === "POST") {
    state.pixValidated = true;
    state.status = "pix";
    return json(response, 200, candidateMe());
  }
  if (
    path === "/api/v1/collaborators/candidate/education" &&
    request.method === "POST"
  ) {
    state.educationPresent = true;
    state.status = "education";
    return json(response, 200, candidateMe());
  }
  if (path === "/api/v1/collaborators/candidate/selfie") {
    if (request.method === "GET") {
      if (state.phase === "training") {
        return json(
          response,
          state.transitioned ? 403 : 401,
          state.transitioned
            ? { detail: "Acesso negado para o seu papel.", code: "FORBIDDEN_ROLE" }
            : { detail: "Token desatualizado.", code: "UNAUTHORIZED" },
        );
      }
      return json(response, 200, state.selfie);
    }
    if (request.method === "POST") {
      state.selfie = {
        taken_at: "2026-07-21T12:00:00Z",
        analysis_status: "approved",
        analysis_reason: "Aprovada pelo adapter KYC sintético.",
        hub_whatsapp: "5511920062177",
      };
      state.status = "approved";
      state.phase = "training";
      state.transitioned = false;
      return json(response, 200, { accepted: true, poll_after_ms: 10 });
    }
  }
  if (path === "/api/v1/collaborators/training/materials") {
    return json(response, 200, [
      {
        material_external_id: "material-e2e",
        title: "Como indicar com clareza",
        blocking: true,
        kind: "text",
        question: "Como você explicaria a proposta para uma pessoa interessada?",
        text_content: "Explique o curso sem prometer aprovação ou emprego.",
        submission_status: state.phase === "promoter" ? "approved" : null,
      },
    ]);
  }
  if (
    path === "/api/v1/collaborators/training/submissions" &&
    request.method === "POST"
  ) {
    state.phase = "promoter";
    return json(response, 200, { accepted: true });
  }
  if (path === "/api/v1/collaborators/promoter/me") {
    return json(response, 200, {
      external_id: "promoter-e2e",
      hub_external_id: "hub-e2e",
      status: "active",
      ref_url: "https://job.v7m.org/?ref=e2e",
    });
  }
  if (path === "/api/v1/collaborators/promoter/me/summary") {
    return json(response, 200, {
      week_goal: 5,
      week_paid_leads: 1,
      week_commission_total: "100.00",
      bonus_amount: "500.00",
      goal_reached: false,
      next_closing_at: "2026-07-25T21:00:00Z",
      lifetime: { total_received: "100.00", total_students: 1, goals_hit: 0 },
    });
  }

  return json(response, 404, { detail: `Mock sem rota: ${path}`, code: "NOT_FOUND" });
}

const server = createServer((request, response) => {
  request.on("error", () => response.destroy());
  request.on("data", () => {});
  request.on("end", () => handle(request, response));
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`mock backend listening on http://127.0.0.1:${port}\n`);
});
