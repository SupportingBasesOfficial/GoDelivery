import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOrder, assignCourierToOrder, acceptOrder, cancelOrder, reassignCourierToOrder, getOrderTimeline, getOrderWithTimeline } from "./orders";

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

// Mock de notificações
vi.mock("./notifications", () => ({
  sendPushNotification: vi.fn(() => Promise.resolve({ ok: true, data: undefined, error: null })),
}));

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

  mockFrom.mockReturnValue({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { tenant_id: "tenant-123" }, error: null })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: "order-123" }, error: null })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
    order: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  });
});

describe("createOrder", () => {
  const validData = {
    customerName: "Cliente Teste",
    customerPhone: "+5511999999999",
    pickupAddress: "Rua A, 123",
    deliveryAddress: "Rua B, 456",
    orderValue: 100,
    deliveryFee: 10,
  };

  it("rejeita nome vazio", async () => {
    const result = await createOrder({ ...validData, customerName: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita telefone inválido", async () => {
    const result = await createOrder({ ...validData, customerPhone: "abc" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita valor negativo", async () => {
    const result = await createOrder({ ...validData, orderValue: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita taxa negativa", async () => {
    const result = await createOrder({ ...validData, deliveryFee: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("cria pedido com dados válidos", async () => {
    const result = await createOrder(validData);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.orderId).toBe("order-123");
    }
  });
});

describe("assignCourierToOrder", () => {
  it("rejeita orderId inválido", async () => {
    const result = await assignCourierToOrder("invalid", "550e8400-e29b-41d4-a716-446655440000");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("rejeita courierId inválido", async () => {
    const result = await assignCourierToOrder("550e8400-e29b-41d4-a716-446655440000", "invalid");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("atribui motoboy com IDs válidos", async () => {
    const result = await assignCourierToOrder(
      "550e8400-e29b-41d4-a716-446655440000",
      "550e8400-e29b-41d4-a716-446655440001",
    );
    expect(result.ok).toBe(true);
  });
});

describe("acceptOrder", () => {
  it("rejeita orderId inválido", async () => {
    const result = await acceptOrder("invalid");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("aceita pedido com ID válido", async () => {
    const result = await acceptOrder("550e8400-e29b-41d4-a716-446655440000");
    expect(result.ok).toBe(true);
  });
});

describe("cancelOrder", () => {
  it("rejeita orderId inválido", async () => {
    const result = await cancelOrder("invalid");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("cancela pedido com ID válido", async () => {
    const result = await cancelOrder("550e8400-e29b-41d4-a716-446655440000");
    expect(result.ok).toBe(true);
  });
});

describe("reassignCourierToOrder", () => {
  it("rejeita orderId inválido", async () => {
    const result = await reassignCourierToOrder("invalid", "550e8400-e29b-41d4-a716-446655440001");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("reatribui com IDs válidos", async () => {
    const result = await reassignCourierToOrder(
      "550e8400-e29b-41d4-a716-446655440000",
      "550e8400-e29b-41d4-a716-446655440001",
    );
    expect(result.ok).toBe(true);
  });
});

describe("getOrderTimeline", () => {
  it("rejeita orderId inválido", async () => {
    const result = await getOrderTimeline("invalid");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });

  it("busca timeline com ID válido", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    });

    const result = await getOrderTimeline("550e8400-e29b-41d4-a716-446655440000");
    expect(result.ok).toBe(true);
  });
});

describe("getOrderWithTimeline", () => {
  it("rejeita orderId inválido", async () => {
    const result = await getOrderWithTimeline("invalid");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation/invalid-input");
    }
  });
});
