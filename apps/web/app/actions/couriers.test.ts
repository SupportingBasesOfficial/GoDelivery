import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCourier } from "./couriers";

// Mock do Supabase
const mockFrom = vi.fn();
const mockAuth = {
  getUser: vi.fn(),
};

const mockServerClient = {
  auth: mockAuth,
  from: mockFrom,
};

const mockAdminAuth = {
  admin: {
    createUser: vi.fn(),
    deleteUser: vi.fn(),
  },
};

const mockAdminClient = {
  auth: mockAdminAuth,
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

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.getUser.mockResolvedValue({
    data: { user: { id: "owner-123" } },
    error: null,
  });

  mockFrom.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { tenant_id: "tenant-123" }, error: null })),
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      };
    }
    if (table === "couriers") {
      return {
        insert: vi.fn(() => Promise.resolve({ error: null })),
      };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    };
  });

  mockAdminAuth.admin.createUser.mockResolvedValue({
    data: { user: { id: "courier-123" } },
    error: null,
  });
});

describe("createCourier", () => {
  const validData = {
    fullName: "Motoboy Teste",
    email: "courier@example.com",
    phone: "+5511987654321",
    password: "Senha123!",
    licenseNumber: "12345678901",
    vehiclePlate: "ABC1234",
    vehicleType: "motorcycle",
  };

  it("rejeita nome vazio", async () => {
    const result = await createCourier({ ...validData, fullName: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita email inválido", async () => {
    const result = await createCourier({ ...validData, email: "invalid" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita senha fraca", async () => {
    const result = await createCourier({ ...validData, password: "123" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita placa inválida", async () => {
    const result = await createCourier({ ...validData, vehiclePlate: "X" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita tipo de veículo vazio", async () => {
    const result = await createCourier({ ...validData, vehicleType: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita telefone inválido", async () => {
    const result = await createCourier({ ...validData, phone: "abc" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita CNH inválida", async () => {
    const result = await createCourier({ ...validData, licenseNumber: "123" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("cria motoboy com dados válidos", async () => {
    const result = await createCourier(validData);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.userId).toBe("courier-123");
    }
  });

  it("retorna erro quando criação de usuário falha", async () => {
    mockAdminAuth.admin.createUser.mockResolvedValue({
      data: null,
      error: { message: "Email já existe" },
    });

    const result = await createCourier(validData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("auth/signup-failed");
    }
  });
});
