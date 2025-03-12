const request = require("supertest");
const mongoose = require("mongoose");
const { app, Supplier } = require("./server");

describe("Suppliers API Tests", () => {
  let supplierId;

  beforeAll(async () => {
    // Połącz się z bazą, jeśli nie jest jeszcze połączona
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        "mongodb+srv://regulam:regulam@cluster0.ay4yr.mongodb.net/warehouse-managment-system",
        { useNewUrlParser: true, useUnifiedTopology: true }
      );
    }
  });

  afterAll(async () => {
    // Usuwamy tylko testowe dane, aby nie wpływały na inne dane w bazie
    if (supplierId) {
      await Supplier.findByIdAndDelete(supplierId);
    }
    await mongoose.connection.close();
  });

  test("POST /api/suppliers - Powinno dodać nowego dostawcę", async () => {
    const supplierData = {
      supplierName: "Acme Supplies",
      address: "456 Market St",
      phoneNumber: "9876543210",
      email: "contact@acmesupplies.com",
      contactPerson: "Jane Doe",
      supplierType: "Wholesale"
    };

    const res = await request(app)
      .post("/api/suppliers")
      .send(supplierData);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Supplier added successfully");
    expect(res.body.supplier).toHaveProperty("_id");
    supplierId = res.body.supplier._id;  // Zapisujemy ID dostawcy, aby móc go usunąć
  });

  test("GET /api/suppliers - Powinno zwrócić listę dostawców", async () => {
    const res = await request(app).get("/api/suppliers");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test("GET /api/suppliers/total - Powinno zwrócić całkowitą liczbę dostawców", async () => {
    const res = await request(app).get("/api/suppliers/total");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("count");
    expect(typeof res.body.count).toBe("number");
  });

  test("GET /api/suppliers/:id - Powinno zwrócić szczegóły dostawcy", async () => {
    const res = await request(app).get(`/api/suppliers/${supplierId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("supplierName", "Acme Supplies");
  });

  test("PUT /api/suppliers/:id - Powinno zaktualizować dane dostawcy", async () => {
    const updateData = {
      address: "789 New St",
      contactPerson: "John Smith"
    };

    const res = await request(app)
      .put(`/api/suppliers/${supplierId}`)
      .send(updateData);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("address", "789 New St");
    expect(res.body).toHaveProperty("contactPerson", "John Smith");
  });

  test("DELETE /api/suppliers/:id - Powinno usunąć dostawcę", async () => {
    const res = await request(app).delete(`/api/suppliers/${supplierId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Supplier deleted successfully");
  });
});
