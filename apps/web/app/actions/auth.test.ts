import { describe, it, expect, vi, beforeEach } from "vitest";
import { signUpBusinessOwner, signIn, signOut, getCurrentUser } from "./auth";

// Mock do rate-limit
vi.mock("../lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ allowed: true })),
}));

// Mock do Supabase
const mockAuthAdmin = {
  createUser: vi.fn(),
  deleteUser: vi.fn(),
};

const mockFrom = vi.fn();
const mockAuth = {
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
};

const mockAdminClient = {
  auth: { admin: mockAuthAdmin },
  from: mockFrom,
};

const mockServerClient = {
  auth: mockAuth,
  from: mockFrom,
};

vi.mock("@repo/supabase", async () => {
  const actual = await vi.importActual<typeof import("@repo/supabase")>("@repo/supabase");
  return {
    ...actual,
    createServerClient: vi.fn(() => Promise.resolve(mockServerClient)),
    createAdminClient: vi.fn(() => mockAdminClient),
  };
});

// Mock do Next.js
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    const error = new Error("NEXT_REDIRECT");
    (error as any).digest = "NEXT_REDIRECT";
    throw error;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: "tenant-123" }, error: null })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  });
});

describe("signUpBusinessOwner", () => {
  const validData = {
    email: "test@example.com",
    password: "Password123",
    fullName: "Test User",
    tenantName: "Minha Empresa",
    tenantSlug: "minha-empresa",
    phone: "+5511999999999",
  };

  it("rejeita email inválido", async () => {
    const result = await signUpBusinessOwner({ ...validData, email: "invalid" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita senha fraca", async () => {
    const result = await signUpBusinessOwner({ ...validData, password: "123" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita slug inválido", async () => {
    const result = await signUpBusinessOwner({ ...validData, tenantSlug: "Invalid Slug" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita telefone inválido", async () => {
    const result = await signUpBusinessOwner({ ...validData, phone: "abc" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("cria usuário com dados válidos", async () => {
    mockAuthAdmin.createUser.mockResolvedValue({
      data: { user: { id: "user-123", email: validData.email } },
      error: null,
    });

    const result = await signUpBusinessOwner(validData);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.userId).toBe("user-123");
    }
  });

  it("retorna erro quando criação de usuário falha", async () => {
    mockAuthAdmin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Email já existe" },
    });

    const result = await signUpBusinessOwner(validData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("auth/signup-failed");
    }
  });
});

describe("signIn", () => {
  it("rejeita email inválido", async () => {
    const result = await signIn({ email: "invalid", password: "Password123" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita senha vazia", async () => {
    const result = await signIn({ email: "test@example.com", password: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("faz login com dados válidos", async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });

    // redirect vai lançar, então esperamos isso
    await expect(signIn({ email: "test@example.com", password: "Password123" })).rejects.toThrow();
  });
});

describe("getCurrentUser", () => {
  it("retorna null quando não autenticado", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: { message: "Não autenticado" } });

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("retorna usuário quando autenticado", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() =>
          Promise.resolve({
            data: { role: "business_owner", tenant_id: "tenant-123", full_name: "Test User" },
            error: null,
          }),
        ),
      })),
    }));

    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await getCurrentUser();
    expect(result).not.toBeNull();
    expect(result?.id).toBe("user-123");
    expect(result?.email).toBe("test@example.com");
    expect(result?.role).toBe("business_owner");
  });
});
