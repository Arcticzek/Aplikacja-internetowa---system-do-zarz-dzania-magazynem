const request = require("supertest");
const mongoose = require("mongoose");
const { app, Goods, Supplier } = require("./server");

describe("Goods API Tests", () => {
  let testGoodsId;
  let testSupplierId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        "mongodb+srv://regulam:regulam@cluster0.ay4yr.mongodb.net/warehouse-managment-system",
        { useNewUrlParser: true, useUnifiedTopology: true }
      );
    }

    console.log("🔄 Creating test supplier...");
    const supplier = await Supplier.create({
      supplierName: "TestBrand",
      supplierType: "Retail",
      contactPerson: "John Doe",
      email: "supplier@test.com",
      address: "123 Supplier St"
    });
    testSupplierId = supplier._id.toString();

    console.log("🔄 Creating test goods...");
    const goods = await Goods.create({
      itemName: "Laptop",
      brandName: "TestBrand",
      itemsNOK: 0,
      itemsOK: 0,
      itemsToCheck: 10,
      supplierId: testSupplierId,
    });
    testGoodsId = goods._id.toString();
  });

  afterAll(async () => {
    console.log("🗑️ Cleaning up only test data...");

    // Usuwanie tylko testowych rekordów
    await Goods.findByIdAndDelete(testGoodsId);
    await Supplier.findByIdAndDelete(testSupplierId);
    
    await mongoose.connection.close();
    console.log("✅ Cleanup done!");
  });

  test("GET /api/goods - Powinno zwrócić listę towarów", async () => {
    const res = await request(app).get("/api/goods");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test("GET /api/goods/:id - Powinno zwrócić towar po ID", async () => {
    const res = await request(app).get(`/api/goods/${testGoodsId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("itemName", "Laptop");
  });

  test("GET /api/goods/itemName/:itemName - Powinno zwrócić towar po nazwie", async () => {
    const res = await request(app).get("/api/goods/itemName/Laptop");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("brandName", "TestBrand");
  });

  test("PUT /api/goods/:id - Powinno zaktualizować dane towaru", async () => {
    const negativeUpdate = { itemsOK: -5 };
    const resNeg = await request(app)
      .put(`/api/goods/${testGoodsId}`)
      .send(negativeUpdate);
    expect(resNeg.statusCode).toBe(400);
    expect(resNeg.body.message).toBe("Items values cannot be negative.");

    const updateData = {
      itemName: "Gaming Laptop",
      itemsOK: 5,
      itemsNOK: 1,
      itemsToCheck: 6
    };
    const res = await request(app)
      .put(`/api/goods/${testGoodsId}`)
      .send(updateData);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("itemName", "Gaming Laptop");
    expect(res.body).toHaveProperty("itemsOK", 5);
  });

  test("DELETE /api/goods/:id - Powinno usunąć towar", async () => {
    const res = await request(app).delete(`/api/goods/${testGoodsId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Goods deleted successfully");

    const resAfterDelete = await request(app).get(`/api/goods/${testGoodsId}`);
    expect(resAfterDelete.statusCode).toBe(404);
  });

  test("POST /api/goods - Powinno dodać nowy towar", async () => {
    const goodsData = {
      itemName: "Smartphone",
      brandName: "TestBrand",
      itemsToCheck: 20
    };

    const res = await request(app)
      .post("/api/goods")
      .send(goodsData);
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Goods added successfully!");
    expect(res.body.goods).toHaveProperty("_id");
    expect(res.body.goods).toHaveProperty("supplierId", testSupplierId.toString());

    // Usuwamy testowy wpis
    await Goods.findByIdAndDelete(res.body.goods._id);
  });
});
