const request = require("supertest");
const mongoose = require("mongoose");
const { app, Customer } = require("./server");

describe("Customers API Tests", () => {
  let customerId;

  beforeAll(async () => {
    // Połącz się z bazą, jeśli nie jest jeszcze połączona
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        "mongodb+srv://regulam:regulam@cluster0.ay4yr.mongodb.net/warehouse-managment-system",
        { useNewUrlParser: true, useUnifiedTopology: true }
      );
    }
    // Nie wyczyszczamy całej bazy, tylko usuwamy dane testowe
    await Customer.deleteMany({});
  });

  afterAll(async () => {
    // Zamiast dropDatabase(), usuwamy tylko testowe rekordy
    if (customerId) {
      await Customer.findByIdAndDelete(customerId);
    }
    await mongoose.connection.close();
  });

  test("POST /api/customers - Powinno dodać nowego klienta", async () => {
    const customerData = {
      customerName: "Acme Corp",
      address: "123 Main St",
      email: "contact@acme.com",
      phoneNumber: "1234567890",
      contactPerson: "John Doe",
      customerType: "Corporate"
    };

    const res = await request(app)
      .post("/api/customers")
      .send(customerData);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Customer added successfully");
    expect(res.body.customer).toHaveProperty("_id");
    customerId = res.body.customer._id;
  });

  test("GET /api/customers - Powinno zwrócić listę klientów", async () => {
    const res = await request(app).get("/api/customers");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test("GET /api/customers/total - Powinno zwrócić całkowitą liczbę klientów", async () => {
    const res = await request(app).get("/api/customers/total");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("count");
    expect(typeof res.body.count).toBe("number");
  });

  test("GET /api/customers/:id - Powinno zwrócić szczegóły klienta", async () => {
    const res = await request(app).get(`/api/customers/${customerId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("customerName", "Acme Corp");
  });

  test("PUT /api/customers/:id - Powinno zaktualizować dane klienta", async () => {
    const updateData = {
      address: "456 Elm St",
      contactPerson: "Jane Smith"
    };

    const res = await request(app)
      .put(`/api/customers/${customerId}`)
      .send(updateData);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("address", "456 Elm St");
    expect(res.body).toHaveProperty("contactPerson", "Jane Smith");
  });

  test("DELETE /api/customers/:id - Powinno usunąć klienta", async () => {
    const res = await request(app).delete(`/api/customers/${customerId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Customer deleted successfully");
  });
});
