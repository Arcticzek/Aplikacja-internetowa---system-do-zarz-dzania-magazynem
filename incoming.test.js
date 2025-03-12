const request = require("supertest");
const mongoose = require("mongoose");
const { app, Incoming, Goods, Supplier } = require("./server");

describe("Incoming Goods API Tests", () => {
  let supplier, goods, incomingRecords;

  beforeAll(async () => {
    await mongoose.connect(
      "mongodb+srv://regulam:regulam@cluster0.ay4yr.mongodb.net/warehouse-managment-system",
      { useNewUrlParser: true, useUnifiedTopology: true }
    );
  });

  beforeEach(async () => {
    supplier = await Supplier.create({
      supplierName: "Test Supplier",
      supplierType: "Retail",
      contactPerson: "John Doe",
      email: "supplier@test.com",
      address: "123 Supplier St",
      phoneNumber: "123-456-789",
    });

    goods = await Goods.create({
      itemName: "Laptop",
      brandName: "TechBrand",
      itemsNOK: 0,
      itemsOK: 0,
      itemsToCheck: 10,
      supplierId: supplier._id,
    });

    incomingRecords = [];
  });

  afterEach(async () => {
    await Promise.all(incomingRecords.map(record => Incoming.deleteOne({ _id: record._id })));
    await Goods.deleteOne({ _id: goods._id });
    await Supplier.deleteOne({ _id: supplier._id });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("GET /api/incoming-goods - Powinno zwrócić listę dostaw z poprawnym itemName", async () => {
    const incoming = await Incoming.create({
      supplierId: supplier._id,
      goodsId: goods._id,
      quantity: 5,
    });
    incomingRecords.push(incoming);

    const res = await request(app).get("/api/incoming-goods");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const record = res.body.find(rec => rec._id.toString() === incoming._id.toString());
    expect(record).toBeDefined();
    expect(record).toHaveProperty("itemName", "Laptop");
  });

  test("POST /api/incoming-goods - Powinno dodać nową dostawę i usunąć ją po teście", async () => {
    const incomingData = {
      supplierId: supplier._id.toString(),
      itemId: goods._id.toString(),
      quantity: 3,
    };

    const res = await request(app)
      .post("/api/incoming-goods")
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send(incomingData);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Incoming goods added successfully.");
    expect(res.body.incoming).toHaveProperty("_id");

    incomingRecords.push(res.body.incoming);
  });

  test("POST /api/incoming-goods - Powinno zwrócić błąd przy niepoprawnych danych", async () => {
    const invalidData = {
      supplierId: supplier._id.toString(),
      itemId: goods._id.toString(),
      quantity: -5,
    };

    const res = await request(app)
      .post("/api/incoming-goods")
      .set("Accept", "application/json")
      .set("Content-Type", "application/json")
      .send(invalidData);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid data provided.");
  });

  test("DELETE /api/incoming-goods/:id - Powinno usunąć wpis dostawy", async () => {
    const incoming = await Incoming.create({
      supplierId: supplier._id,
      goodsId: goods._id,
      quantity: 2,
    });
    incomingRecords.push(incoming);

    const res = await request(app).delete(`/api/incoming-goods/${incoming._id.toString()}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Incoming goods entry deleted successfully");

    const resAfterDelete = await request(app).get("/api/incoming-goods");
    const deletedRecord = resAfterDelete.body.find(rec => rec._id.toString() === incoming._id.toString());
    expect(deletedRecord).toBeUndefined();
  });

  test("DELETE /api/incoming-goods/:id - Powinno zwrócić błąd, jeśli wpis nie istnieje", async () => {
    const incoming = await Incoming.create({
      supplierId: supplier._id,
      goodsId: goods._id,
      quantity: 2,
    });
    await Incoming.deleteOne({ _id: incoming._id });

    const res = await request(app).delete(`/api/incoming-goods/${incoming._id.toString()}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Incoming goods entry not found.");
  });
});
