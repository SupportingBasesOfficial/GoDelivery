import { describe, it, expect } from "vitest";
import {
  signUpSchema,
  signInSchema,
  createOrderSchema,
  createCourierSchema,
  tenantSettingsSchema,
  emailSchema,
  passwordSchema,
  phoneSchema,
  slugSchema,
  uuidSchema,
  routeFiltersSchema,
  reportDateRangeSchema,
  validate,
} from "./schemas";

describe("emailSchema", () => {
  it("aceita email válido", () => {
    expect(emailSchema.safeParse("test@example.com").success).toBe(true);
  });

  it("rejeita email inválido", () => {
    expect(emailSchema.safeParse("invalid").success).toBe(false);
  });

  it("rejeita email vazio", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("aceita senha válida", () => {
    expect(passwordSchema.safeParse("Password123").success).toBe(true);
  });

  it("rejeita senha curta", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
  });

  it("rejeita senha sem maiúscula", () => {
    expect(passwordSchema.safeParse("password123").success).toBe(false);
  });

  it("rejeita senha sem número", () => {
    expect(passwordSchema.safeParse("Password").success).toBe(false);
  });
});

describe("phoneSchema", () => {
  it("aceita telefone válido", () => {
    expect(phoneSchema.safeParse("+5511999999999").success).toBe(true);
  });

  it("rejeita telefone muito curto", () => {
    expect(phoneSchema.safeParse("123").success).toBe(false);
  });

  it("rejeita telefone com caracteres inválidos", () => {
    expect(phoneSchema.safeParse("abc").success).toBe(false);
  });
});

describe("slugSchema", () => {
  it("aceita slug válido", () => {
    expect(slugSchema.safeParse("minha-empresa").success).toBe(true);
  });

  it("rejeita slug com espaços", () => {
    expect(slugSchema.safeParse("minha empresa").success).toBe(false);
  });

  it("rejeita slug com maiúsculas", () => {
    expect(slugSchema.safeParse("Minha-Empresa").success).toBe(false);
  });

  it("rejeita slug que começa com número", () => {
    expect(slugSchema.safeParse("1empresa").success).toBe(false);
  });
});

describe("uuidSchema", () => {
  it("aceita UUID válido", () => {
    expect(uuidSchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true);
  });

  it("rejeita UUID inválido", () => {
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("signUpSchema", () => {
  const validData = {
    email: "test@example.com",
    password: "Password123",
    fullName: "Test User",
    tenantName: "Minha Empresa",
    tenantSlug: "minha-empresa",
    phone: "+5511999999999",
  };

  it("aceita dados válidos", () => {
    expect(signUpSchema.safeParse(validData).success).toBe(true);
  });

  it("rejeita email inválido", () => {
    expect(signUpSchema.safeParse({ ...validData, email: "invalid" }).success).toBe(false);
  });

  it("rejeita senha fraca", () => {
    expect(signUpSchema.safeParse({ ...validData, password: "123" }).success).toBe(false);
  });

  it("rejeita nome vazio", () => {
    expect(signUpSchema.safeParse({ ...validData, fullName: "" }).success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("aceita dados válidos", () => {
    expect(signInSchema.safeParse({ email: "test@example.com", password: "password" }).success).toBe(true);
  });

  it("rejeita email inválido", () => {
    expect(signInSchema.safeParse({ email: "invalid", password: "password" }).success).toBe(false);
  });

  it("rejeita senha vazia", () => {
    expect(signInSchema.safeParse({ email: "test@example.com", password: "" }).success).toBe(false);
  });
});

describe("createOrderSchema", () => {
  const validData = {
    customerName: "Cliente Teste",
    customerPhone: "+5511999999999",
    pickupAddress: "Rua A, 123",
    deliveryAddress: "Rua B, 456",
    orderValue: 100,
    deliveryFee: 10,
  };

  it("aceita dados válidos", () => {
    expect(createOrderSchema.safeParse(validData).success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    expect(createOrderSchema.safeParse({ ...validData, customerName: "" }).success).toBe(false);
  });

  it("rejeita valor negativo", () => {
    expect(createOrderSchema.safeParse({ ...validData, orderValue: -1 }).success).toBe(false);
  });

  it("rejeita taxa negativa", () => {
    expect(createOrderSchema.safeParse({ ...validData, deliveryFee: -1 }).success).toBe(false);
  });

  it("aceita coordenadas opcionais", () => {
    expect(
      createOrderSchema.safeParse({
        ...validData,
        pickupLat: -23.5,
        pickupLng: -46.6,
        deliveryLat: -23.6,
        deliveryLng: -46.7,
      }).success,
    ).toBe(true);
  });
});

describe("createCourierSchema", () => {
  const validData = {
    fullName: "Motoboy Teste",
    email: "motoboy@example.com",
    phone: "+5511999999999",
    password: "Password123",
    licenseNumber: "123456789",
    vehiclePlate: "ABC1234",
    vehicleType: "Moto",
  };

  it("aceita dados válidos", () => {
    expect(createCourierSchema.safeParse(validData).success).toBe(true);
  });

  it("rejeita CNH curta", () => {
    expect(createCourierSchema.safeParse({ ...validData, licenseNumber: "123" }).success).toBe(false);
  });

  it("rejeita placa curta", () => {
    expect(createCourierSchema.safeParse({ ...validData, vehiclePlate: "12" }).success).toBe(false);
  });
});

describe("tenantSettingsSchema", () => {
  it("aceita faixas válidas", () => {
    expect(
      tenantSettingsSchema.safeParse({
        feeRanges: [{ minKm: 0, maxKm: 3, fee: 5 }],
      }).success,
    ).toBe(true);
  });

  it("rejeita array vazio", () => {
    expect(tenantSettingsSchema.safeParse({ feeRanges: [] }).success).toBe(false);
  });

  it("rejeita taxa negativa", () => {
    expect(
      tenantSettingsSchema.safeParse({
        feeRanges: [{ minKm: 0, maxKm: 3, fee: -1 }],
      }).success,
    ).toBe(false);
  });
});

describe("routeFiltersSchema", () => {
  it("aceita filtros válidos", () => {
    expect(
      routeFiltersSchema.safeParse({
        courierId: "550e8400-e29b-41d4-a716-446655440000",
        fromDate: "2024-01-01",
        toDate: "2024-12-31",
      }).success,
    ).toBe(true);
  });

  it("rejeita data inválida", () => {
    expect(routeFiltersSchema.safeParse({ fromDate: "01-01-2024" }).success).toBe(false);
  });
});

describe("reportDateRangeSchema", () => {
  it("aceita datas válidas", () => {
    expect(reportDateRangeSchema.safeParse({ fromDate: "2024-01-01", toDate: "2024-12-31" }).success).toBe(true);
  });

  it("aceita objeto vazio", () => {
    expect(reportDateRangeSchema.safeParse({}).success).toBe(true);
  });

  it("rejeita formato de data inválido", () => {
    expect(reportDateRangeSchema.safeParse({ fromDate: "invalid" }).success).toBe(false);
  });
});

describe("validate helper", () => {
  it("retorna sucesso para dados válidos", () => {
    const result = validate(emailSchema, "test@example.com");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("test@example.com");
    }
  });

  it("retorna erros para dados inválidos", () => {
    const result = validate(emailSchema, "invalid");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});
