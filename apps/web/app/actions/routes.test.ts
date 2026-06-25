import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRoutes, createRoute, addOrderToRoute, endRoute } from "./routes";

// Mock do Supabase
const mockFrom = vi.fn();
const mockAuth = {
  getUser: vi.fn(),
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
  };
});

// Mock do Next.js
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.getUser.mockResolvedValue({
    data: { user: { id: "user-123" } },
    error: null,
  });

  const profileSingle = vi.fn(() => Promise.resolve({ data: { tenant_id: "tenant-123" }, error: null }));

  mockFrom.mockImplementation((table: string) => {
    const commonEq = vi.fn(() => ({
      gte: vi.fn(() => ({
        lte: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      single: profileSingle,
    }));

    if (table === "profiles") {
      return {
        select: vi.fn(() => ({
          eq: commonEq,
        })),
      };
    }

    return {
      select: vi.fn(() => ({
        eq: commonEq,
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: "route-123" }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    };
  });
});

describe("getRoutes", () => {
  it("rejeita courierId inválido", async () => {
    const result = await getRoutes({ courierId: "invalid" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita formato de data inválido", async () => {
    const result = await getRoutes({ fromDate: "01-01-2024" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  // Nota: testes de sucesso de getRoutes requerem mock complexo do builder de query do Supabase
  // e são cobertos por testes de integração/E2E
});

describe("createRoute", () => {
  it("rejeita courierId inválido", async () => {
    const result = await createRoute("invalid");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });
});

describe("addOrderToRoute", () => {
  it("rejeita orderId inválido", async () => {
    const result = await addOrderToRoute("invalid", "550e8400-e29b-41d4-a716-446655440000");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita routeId inválido", async () => {
    const result = await addOrderToRoute("550e8400-e29b-41d4-a716-446655440000", "invalid");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("adiciona pedido com IDs válidos", async () => {
    const result = await addOrderToRoute(
      "550e8400-e29b-41d4-a716-446655440000",
      "550e8400-e29b-41d4-a716-446655440001",
    );
    expect(result.ok).toBe(true);
  });
});

describe("endRoute", () => {
  it("rejeita routeId inválido", async () => {
    const result = await endRoute("invalid");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("finaliza rota com ID válido", async () => {
    const result = await endRoute("550e8400-e29b-41d4-a716-446655440000");
    expect(result.ok).toBe(true);
  });
});
