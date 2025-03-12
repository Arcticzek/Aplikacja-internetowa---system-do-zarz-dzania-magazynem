const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { app, User } = require("./server");

describe("Server API Tests", () => {
  let adminToken;
  let userToken;
  let addedUserId;
  let testUserId;
  let testUserData = [];

  beforeAll(async () => {
    // Połącz się z bazą, jeśli jeszcze nie jest połączona
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        "mongodb+srv://regulam:regulam@cluster0.ay4yr.mongodb.net/warehouse-managment-system",
        { useNewUrlParser: true, useUnifiedTopology: true }
      );
    }

    // Usuń testowych użytkowników (upewnij się, że nie kolidują z danymi produkcyjnymi)
    await User.deleteMany({
      login: { $in: ["testuser", "adminuser", "newuser", "todelete", "faildelete"] },
    });

    // Utwórz użytkownika testowego (zwykłego)
    const hashedPasswordUser = await bcrypt.hash("Test1234!", 10);
    const testUser = await User.create({
      login: "testuser",
      password: hashedPasswordUser,
      email: "testuser@example.com",
      phone: 123456789,
      fullname: "Test User",
      usergroup: "user",
      address: "Test Address",
    });
    testUserId = testUser._id.toString();
    testUserData.push(testUser);  // Dodajemy testowego użytkownika do listy do usunięcia po testach

    // Utwórz użytkownika admina (usergroup musi być dokładnie "Admin")
    const hashedPasswordAdmin = await bcrypt.hash("Admin1234!", 10);
    await User.create({
      login: "adminuser",
      password: hashedPasswordAdmin,
      email: "admin@example.com",
      phone: 987654321,
      fullname: "Admin User",
      usergroup: "Admin",
      address: "Admin Address",
    });

    // Zaloguj testowego użytkownika
    const resUser = await request(app).post("/login").send({
      login: "testuser",
      password: "Test1234!",
    });
    userToken = resUser.body.token;

    // Zaloguj admina
    const resAdmin = await request(app).post("/login").send({
      login: "adminuser",
      password: "Admin1234!",
    });
    adminToken = resAdmin.body.token;
  });

  afterAll(async () => {
    try {
      // Sprawdzenie, czy testowi użytkownicy istnieją
      const usersToDelete = await User.find({
        login: { $in: ["testuser", "adminuser", "newuser", "todelete", "faildelete"] },
      });
  
      // Logowanie przed usunięciem
      console.log("Usuwanie testowych użytkowników...");
      usersToDelete.forEach(user => {
        console.log(`Usuwam użytkownika: ${user.login}`);
      });
  
      // Usunięcie użytkowników
      await User.deleteMany({
        login: { $in: ["testuser", "adminuser", "newuser", "todelete", "faildelete"] },
      });
  
      console.log("Użytkownicy zostali usunięci.");
  
    } catch (error) {
      console.error("Błąd podczas usuwania użytkowników: ", error);
    }
  
    // Zamknięcie połączenia z bazą
    await mongoose.connection.close();
  });
  

  test("GET / - Powinno zwrócić stronę logowania (HTML)", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.header["content-type"]).toMatch(/html/);
  });

  test("POST /login - Powinno zwrócić token przy poprawnych danych", async () => {
    const res = await request(app).post("/login").send({
      login: "testuser",
      password: "Test1234!",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("token");
    expect(res.body.message).toBe("Successfully logged in!");
  });

  test("POST /login - Powinno zwrócić błąd przy niepoprawnym loginie", async () => {
    const res = await request(app).post("/login").send({
      login: "wronguser",
      password: "Test1234!",
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid login or password!");
  });

  test("POST /login - Powinno zwrócić błąd przy niepoprawnym haśle", async () => {
    const res = await request(app).post("/login").send({
      login: "testuser",
      password: "wrongpassword",
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid login or password!");
  });

  test("GET /api/user-details - Powinno zwrócić dane użytkownika przy ważnym tokenie", async () => {
    const res = await request(app)
      .get("/api/user-details")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("login", "testuser");
    expect(res.body).not.toHaveProperty("password");
  });

  test("GET /dashboard - Powinno zwrócić stronę dashboard (HTML)", async () => {
    const res = await request(app).get("/dashboard");
    expect(res.statusCode).toBe(200);
    expect(res.header["content-type"]).toMatch(/html/);
  });

  test("GET /master_user - Powinno zwrócić stronę master user (HTML)", async () => {
    const res = await request(app).get("/master_user");
    expect(res.statusCode).toBe(200);
    expect(res.header["content-type"]).toMatch(/html/);
  });

  test("GET /get-users - Powinno zwrócić listę użytkowników", async () => {
    const res = await request(app).get("/get-users");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Powinny być przynajmniej 2 osoby (testuser i adminuser)
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  test("GET /get-user/:id - Powinno zwrócić konkretnego użytkownika", async () => {
    const res = await request(app).get(`/get-user/${testUserId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("login", "testuser");
  });

  test("POST /add-user - Powinno dodać nowego użytkownika", async () => {
    const newUserData = {
      login: "newuser",
      password: "NewUser123!",
      email: "newuser@example.com",
      phone: "555666777",
      fullname: "New User",
      usergroup: "user",
      address: "New Address",
    };
    const res = await request(app).post("/add-user").send(newUserData);
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("User added successfully");
    expect(res.body.user).toHaveProperty("_id");
    addedUserId = res.body.user._id;
  });

  test("PUT /update-user/:id - Powinno zaktualizować dane użytkownika", async () => {
    const updateData = {
      fullname: "Updated New User",
      email: "updatednewuser@example.com",
    };
    const res = await request(app)
      .put(`/update-user/${addedUserId}`)
      .send(updateData);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("User updated successfully");
    expect(res.body.user).toHaveProperty("fullname", "Updated New User");
  });

  test("DELETE /delete-user/:id - Powinno usunąć użytkownika (tylko admin)", async () => {
    // Najpierw utwórz użytkownika do usunięcia
    const userToDelete = await User.create({
      login: "todelete",
      password: await bcrypt.hash("DeleteMe123!", 10),
      email: "delete@example.com",
      phone: 999888777,
      fullname: "User To Delete",
      usergroup: "user",
      address: "Delete Address",
    });
    const res = await request(app)
      .delete(`/delete-user/${userToDelete._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ login: "adminuser", password: "Admin1234!" });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("User deleted successfully.");
  });

  test("DELETE /delete-user/:id - Powinno zwrócić błąd przy próbie usunięcia przez zwykłego użytkownika", async () => {
    // Utwórz użytkownika do usunięcia
    const userToDelete = await User.create({
      login: "faildelete",
      password: await bcrypt.hash("DeleteFail123!", 10),
      email: "faildelete@example.com",
      phone: 777888999,
      fullname: "User Fail Delete",
      usergroup: "user",
      address: "Fail Delete Address",
    });
    const res = await request(app)
      .delete(`/delete-user/${userToDelete._id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ login: "testuser", password: "Test1234!" });
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("You must be an admin to delete a user.");
  });
});
