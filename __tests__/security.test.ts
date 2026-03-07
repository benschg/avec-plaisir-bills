import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock requireRole to simulate auth states
const mockRequireRole = vi.fn();
vi.mock("@/lib/auth/role", () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

// Mock db
vi.mock("@/lib/db", () => ({
  db: { query: { invoices: { findMany: vi.fn(), findFirst: vi.fn() } } },
  invoices: {},
  vendors: {},
  customers: {},
  line_items: {},
  payment_info: {},
  additional_expenses: {},
}));

vi.mock("@/lib/db/schema", () => ({
  invoices: {},
  line_items: {},
  app_users: {},
  additional_expenses: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  uploadFile: vi.fn(),
  downloadFile: vi.fn(),
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn(),
}));

function json401() {
  return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), { status: 401 });
}

function makeRequest(method = "GET", body?: unknown) {
  const url = "http://localhost:3000/api/test";
  const init: RequestInit = { method };
  if (body) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const req = new Request(url, init);
  return Object.assign(req, { nextUrl: new URL(url) });
}

describe("Security: Authentication on API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/invoices - requires viewer role", () => {
    it("returns 401 when not authenticated", async () => {
      mockRequireRole.mockResolvedValue(json401());
      const { GET } = await import("@/app/api/invoices/route");
      const res = await GET();
      expect(res.status).toBe(401);
      expect(mockRequireRole).toHaveBeenCalledWith("viewer");
    });
  });

  describe("GET /api/invoices/[id] - requires viewer role", () => {
    it("returns 401 when not authenticated", async () => {
      mockRequireRole.mockResolvedValue(json401());
      const { GET } = await import("@/app/api/invoices/[id]/route");
      const res = await GET(makeRequest() as never, { params: Promise.resolve({ id: "test" }) });
      expect(res.status).toBe(401);
      expect(mockRequireRole).toHaveBeenCalledWith("viewer");
    });
  });

  describe("GET /api/invoices/[id]/pdf - requires viewer role", () => {
    it("returns 401 when not authenticated", async () => {
      mockRequireRole.mockResolvedValue(json401());
      const { GET } = await import("@/app/api/invoices/[id]/pdf/route");
      const res = await GET(makeRequest() as never, { params: Promise.resolve({ id: "test" }) });
      expect(res.status).toBe(401);
      expect(mockRequireRole).toHaveBeenCalledWith("viewer");
    });
  });

  describe("POST /api/invoices - requires editor role", () => {
    it("returns 401 when not authenticated", async () => {
      mockRequireRole.mockResolvedValue(json401());
      const { POST } = await import("@/app/api/invoices/route");
      const res = await POST(makeRequest("POST", {}) as never);
      expect(res.status).toBe(401);
      expect(mockRequireRole).toHaveBeenCalledWith("editor");
    });
  });

  describe("PATCH /api/invoices/[id] - requires editor role", () => {
    it("returns 401 when not authenticated", async () => {
      mockRequireRole.mockResolvedValue(json401());
      const { PATCH } = await import("@/app/api/invoices/[id]/route");
      const res = await PATCH(makeRequest("PATCH", {}) as never, { params: Promise.resolve({ id: "test" }) });
      expect(res.status).toBe(401);
      expect(mockRequireRole).toHaveBeenCalledWith("editor");
    });
  });

  describe("DELETE /api/invoices/[id] - requires editor role", () => {
    it("returns 401 when not authenticated", async () => {
      mockRequireRole.mockResolvedValue(json401());
      const { DELETE } = await import("@/app/api/invoices/[id]/route");
      const res = await DELETE(makeRequest("DELETE") as never, { params: Promise.resolve({ id: "test" }) });
      expect(res.status).toBe(401);
      expect(mockRequireRole).toHaveBeenCalledWith("editor");
    });
  });

  describe("POST /api/extract - requires editor role", () => {
    it("returns 401 when not authenticated", async () => {
      mockRequireRole.mockResolvedValue(json401());
      const { POST } = await import("@/app/api/extract/route");
      const res = await POST(makeRequest("POST", {}) as never);
      expect(res.status).toBe(401);
      expect(mockRequireRole).toHaveBeenCalledWith("editor");
    });
  });
});

describe("Security: Input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(null); // authenticated
  });

  describe("POST /api/admin/users - email validation", () => {
    it("rejects invalid email format", async () => {
      const { POST } = await import("@/app/api/admin/users/route");
      const res = await POST(makeRequest("POST", { email: "not-an-email", role: "viewer" }) as never);
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("rejects empty email", async () => {
      const { POST } = await import("@/app/api/admin/users/route");
      const res = await POST(makeRequest("POST", { email: "", role: "viewer" }) as never);
      expect(res.status).toBe(400);
    });

    it("rejects invalid role", async () => {
      const { POST } = await import("@/app/api/admin/users/route");
      const res = await POST(makeRequest("POST", { email: "test@example.com", role: "superadmin" }) as never);
      expect(res.status).toBe(400);
    });
  });
});

describe("Security: PDF file validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(null);
    vi.stubEnv("GEMINI_API_KEY", "test-key");
  });

  it("rejects non-PDF files on extract", async () => {
    const { POST } = await import("@/app/api/extract/route");
    const res = await POST(makeRequest("POST", { file: "notapdf", fileName: "test.txt" }) as never);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("PDF");
  });
});

describe("Security: Filename sanitization", () => {
  it("strips path traversal from upload filename", async () => {
    const { sanitizeFileName } = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("normal.pdf")).toBe("normal.pdf");
    expect(sanitizeFileName("path/to/file.pdf")).toBe("file.pdf");
    expect(sanitizeFileName("..\\..\\windows\\system32")).toBe("system32");
  });
});
