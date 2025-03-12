const request = require("supertest");
const mongoose = require("mongoose");
const { app, Selection, Supplier, Goods } = require("./server");

describe("Selection API Tests", () => {
  let supplierId, selectionId, goodsId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        "mongodb+srv://regulam:regulam@cluster0.ay4yr.mongodb.net/warehouse-managment-system",
        { useNewUrlParser: true, useUnifiedTopology: true }
      );
    }

    const supplier = await Supplier.create({
      supplierName: "Test Supplier",
      address: "123 Test St",
      phoneNumber: "123456789",
      email: "test@supplier.com",
      contactPerson: "John Doe",
      supplierType: "Wholesale"
    });
    supplierId = supplier._id;

    const goods = await Goods.create({
      supplierId,
      brandName: "TestBrand",
      itemName: "Test Item",
      itemsNOK: 5,
      itemsOK: 10,
      itemsToCheck: 15
    });
    goodsId = goods._id;
  });

  afterAll(async () => {
    if (selectionId) await Selection.findByIdAndDelete(selectionId);
    if (goodsId) await Goods.findByIdAndDelete(goodsId);
    if (supplierId) await Supplier.findByIdAndDelete(supplierId);
    await mongoose.connection.close();
  });

  test("POST /api/selection - Powinno dodać nową selekcję", async () => {
    const selectionData = { id: goodsId, quantityToSend: 5 };

    const res = await request(app).post("/api/selection").send(selectionData);
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Items added to selection successfully.");

    const selection = await Selection.findOne({ supplierId, itemName: "Test Item" });
    expect(selection).not.toBeNull();
    selectionId = selection._id.toString();
  });

  test("PUT /api/selection/:id - Powinno wystartować selekcję", async () => {
    expect(selectionId).not.toBeUndefined();

    const res = await request(app)
      .put(`/api/selection/${selectionId}`)
      .send({ itemsToCheck: 0, itemsNOK: 2, itemsOK: 3 });

    expect(res.statusCode).toBe(200);
    expect(res.body.itemsToCheck).toBe(0);
    expect(res.body.itemsOK).toBe(3);
    expect(res.body.itemsNOK).toBe(2);
  });

  test("PUT /api/selection/:id - Powinno odesłać towary na magazyn", async () => {
    expect(selectionId).not.toBeUndefined();

    const res = await request(app)
      .put(`/api/selection/${selectionId}`)
      .send({ itemsToCheck: 5, itemsNOK: 0, itemsOK: 0 });

    expect(res.statusCode).toBe(200);
    expect(res.body.itemsToCheck).toBe(5);
    expect(res.body.itemsOK).toBe(0);
    expect(res.body.itemsNOK).toBe(0);
  });
});
