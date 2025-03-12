const request = require("supertest");
const mongoose = require("mongoose");
const { app, Outgoing, Goods, Customer, Supplier } = require("./server");

describe("Outgoing Goods API Tests", () => {
  let testGoodsId;
  let testCustomerId;
  let testSupplierId;
  let testOutgoingId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        "mongodb+srv://regulam:regulam@cluster0.ay4yr.mongodb.net/warehouse-managment-system",
        { useNewUrlParser: true, useUnifiedTopology: true }
      );
    }

    // Tworzenie testowego klienta
    const customer = await Customer.create({
      customerName: "Test Customer",
      address: "Customer Street 1",
      phoneNumber: "555-1234",
    });
    testCustomerId = customer._id.toString();

    // Tworzenie testowego dostawcy
    const supplier = await Supplier.create({
      supplierName: "Test Supplier",
      address: "Supplier Street 2",
      phoneNumber: "555-5678",
      supplierType: "Electronics", // Wymagane pole
      contactPerson: "John Doe",   // Wymagane pole
      email: "supplier@example.com" // Wymagane pole
    });
    testSupplierId = supplier._id.toString();

    // Tworzenie testowego produktu
    const goods = await Goods.create({
      itemName: "Smartphone",
      brandName: "TechBrand",
      itemsOK: 10, // 10 gotowych sztuk
      itemsNOK: 5, // 5 wadliwych sztuk
    });
    testGoodsId = goods._id.toString();

    // Tworzenie testowego wpisu `Outgoing`
    const outgoing = await Outgoing.create({
      goodsId: testGoodsId,
      customerId: testCustomerId,
      quantity: 2,
    });
    testOutgoingId = outgoing._id.toString();
  });

  afterAll(async () => {
    try {
      // Usuwanie tylko testowych rekordów
      await Outgoing.deleteOne({ _id: testOutgoingId });
      await Goods.deleteOne({ _id: testGoodsId });
      await Customer.deleteOne({ _id: testCustomerId });
      await Supplier.deleteOne({ _id: testSupplierId });

      console.log("Testowe rekordy zostały usunięte.");
    } catch (error) {
      console.error("Błąd podczas usuwania testowych rekordów:", error);
    }

    // Zamknięcie połączenia z bazą danych
    await mongoose.connection.close();
  });

  test("GET /api/outgoing-goods - Powinno zwrócić listę wychodzących dostaw", async () => {
    const res = await request(app).get("/api/outgoing-goods");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.some(item => item._id === testOutgoingId)).toBeTruthy();
  });

  test("POST /api/outgoing-goods - Powinno dodać nowy wpis", async () => {
    const outgoingData = {
      goodsId: testGoodsId,
      customerId: testCustomerId,
      quantity: 3,
    };

    const res = await request(app).post("/api/outgoing-goods").send(outgoingData);
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Outgoing goods recorded successfully.");
    expect(res.body.outgoing).toHaveProperty("_id");

    // Usunięcie dodanego wpisu po teście
    await Outgoing.deleteOne({ _id: res.body.outgoing._id });
  });

  test("POST /api/outgoing-goods - Powinno zwrócić błąd, gdy ilość jest ujemna", async () => {
    const invalidData = {
      goodsId: testGoodsId,
      customerId: testCustomerId,
      quantity: -5,
    };

    const res = await request(app).post("/api/outgoing-goods").send(invalidData);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid data provided.");
  });

  test("POST /api/outgoing-goods - Powinno zwrócić błąd, gdy brakuje customerId i supplierId", async () => {
    const invalidData = {
      goodsId: testGoodsId,
      quantity: 2,
    };

    const res = await request(app).post("/api/outgoing-goods").send(invalidData);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Either customerId or supplierId must be provided.");
  });

  test("POST /api/outgoing-goods - Powinno zwrócić błąd, gdy brakuje towaru", async () => {
    const outgoingData = {
      goodsId: testGoodsId,
      customerId: testCustomerId,
      quantity: 20, // Więcej niż dostępna ilość
    };

    const res = await request(app).post("/api/outgoing-goods").send(outgoingData);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Insufficient itemsOK available.");
  });

  test("DELETE /api/outgoing-goods/:id - Powinno usunąć wpis", async () => {
    // Tworzenie testowego wpisu do usunięcia
    const outgoing = await Outgoing.create({
      goodsId: testGoodsId,
      customerId: testCustomerId,
      quantity: 1,
    });
    const outgoingId = outgoing._id.toString();

    const res = await request(app).delete(`/api/outgoing-goods/${outgoingId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Outgoing goods deleted successfully.");

    // Sprawdzenie, czy wpis został usunięty
    const resAfterDelete = await request(app).get("/api/outgoing-goods");
    expect(resAfterDelete.body.some(item => item._id === outgoingId)).toBeFalsy();
  });

  test("DELETE /api/outgoing-goods/:id - Powinno zwrócić błąd, jeśli wpis nie istnieje", async () => {
    // Najpierw usuwamy testowy wpis, aby sprawdzić reakcję na brak rekordu
    await Outgoing.deleteOne({ _id: testOutgoingId });

    const res = await request(app).delete(`/api/outgoing-goods/${testOutgoingId}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Outgoing goods not found.");
  });
});
