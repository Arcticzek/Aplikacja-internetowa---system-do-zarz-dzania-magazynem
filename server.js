const express = require("express");
const bcrypt = require('bcrypt');
const path = require("path");
const bodyParser = require("body-parser");
const jwt = require('jsonwebtoken');
const app = express();
const PORT = 3000;



// Zwiększenie limitu danych w JSON
app.use(express.json({ limit: '50mb' })); // Możesz dostosować limit (np. '100mb')

// Zwiększenie limitu danych w URL-encoded
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Połączenie z MongoDB
const mongoose = require("mongoose");
mongoose
  .connect(
    "mongodb+srv://regulam:regulam@cluster0.ay4yr.mongodb.net/warehouse-managment-system",
 
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Schemat i model użytkownika
const userSchema = new mongoose.Schema({
  login: String,
  password: String,
  email: String,
  phone: Number,
  fullname: String,
  usergroup: String,
  address: String,
}, { timestamps: true }); // Dodaje pola createdAt i updatedAt
const User = mongoose.model("User", userSchema);

// Middleware
app.use(bodyParser.urlencoded({ extended: true })); // Obsługa formularzy
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Statyczne pliki (HTML, CSS, JS)



// Middleware do uwierzytelniania
function authenticateUser(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    try {
        const decoded = jwt.verify(token, '0Kc549HQ4iZ691RKj50hewjU5OdcdmF1QOFjq9dEz0kkWaKBa1OYojdYm8pLJQ7O'); // Użyj swojego klucza
        req.user = decoded; // Przypisz dane użytkownika do req.user
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
}

// Endpoint: Strona logowania (domyślna)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});


// Endpoint: Obsługa logowania


app.post("/login", async (req, res) => {
  const { login, password } = req.body;
  try {
      // Znajdź użytkownika po loginie
      const user = await User.findOne({ login });
      if (!user) {
          return res.status(401).json({ success: false, message: "Invalid login or password!" });
      }

      // Porównaj podane hasło z zahashowanym hasłem w bazie danych
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
          return res.status(401).json({ success: false, message: "Invalid login or password!" });
      }

      
      const token = jwt.sign(
          { id: user._id, usergroup: user.usergroup },
          "0Kc549HQ4iZ691RKj50hewjU5OdcdmF1QOFjq9dEz0kkWaKBa1OYojdYm8pLJQ7O",
          { expiresIn: "1h" }
      );

      return res.status(200).json({
          success: true,
          message: "Successfully logged in!",
          token,
          usergroup: user.usergroup,
      });
  } catch (err) {
      console.error("Error during login:", err);
      return res.status(500).json({ success: false, message: "Internal server error!" });
  }
});



app.get('/api/user-details', authenticateUser, async (req, res) => {
  try {
      const user = await User.findById(req.user.id).select('-password'); // Wyklucz hasło
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
  } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
  }
});


// Endpoint: Dashboard
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

// Endpoint: Master User
app.get("/master_user", (req, res) => {
  res.sendFile(path.join(__dirname, "master_user.html"));
});

// Endpoint: Pobieranie użytkowników
app.get("/get-users", async (req, res) => {
  try {
    const users = await User.find(); // Pobierz wszystkich użytkowników z bazy
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).send("Internal server error");
  }
});

app.get('/get-user/:id', async (req, res) => {
  try {
      const user = await User.findById(req.params.id);
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
  } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});



// Endpoint: Usuwanie użytkownika
// Endpoint: Usuwanie użytkownika
app.delete("/delete-user/:id", authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { login, password } = req.body;

  try {
      // Znajdź użytkownika, który ma być usunięty
      const userToDelete = await User.findById(id);
      if (!userToDelete) {
          return res.status(404).json({ message: "User not found." });
      }

      // Sprawdź, czy zalogowany użytkownik jest adminem
      const loggedInUser = await User.findById(req.user.id);
      if (!loggedInUser || loggedInUser.usergroup !== "Admin") {
          return res.status(403).json({ message: "You must be an admin to delete a user." });
      }

      // Znajdź użytkownika z loginem admina
      const adminUser = await User.findOne({ login });
      if (!adminUser) {
          return res.status(401).json({ message: "Admin not found with the provided login." });
      }

      // Porównanie hasła
      const isPasswordValid = await bcrypt.compare(password, adminUser.password);
      if (!isPasswordValid) {
          return res.status(401).json({ message: "Invalid admin credentials. You have been logged out." });
      }

      // Usuń użytkownika
      await User.findByIdAndDelete(id);

      return res.status(200).json({ message: "User deleted successfully." });
  } catch (err) {
      console.error("Error deleting user:", err);
      return res.status(500).json({ message: "Internal server error." });
  }
});









// Endpoint: Dodawanie użytkownika
app.post("/add-user", async (req, res) => {
  const { login, password, email, phone, fullname, usergroup, address } = req.body;

  // Sprawdzenie wymaganych pól
  const missingFields = [];
  if (!login || login.trim() === "") missingFields.push("Login");
  if (!password || password.trim() === "") missingFields.push("Password");
  if (!email || email.trim() === "") missingFields.push("Email");
  if (!fullname || fullname.trim() === "") missingFields.push("Full Name");
  if (!address || address.trim() === "") missingFields.push("Address");
  if (!phone || phone.trim() === "") missingFields.push("Phone Number");
  // Jeśli są brakujące pola, zwróć odpowiedź z błędem
  if (missingFields.length > 0) {
    return res.status(400).json({
      message: `The following fields are required and cannot be empty: ${missingFields.join(", ")}`,
      missingFields,
    });
  }

  // Walidacja formatu numeru telefonu
  const phoneRegex = /^\d+$/; // Tylko cyfry
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      message: "Phone number must contain only numeric characters.",
    });
  }

  // Walidacja formatu e-maila
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Podstawowa walidacja e-maila
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      message: "Invalid email format. Email must contain '@' and a valid domain.",
    });
  }

  try {
    // Sprawdzenie, czy użytkownik już istnieje (unikatowość loginu, e-maila lub telefonu)
    const existingUser = await User.findOne({
      $or: [{ login }, { email }, { phone }],
    });

    if (existingUser) {
      const duplicateFields = [];
      if (existingUser.login === login) duplicateFields.push("Login");
      if (existingUser.email === email) duplicateFields.push("Email");
      if (existingUser.phone === phone) duplicateFields.push("Phone Number");

      return res.status(400).json({
        message: `User already exists with the same ${duplicateFields.join(", ")}.`,
        duplicateFields,
      });
    }
 // Hashowanie hasła
 
 const hashedPassword = await bcrypt.hash(password, 10);
    // Tworzenie nowego użytkownika
    const newUser = new User({
      login,
      password: hashedPassword, // Zapis hasła jako hash
      email,
      phone,
      fullname,
      usergroup,
      address,
    });

    await newUser.save(); // Zapis do bazy danych
    res.status(201).json({ message: "User added successfully", user: newUser });
  } catch (err) {
    // Obsługa błędów w zależności od ich rodzaju
    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error occurred.",
        error: err.errors,
      });
    }

    console.error("Error adding user:", err);
    res.status(500).json({
      message: "Internal server error occurred while adding the user.",
      error: err.message,
    });
  }
});





app.put('/update-user/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
      return res.status(400).json({ message: 'User ID is missing in request' });
  }

  const updatedData = req.body;

  try {
      const updatedUser = await User.findByIdAndUpdate(
          id,
          updatedData,
          { new: true, runValidators: true }
      );

      if (!updatedUser) {
          return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (err) {
      console.error('Error updating user:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});


// Definicja schematu i modelu dla kolekcji suppliers
// Definicja schematu i modelu dla kolekcji suppliers
// Definicja schematu i modelu dla kolekcji suppliers
const SupplierSchema = new mongoose.Schema({
  supplierName: { type: String, required: true },
  address: { type: String, required: true },
  phoneNumber: { type: String },
  email: { type: String, required: true },
  contactPerson: { type: String, required: true },
  supplierType: { type: String, required: true },
}, { timestamps: true });

const Supplier = mongoose.model('Supplier', SupplierSchema);



// Endpoint do pobierania danych dostawców
app.get('/api/suppliers', async (req, res) => {
  try {
      const suppliers = await Supplier.find();
      res.json(suppliers);
  } catch (error) {
      res.status(500).json({ message: 'Error fetching suppliers', error });
  }
});

//zliczanie 
app.get('/api/suppliers/total', async (req, res) => {
  try {
      const totalSuppliers = await Supplier.countDocuments();
      console.log(`Total suppliers: ${totalSuppliers}`);
      res.status(200).json({ count: totalSuppliers });
  } catch (error) {
      console.error('Error counting suppliers:', error.message);
      res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

app.get('/api/suppliers/:id', async (req, res) => {
  try {
      const supplier = await Supplier.findById(req.params.id);
      if (!supplier) {
          return res.status(404).json({ message: 'Supplier not found' });
      }
      res.json(supplier);
  } catch (error) {
      console.error('Error fetching supplier:', error);
      res.status(500).json({ message: 'An error occurred while fetching the supplier.', error: error.message });
  }
});

// Endpoint do aktualizacji danych dostawcy
app.put('/api/suppliers/:id', async (req, res) => {
  try {
      const updatedSupplier = await Supplier.findByIdAndUpdate(
          req.params.id,
          req.body,
          { new: true, runValidators: true }
      );
      if (!updatedSupplier) {
          return res.status(404).send({ message: 'Supplier not found' });
      }
      res.send(updatedSupplier);
  } catch (error) {
      console.error(error);
      res.status(500).send({ message: 'Error updating supplier', error });
  }
});

// Endpoint: Usuwanie dostawcy
app.delete("/api/suppliers/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    await Supplier.findByIdAndDelete(id);
    res.status(200).json({ message: "Supplier deleted successfully" });
  } catch (err) {
    console.error("Error deleting supplier:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Endpoint do dodawania nowego dostawcy
app.post('/api/suppliers', async (req, res) => {
  try {
      const { supplierName, address, phoneNumber, email, contactPerson, supplierType } = req.body;

      // Sprawdzenie wymaganych pól
      const missingFields = [];
      if (!supplierName || supplierName.trim() === "") missingFields.push("Supplier Name");
      if (!address || address.trim() === "") missingFields.push("Address");
      if (!phoneNumber || phoneNumber.trim() === "") missingFields.push("Phone Number");
      if (!email || email.trim() === "") missingFields.push("Email");
      if (!contactPerson || contactPerson.trim() === "") missingFields.push("Contact Person");
      if (!supplierType || supplierType.trim() === "") missingFields.push("Supplier Type");

      // Jeśli są brakujące pola, zwróć odpowiedź z błędem
      if (missingFields.length > 0) {
          return res.status(400).json({
              message: `The following fields are required and cannot be empty: ${missingFields.join(", ")}`,
              missingFields,
          });
      }

      // Walidacja formatu numeru telefonu
      const phoneRegex = /^\d+$/; // Tylko cyfry
      if (!phoneRegex.test(phoneNumber)) {
          return res.status(400).json({
              message: "Phone number must contain only numeric characters.",
          });
      }

      // Walidacja formatu e-maila
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Podstawowa walidacja e-maila
      if (!emailRegex.test(email)) {
          return res.status(400).json({
              message: "Invalid email format. Email must contain '@' and a valid domain.",
          });
      }

      // Sprawdzenie, czy dostawca już istnieje (unikatowość e-maila)
      const existingSupplier = await Supplier.findOne({ email });
      if (existingSupplier) {
          return res.status(400).json({
              message: "Supplier with this email already exists!",
              duplicateField: "Email",
          });
      }

      // Dodanie nowego dostawcy
      const newSupplier = new Supplier({
          supplierName,
          address,
          phoneNumber,
          email,
          contactPerson,
          supplierType,
      });

      await newSupplier.save();
      res.status(201).json({ message: "Supplier added successfully", supplier: newSupplier });
  } catch (err) {
      // Obsługa błędów w zależności od ich rodzaju
      if (err.name === "ValidationError") {
          return res.status(400).json({
              message: "Validation error occurred.",
              error: err.errors,
          });
      }

      console.error("Error adding supplier:", err);
      res.status(500).json({
          message: "Internal server error occurred while adding the supplier.",
          error: err.message,
      });
  }
});



// Definicja schematu i modelu dla kolekcji customers
// Definicja schematu i modelu dla kolekcji customers
// Definicja schematu i modelu dla kolekcji customers
const customerSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
    address: { type: String },
    email: { type: String },
    phoneNumber: { type: String },
    contactPerson: { type: String },
    customerType: { type: String },
}, { timestamps: true }); // Dodaje pola createdAt i updatedAt

const Customer = mongoose.model('Customer', customerSchema);

// Endpoint do pobierania danych klientów
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers', error });
  }
});

//zliczanie 
app.get('/api/customers/total', async (req, res) => {
  try {
      const totalCustomers = await Customer.countDocuments(); // Liczy dokumenty w kolekcji Customer
      res.status(200).json({ count: totalCustomers });
  } catch (error) {
      console.error('Error counting customers:', error.message);
      res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
      const customer = await Customer.findById(req.params.id); // Jeśli korzystasz z MongoDB
      if (!customer) {
          return res.status(404).json({ message: 'Customer not found' });
      }
      res.json(customer);
  } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});





// Endpoint do aktualizacji danych klienta
app.put('/api/customers/:id', async (req, res) => {
  try {
    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedCustomer) {
      return res.status(404).send({ message: 'Customer not found' });
    }
    res.send(updatedCustomer);
  } catch (error) {
    res.status(500).send({ message: 'Error updating customer', error });
  }
});

// Endpoint do usuwania klienta
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    await Customer.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting customer', error });
  }
});

// Endpoint do dodawania nowego klienta
app.post('/api/customers', async (req, res) => {
  console.log('Received data:', req.body); // Loguj dane do debugowania

  const { customerName, address, phoneNumber, email, contactPerson, customerType } = req.body;

  // Sprawdzenie wymaganych pól
  const missingFields = [];
  if (!customerName || customerName.trim() === "") missingFields.push("Customer Name");
  if (!address || address.trim() === "") missingFields.push("Address");
  if (!phoneNumber || phoneNumber.trim() === "") missingFields.push("Phone Number");
  if (!email || email.trim() === "") missingFields.push("Email");
  if (!contactPerson || contactPerson.trim() === "") missingFields.push("Contact Person");
  if (!customerType || customerType.trim() === "") missingFields.push("Customer Type");

  // Jeśli są brakujące pola, zwróć odpowiedź z błędem
  if (missingFields.length > 0) {
      return res.status(400).json({
          message: `The following fields are required and cannot be empty: ${missingFields.join(", ")}`,
          missingFields,
      });
  }

  // Walidacja formatu numeru telefonu
  const phoneRegex = /^\d+$/; // Tylko cyfry
  if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
          message: "Phone number must contain only numeric characters.",
      });
  }

  // Walidacja formatu e-maila
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Podstawowa walidacja e-maila
  if (!emailRegex.test(email)) {
      return res.status(400).json({
          message: "Invalid email format. Email must contain '@' and a valid domain.",
      });
  }

  try {
      // Sprawdzenie, czy klient już istnieje (unikatowość e-maila)
      const existingCustomer = await Customer.findOne({ email });
      if (existingCustomer) {
          return res.status(400).json({
              message: "Customer with this email already exists!",
              duplicateField: "Email",
          });
      }

      // Dodanie nowego klienta
      const newCustomer = new Customer({
          customerName,
          address,
          phoneNumber,
          email,
          contactPerson,
          customerType,
      });

      const savedCustomer = await newCustomer.save();
      res.status(201).json({ message: 'Customer added successfully', customer: savedCustomer });
  } catch (error) {
      // Obsługa błędów w zależności od ich rodzaju
      if (error.name === "ValidationError") {
          return res.status(400).json({
              message: "Validation error occurred.",
              error: error.errors,
          });
      }

      console.error('Error adding customer:', error);
      res.status(500).json({
          message: 'Internal server error occurred while adding the customer.',
          error: error.message,
      });
  }
});









const GoodsSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  brandName: { type: String, required: true },
  itemsNOK: { type: Number, default: 0 },
  itemsOK: { type: Number, default: 0 },
  itemsToCheck: { type: Number, default: 0 },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
}, { timestamps: true });


const Goods = mongoose.model('Goods', GoodsSchema);


// Pobierz wszystkie produkty
app.get('/api/goods', async (req, res) => {
  try {
      const goods = await Goods.find(); // Pobiera wszystkie produkty
      res.json(goods);
  } catch (error) {
      console.error('Error fetching goods:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});

// Pobierz jeden produkt na podstawie ID
app.get('/api/goods/:id', async (req, res) => {
  try {
      const goods = await Goods.findById(req.params.id);
      if (!goods) {
          return res.status(404).json({ message: 'Goods not found' });
      }
      res.json(goods);
  } catch (error) {
      console.error('Error fetching goods:', error);
      res.status(400).json({ message: 'Invalid Goods ID or other error.' });
  }
});

app.get('/api/goods/itemName/:itemName', async (req, res) => {
  try {
      const { itemName } = req.params;
      const goods = await Goods.findOne({ itemName });
      if (!goods) return res.status(404).json({ message: 'Item not found' });
      res.json(goods);
  } catch (error) {
      console.error('Error fetching goods:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});


app.put('/api/goods/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const { itemName, brandName, itemsOK, itemsNOK, itemsToCheck } = req.body;

      // Walidacja wejścia
      if ((itemsToCheck != null && itemsToCheck < 0) || (itemsOK != null && itemsOK < 0) || (itemsNOK != null && itemsNOK < 0)) {
          return res.status(400).json({ message: "Items values cannot be negative." });
      }

      // Przygotuj obiekt aktualizacji
      const updates = {};
      if (itemName !== undefined) updates.itemName = itemName;
      if (brandName !== undefined) updates.brandName = brandName;
      if (itemsOK !== undefined) updates.itemsOK = itemsOK;
      if (itemsNOK !== undefined) updates.itemsNOK = itemsNOK;
      if (itemsToCheck !== undefined) updates.itemsToCheck = itemsToCheck;

      // Znajdź i zaktualizuj dane
      const updatedGoods = await Goods.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

      if (!updatedGoods) {
          return res.status(404).json({ message: "Goods not found." });
      }

      res.status(200).json(updatedGoods);
  } catch (error) {
      console.error("Error updating goods:", error);
      res.status(500).json({ message: "Internal server error." });
  }
});






// Endpoint do usuwania elementu po ID
app.delete('/api/goods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedGoods = await Goods.findByIdAndDelete(id);
    if (!deletedGoods) {
      return res.status(404).json({ message: "Goods not found" });
    }
    res.json({ message: "Goods deleted successfully", goods: deletedGoods });
  } catch (err) {
    console.error("Error deleting goods:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/api/goods', async (req, res) => {
  try {
      const { itemName, brandName, itemsToCheck } = req.body;

      // Znajdź dostawcę na podstawie Brand Name
      const supplier = await Supplier.findOne({ "supplierName": brandName });
      if (!supplier) {
          return res.status(404).json({ message: 'Supplier not found for the given Brand Name.' });
      }

      // Stwórz nowy dokument Goods
      const newGoods = await Goods.create({
          "itemName": itemName,
          "brandName": brandName,
          "supplierId": supplier._id,
          "itemsNOK": "0", // Możesz dostosować do swoich wymagań
          "itemsOK": "0",
          "itemsToCheck": itemsToCheck,
          createdAt: new Date(),
          updatedAt: new Date(),
      });

      res.status(201).json({ message: 'Goods added successfully!', goods: newGoods });
  } catch (error) {
      console.error('Error adding goods:', error);
      res.status(500).json({ message: 'An error occurred while adding goods.' });
  }
});

app.put('/api/goods/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const updates = req.body;

      // Znajdź i zaktualizuj dane
      const updatedGoods = await Goods.findByIdAndUpdate(id, updates, { new: true });

      if (!updatedGoods) {
          return res.status(404).json({ message: 'Goods not found' });
      }

      res.json(updatedGoods);
  } catch (error) {
      console.error('Error updating goods:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to fetch suppliers with goods
app.get('/api/suppliers-with-goods', async (req, res) => {
  try {
      const suppliers = await Supplier.aggregate([
          {
              $lookup: {
                  from: 'goods',
                  localField: '_id',
                  foreignField: 'supplierId',
                  as: 'goods',
              },
          },
          {
              $project: {
                  supplierName: 1,
                  goods: {
                      $map: {
                          input: "$goods",
                          as: "item",
                          in: {
                              _id: "$$item._id",
                              itemName: "$$item.itemName",
                              brandName: "$$item.brandName",
                              itemsNOK: "$$item.itemsNOK",
                          },
                      },
                  },
              },
          },
      ]);
      res.json(suppliers);
  } catch (error) {
      res.status(500).json({ message: 'Error fetching suppliers with goods', error });
  }
});



app.get('/api/supplier-brands', async (req, res) => {
  try {
      // Pobieranie unikalnych nazw dostawców (marek)
      const suppliers = await Supplier.find().select('supplierName');
      const brands = suppliers.map(supplier => supplier.supplierName);
      res.json(brands);
  } catch (error) {
      console.error('Error fetching supplier brands:', error);
      res.status(500).json({ message: 'Failed to fetch supplier brands.' });
  }
});






// Definicja modelu Incoming


const IncomingSchema = new mongoose.Schema({
  goodsId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goods', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  quantity: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Incoming = mongoose.model('Incoming', IncomingSchema);




// Endpoint to fetch incoming goods with supplier and item details
// Endpoint to fetch incoming goods with supplier and item details
app.get('/api/incoming-goods', async (req, res) => {
  try {
    const incomingGoods = await Incoming.find()
      .populate({
        path: 'goodsId',
        select: 'itemName brandName itemsNOK itemsOK itemsToCheck',
      })
      .populate({
        path: 'supplierId',
        select: 'supplierName address phoneNumber email contactPerson supplierType',
      });

    const data = incomingGoods.map(incoming => ({
      _id: incoming._id,
      createdAt: incoming.createdAt,
      updatedAt: incoming.updatedAt,
      itemName: incoming.goodsId?.itemName || 'N/A',
      brandName: incoming.goodsId?.brandName || 'N/A',
      supplierName: incoming.supplierId?.supplierName || 'N/A',
      address: incoming.supplierId?.address || 'N/A',
      phoneNumber: incoming.supplierId?.phoneNumber || 'N/A',
      email: incoming.supplierId?.email || 'N/A',
      contactPerson: incoming.supplierId?.contactPerson || 'N/A',
      supplierType: incoming.supplierId?.supplierType || 'N/A',
      quantity: incoming.quantity || 0,
      itemsOK: incoming.goodsId?.itemsOK || 0,
      itemsNOK: incoming.goodsId?.itemsNOK || 0,
      itemsToCheck: incoming.goodsId?.itemsToCheck || 0,
    }));

    console.log('Mapped data:', data);
    res.json(data);
  } catch (error) {
    console.error('Error fetching incoming goods:', error);
    res.status(500).json({ message: 'Error fetching incoming goods', error: error.message });
  }
});



app.post('/api/incoming-goods', async (req, res) => {
  try {
      const { supplierId, itemId, quantity } = req.body;

      // Walidacja danych wejściowych
      if (!supplierId || !itemId || quantity <= 0) {
          return res.status(400).json({ message: 'Invalid data provided.' });
      }

      // Zaktualizuj pole itemsToCheck w Goods
      const updatedGoods = await Goods.findByIdAndUpdate(
          itemId,
          { $inc: { itemsToCheck: quantity } }, // Dodaj ilość do itemsToCheck
          { new: true }
      );

      if (!updatedGoods) {
          return res.status(404).json({ message: 'Goods item not found.' });
      }

      // Dodaj nowy wpis do Incoming Goods
      const newIncoming = new Incoming({
          supplierId,
          goodsId: itemId,
          quantity,
      });

      await newIncoming.save();

      res.status(201).json({ message: 'Incoming goods added successfully.', incoming: newIncoming, updatedGoods });
  } catch (error) {
      console.error('Error adding incoming goods:', error);
      res.status(500).json({ message: 'An error occurred while adding incoming goods.', error: error.message });
  }
});




app.delete('/api/incoming-goods/:id', async (req, res) => {
  try {
      const incomingId = req.params.id;

      // Znajdź wpis w Incoming Goods
      const incoming = await Incoming.findById(incomingId);
      if (!incoming) {
          return res.status(404).json({ message: 'Incoming goods entry not found.' });
      }

      // Zmniejsz ilość `itemsToCheck` w Goods
      const goodsItem = await Goods.findByIdAndUpdate(
          incoming.goodsId,
          { $inc: { itemsToCheck: -incoming.quantity } }, // Odejmij ilość
          { new: true }
      );

      if (!goodsItem) {
          return res.status(404).json({ message: 'Goods item not found.' });
      }

      // Usuń wpis w Incoming Goods
      await Incoming.findByIdAndDelete(incomingId);

      res.status(200).json({ message: 'Incoming goods entry deleted successfully', updatedGoods: goodsItem });
  } catch (error) {
      console.error('Error deleting incoming goods entry:', error);
      res.status(500).json({ message: 'An error occurred while deleting the incoming goods entry.', error: error.message });
  }
});

// outgoing schema
//outgoing schema
//outgoing schema
const OutgoingSchema = new mongoose.Schema({
  goodsId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goods', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  quantity: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Wymuszenie przynajmniej jednego pola
OutgoingSchema.pre('validate', function (next) {
  if (!this.customerId && !this.supplierId) {
      next(new Error('Either customerId or supplierId must be provided.'));
  } else {
      next();
  }
});
const Outgoing = mongoose.model('Outgoing', OutgoingSchema);


// Endpoint for adding outgoing goods
app.get('/api/outgoing-goods', async (req, res) => {
  try {
    const outgoingGoods = await Outgoing.find()
      .populate({
        path: 'goodsId',
        select: 'itemName brandName',
      })
      .populate({
        path: 'customerId',
        select: 'customerName address phoneNumber',
      })
      .populate({
        path: 'supplierId',
        select: 'supplierName address phoneNumber',
      });

    console.log("Outgoing goods data:", outgoingGoods); // Dodaj to
    res.json(outgoingGoods);
  } catch (error) {
    console.error('Error fetching outgoing goods:', error);
    res.status(500).json({ message: 'An error occurred while fetching outgoing goods.' });
  }
});



app.post('/api/outgoing-goods', async (req, res) => {
  const { goodsId, customerId, supplierId, quantity } = req.body;

  if (!goodsId || quantity <= 0) {
      return res.status(400).json({ message: 'Invalid data provided.' });
  }

  if (!customerId && !supplierId) {
      return res.status(400).json({ message: 'Either customerId or supplierId must be provided.' });
  }

  try {
      // Znajdź produkt w bazie danych
      const goodsItem = await Goods.findById(goodsId);
      if (!goodsItem) {
          return res.status(404).json({ message: 'Goods item not found.' });
      }

      // Zaktualizuj odpowiednie pole w zależności od typu podmiotu
      if (supplierId) {
          if (goodsItem.itemsNOK < quantity) {
              return res.status(400).json({ message: 'Insufficient itemsNOK available.' });
          }
          goodsItem.itemsNOK -= quantity;
      }

      if (customerId) {
          if (goodsItem.itemsOK < quantity) {
              return res.status(400).json({ message: 'Insufficient itemsOK available.' });
          }
          goodsItem.itemsOK -= quantity;
      }

      // Zapisz zmiany w produkcie
      await goodsItem.save();

      // Utwórz nowy wpis w kolekcji Outgoing
      const newOutgoing = new Outgoing({ goodsId, customerId, supplierId, quantity });
      await newOutgoing.save();

      res.status(201).json({
          message: 'Outgoing goods recorded successfully.',
          outgoing: newOutgoing,
          updatedGoods: goodsItem,
      });
  } catch (error) {
      console.error('Error adding outgoing goods:', error);
      res.status(500).json({ message: 'An error occurred while adding outgoing goods.' });
  }
});



// Endpoint for deleting outgoing goods
app.delete('/api/outgoing-goods/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const outgoingItem = await Outgoing.findById(id);
    if (!outgoingItem) {
      return res.status(404).json({ message: 'Outgoing goods not found.' });
    }

    const goodsItem = await Goods.findById(outgoingItem.goodsId);
    if (!goodsItem) {
      return res.status(404).json({ message: 'Goods item not found.' });
    }

    // Restore inventory
    if (outgoingItem.supplierId) {
      goodsItem.itemsNOK += outgoingItem.quantity;
    }

    if (outgoingItem.customerId) {
      goodsItem.itemsOK += outgoingItem.quantity;
    }

    await goodsItem.save();
    await Outgoing.findByIdAndDelete(id);

    res.status(200).json({ message: 'Outgoing goods deleted successfully.' });
  } catch (error) {
    console.error('Error deleting outgoing goods:', error);
    res.status(500).json({ message: 'An error occurred while deleting outgoing goods.' });
  }
});

//selection schema
//selection schema

const selectionSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  brandName: { type: String, required: true },
  itemName: { type: String, required: true },
  itemsNOK: { type: Number, default: 0 },
  itemsOK: { type: Number, default: 0 },
  itemsToCheck: { type: Number, default: 0 },
}, { timestamps: true });

const Selection = mongoose.model('Selection', selectionSchema);

app.post('/api/selection', async (req, res) => {
  try {
      const { id, quantityToSend } = req.body;

      if (!id || !quantityToSend) {
          console.error("Missing required fields:", req.body);
          return res.status(400).json({ message: "Missing required fields: id and quantityToSend." });
      }

      const goods = await Goods.findById(id);
      if (!goods) {
          console.error(`Goods not found for ID: ${id}`);
          return res.status(404).json({ message: "Goods not found." });
      }

      if (goods.itemsToCheck < quantityToSend) {
          console.error(`Not enough items available for selection. Available: ${goods.itemsToCheck}, Requested: ${quantityToSend}`);
          return res.status(400).json({ message: "Not enough items available for selection." });
      }

      goods.itemsToCheck -= quantityToSend;
      await goods.save();
      console.log("Updated goods:", goods);

      const selection = new Selection({
          supplierId: goods.supplierId,
          brandName: goods.brandName,
          itemName: goods.itemName,
          itemsToCheck: quantityToSend,
      });

      await selection.save();
      console.log("New selection created:", selection);

      res.status(201).json({ message: "Items added to selection successfully." });
  } catch (error) {
      console.error("Error in /api/selection:", error);
      res.status(500).json({ message: "Internal server error.", error: error.message });
  }
});



//dashnboard counting

app.get('/api/incoming-goods/count', async (req, res) => {
  try {
      const count = await Incoming.countDocuments();
      res.json({ count });
  } catch (error) {
      res.status(500).json({ message: 'Error fetching incoming goods count', error });
  }
});


app.get('/api/outgoing-goods/count', async (req, res) => {
  try {
      const count = await Outgoing.countDocuments();
      res.json({ count });
  } catch (error) {
      res.status(500).json({ message: 'Error fetching outgoing goods count', error });
  }
});



// Endpoint dla dostawców
// Trasa do liczenia dokumentów


// Trasa do pobierania pojedynczego dostawcy na podstawie ID
app.get('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;

  // Walidacja ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid supplier ID' });
  }

  try {
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.get('/api/selection', async (req, res) => {
  try {
      const selections = await Selection.find().populate('supplierId', 'supplierName'); // Pobieranie danych z relacją
      res.status(200).json(selections);
  } catch (error) {
      console.error('Error fetching selection data:', error);
      res.status(500).json({ message: 'Internal server error.' });
  }
});
// Endpoint: Zliczanie dokumentów w kolekcji Selection
app.get('/api/selection/total', async (req, res) => {
  try {
      const totalSelections = await Selection.countDocuments(); // Liczy dokumenty w kolekcji Selection
      res.status(200).json({ count: totalSelections });
  } catch (error) {
      console.error('Error counting selections:', error.message);
      res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


app.put('/api/selection/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const { itemsToCheck, itemsNOK, itemsOK } = req.body;

      // Znajdź i zaktualizuj wpis w tabeli Selection
      const updatedSelection = await Selection.findByIdAndUpdate(
          id,
          { itemsToCheck, itemsNOK, itemsOK },
          { new: true, runValidators: true } // Zwraca zaktualizowany dokument
      );

      if (!updatedSelection) {
          return res.status(404).json({ message: "Selection entry not found." });
      }

      res.status(200).json(updatedSelection);
  } catch (error) {
      console.error("Error updating selection entry:", error);
      res.status(500).json({ message: "Internal server error." });
  }
});

app.delete('/api/selection/:id', async (req, res) => {
  try {
      const { id } = req.params;

      // Znajdź i usuń wpis z tabeli Selection
      const deletedSelection = await Selection.findByIdAndDelete(id);

      if (!deletedSelection) {
          return res.status(404).json({ message: "Selection entry not found." });
      }

      res.status(200).json({ message: "Selection entry deleted successfully.", deletedSelection });
  } catch (error) {
      console.error("Error deleting selection entry:", error);
      res.status(500).json({ message: "Internal server error." });
  }
});

//report incoming
app.get('/api/incoming-goods/report', async (req, res) => {
  const { supplier, dateRange, customStartDate, customEndDate } = req.query;

  try {
      let filter = {};
      if (supplier) filter.supplierId = supplier;

      // Ustaw zakres dat
      const startDate = new Date(customStartDate || Date.now());
      const endDate = new Date(customEndDate || Date.now());
      if (dateRange && dateRange !== 'custom') {
          const now = new Date();
          switch (dateRange) {
              case 'today':
                  startDate.setHours(0, 0, 0, 0);
                  endDate.setHours(23, 59, 59, 999);
                  break;
              case 'week':
                  startDate.setDate(now.getDate() - 7);
                  break;
              case 'month':
                  startDate.setMonth(now.getMonth() - 1);
                  break;
              case '3months':
                  startDate.setMonth(now.getMonth() - 3);
                  break;
              case '6months':
                  startDate.setMonth(now.getMonth() - 6);
                  break;
              case 'year':
                  startDate.setFullYear(now.getFullYear() - 1);
                  break;
          }
      }
      filter.createdAt = { $gte: startDate, $lte: endDate };

      // Pobierz dane z bazy
      const incomingGoods = await Incoming.find(filter)
          .populate('goodsId', 'itemName')
          .populate('supplierId', 'supplierName')
          .sort({ createdAt: 1 });

      // Przetwórz dane do odpowiedniego formatu
      const reportData = incomingGoods.map(item => ({
          date: item.createdAt.toISOString().split('T')[0],
          itemName: item.goodsId?.itemName || 'N/A',
          quantity: item.quantity,
          supplier: item.supplierId?.supplierName || 'All Suppliers'
      }));

      res.json(reportData);
  } catch (error) {
      console.error('Error fetching incoming goods report:', error);
      res.status(500).json({ message: 'Error fetching report data' });
  }
});




//pdf report incoming
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { reportData, chartImage } = req.body;

    if (!reportData || reportData.length === 0) {
      console.error('Missing report data.');
      return res.status(400).json({ message: 'No report data provided.' });
    }

    if (!chartImage) {
      console.error('Missing chart image.');
      return res.status(400).json({ message: 'No chart image provided.' });
    }

    // Ścieżka zapisu pliku PDF
    const filePath = path.join(__dirname, 'Incoming_Goods_Report.pdf');
    
    // Tworzenie dokumentu PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' }); // Ustawienie rozmiaru A4
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Tytuł i znacznik czasu
    doc.fontSize(20).text('Incoming Goods Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Nagłówki tabeli
    const tableTop = doc.y;
    const columnWidths = {
      date: 100,
      itemName: 150,
      quantity: 100,
      supplier: 150,
    };

    doc.fontSize(14).text('Report Details:', { underline: true });
    doc.moveDown(0.5);

    // Rysowanie nagłówka tabeli
    doc.fontSize(12).fillColor('white').rect(40, tableTop, 500, 20).fill('#007BFF');
    doc.fillColor('white').text('Date', 45, tableTop + 5, { width: columnWidths.date, align: 'left' });
    doc.text('Item Name', 45 + columnWidths.date, tableTop + 5, { width: columnWidths.itemName, align: 'left' });
    doc.text('Quantity', 45 + columnWidths.date + columnWidths.itemName, tableTop + 5, {
      width: columnWidths.quantity,
      align: 'left',
    });
    doc.text('Supplier/Customer', 45 + columnWidths.date + columnWidths.itemName + columnWidths.quantity, tableTop + 5, {
      width: columnWidths.supplier,
      align: 'left',
    });

    // Wiersze tabeli
    let rowTop = tableTop + 20;
    doc.fontSize(10).fillColor('black');
    reportData.forEach((entry, index) => {
      const isEvenRow = index % 2 === 0;
      if (isEvenRow) {
        doc.fillColor('#F0F0F0').rect(40, rowTop, 500, 20).fill();
      }
      doc.fillColor('black');
      doc.text(entry.date, 45, rowTop + 5, { width: columnWidths.date, align: 'left' });
      doc.text(entry.itemName, 45 + columnWidths.date, rowTop + 5, {
        width: columnWidths.itemName,
        align: 'left',
      });
      doc.text(entry.quantity.toString(), 45 + columnWidths.date + columnWidths.itemName, rowTop + 5, {
        width: columnWidths.quantity,
        align: 'left',
      });
      doc.text(entry.supplier, 45 + columnWidths.date + columnWidths.itemName + columnWidths.quantity, rowTop + 5, {
        width: columnWidths.supplier,
        align: 'left',
      });

      rowTop += 20;

      // Dodaj nową stronę, jeśli wiersze przekroczą stronę
      if (rowTop > doc.page.height - 50) {
        doc.addPage();
        rowTop = 50;
      }
    });

    doc.moveDown(2);

    // Dodanie obrazu wykresu
    if (chartImage) {
      const chartBuffer = Buffer.from(chartImage.split(',')[1], 'base64');
      doc.addPage();
      doc.image(chartBuffer, {
        fit: [500, 300],
        align: 'center',
        valign: 'center',
      });
    }

    doc.end();

    // Obsługa strumienia pliku
    stream.on('finish', () => {
      res.download(filePath, 'Incoming_Goods_Report.pdf', (err) => {
        if (err) {
          console.error('Error during file download:', err);
        }
        fs.unlinkSync(filePath); // Usunięcie pliku po pobraniu
      });
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Error generating PDF', error: error.message });
  }
});


//report outgoing
app.get('/api/outgoing-goods/report', async (req, res) => {
  const { supplier, dateRange, customStartDate, customEndDate } = req.query;

  try {
      let filter = {};
      if (supplier) filter.supplierId = supplier;

      const startDate = new Date(customStartDate || Date.now());
      const endDate = new Date(customEndDate || Date.now());
      if (dateRange && dateRange !== 'custom') {
          const now = new Date();
          switch (dateRange) {
              case 'today':
                  startDate.setHours(0, 0, 0, 0);
                  endDate.setHours(23, 59, 59, 999);
                  break;
              case 'week':
                  startDate.setDate(now.getDate() - 7);
                  break;
              case 'month':
                  startDate.setMonth(now.getMonth() - 1);
                  break;
              case '3months':
                  startDate.setMonth(now.getMonth() - 3);
                  break;
              case '6months':
                  startDate.setMonth(now.getMonth() - 6);
                  break;
              case 'year':
                  startDate.setFullYear(now.getFullYear() - 1);
                  break;
          }
      }
      filter.createdAt = { $gte: startDate, $lte: endDate };

      const outgoingGoods = await Outgoing.find(filter)
          .populate('goodsId', 'itemName')
          .populate('supplierId', 'supplierName')
          .populate('customerId', 'customerName')
          .sort({ createdAt: 1 });

      const reportData = outgoingGoods.map(item => ({
          date: item.createdAt.toISOString().split('T')[0],
          itemName: item.goodsId?.itemName || 'N/A',
          quantity: item.quantity,
          supplier: item.supplierId?.supplierName || item.customerId?.customerName || 'Unknown',
      }));

      res.json(reportData);
  } catch (error) {
      console.error('Error fetching outgoing goods report:', error);
      res.status(500).json({ message: 'Error fetching report data' });
  }
});


app.get('/api/customers-suppliers', async (req, res) => {
  try {
      const customers = await Customer.find({}, '_id customerName').lean();
      const suppliers = await Supplier.find({}, '_id supplierName').lean();

      const combined = [
          ...customers.map(customer => ({ _id: customer._id, name: customer.customerName })),
          ...suppliers.map(supplier => ({ _id: supplier._id, name: supplier.supplierName }))
      ];

      res.json(combined);
  } catch (error) {
      console.error('Error fetching customers and suppliers:', error);
      res.status(500).json({ message: 'Error fetching data' });
  }
});

//outgoing pdf
app.post('/api/outgoing-goods/generate-pdf', async (req, res) => {
    try {
        const { reportData, chartImage } = req.body;

        if (!reportData || reportData.length === 0) {
            console.error('Missing report data.');
            return res.status(400).json({ message: 'No report data provided.' });
        }

        if (!chartImage) {
            console.error('Missing chart image.');
            return res.status(400).json({ message: 'No chart image provided.' });
        }

        // Generate PDF file
        const filePath = path.join(__dirname, 'Outgoing_Goods_Report.pdf');
        const doc = new PDFDocument({ margin: 40 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Title and Timestamp
        doc.fontSize(20).text('Outgoing Goods Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // Table Header
        const tableTop = doc.y;
        const columnWidths = {
            date: 100,
            itemName: 150,
            quantity: 100,
            recipient: 150, // "Supplier/Customer" renamed to "Recipient"
        };

        doc.fontSize(14).text('Report Details:', { underline: true });
        doc.moveDown(0.5);

        // Draw table header
        doc.fontSize(12).fillColor('white').rect(40, tableTop, 500, 20).fill('#007BFF');
        doc.fillColor('white').text('Date', 45, tableTop + 5, { width: columnWidths.date, align: 'left' });
        doc.text('Item Name', 45 + columnWidths.date, tableTop + 5, { width: columnWidths.itemName, align: 'left' });
        doc.text('Quantity', 45 + columnWidths.date + columnWidths.itemName, tableTop + 5, {
            width: columnWidths.quantity,
            align: 'left',
        });
        doc.text('Recipient', 45 + columnWidths.date + columnWidths.itemName + columnWidths.quantity, tableTop + 5, {
            width: columnWidths.recipient,
            align: 'left',
        });

        // Draw table rows
        let rowTop = tableTop + 20;
        doc.fontSize(10).fillColor('black');
        reportData.forEach((entry, index) => {
            const isEvenRow = index % 2 === 0;
            if (isEvenRow) {
                doc.fillColor('#F0F0F0').rect(40, rowTop, 500, 20).fill();
            }
            doc.fillColor('black');
            doc.text(entry.date, 45, rowTop + 5, { width: columnWidths.date, align: 'left' });
            doc.text(entry.itemName, 45 + columnWidths.date, rowTop + 5, {
                width: columnWidths.itemName,
                align: 'left',
            });
            doc.text(entry.quantity.toString(), 45 + columnWidths.date + columnWidths.itemName, rowTop + 5, {
                width: columnWidths.quantity,
                align: 'left',
            });
            doc.text(entry.recipient || 'N/A', 45 + columnWidths.date + columnWidths.itemName + columnWidths.quantity, rowTop + 5, {
                width: columnWidths.recipient,
                align: 'left',
            });

            rowTop += 20;
        });

        doc.moveDown(2);

        // Add chart image
        doc.addPage();
        const chartBuffer = Buffer.from(chartImage.split(',')[1], 'base64');
        doc.image(chartBuffer, {
            fit: [500, 300],
            align: 'center',
            valign: 'center',
        });

        doc.end();

        // Handle file streaming
        stream.on('finish', () => {
            res.download(filePath, 'Outgoing_Goods_Report.pdf', (err) => {
                if (err) {
                    console.error('Error during file download:', err);
                }
                fs.unlinkSync(filePath); // Clean up
            });
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ message: 'Error generating PDF', error: error.message });
    }
});

//generate pdf report summary


app.post('/api/generate-summary-pdf', async (req, res) => {
  try {
    const { incomingData, outgoingData, charts } = req.body;

    if (!incomingData || !outgoingData || !charts) {
      console.error('Missing data for PDF generation.');
      return res.status(400).json({ message: 'Missing required data.' });
    }

    const filePath = path.join(__dirname, 'Summary_Report.pdf');
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Title
    doc.fontSize(20).text('Summary Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Incoming Data Section
    doc.fontSize(16).text('Incoming Goods', { underline: true });
    doc.moveDown(1);
    const incomingTableTop = doc.y;
    const columnWidths = { date: 100, itemName: 150, quantity: 100, supplier: 150 };

    // Table Headers
    doc.fontSize(12).fillColor('white').rect(40, incomingTableTop, 500, 20).fill('#007BFF');
    doc.fillColor('white').text('Date', 45, incomingTableTop + 5, { width: columnWidths.date });
    doc.text('Item Name', 45 + columnWidths.date, incomingTableTop + 5, { width: columnWidths.itemName });
    doc.text('Quantity', 45 + columnWidths.date + columnWidths.itemName, incomingTableTop + 5, { width: columnWidths.quantity });
    doc.text('Supplier', 45 + columnWidths.date + columnWidths.itemName + columnWidths.quantity, incomingTableTop + 5, { width: columnWidths.supplier });

    // Incoming Rows
    let rowTop = incomingTableTop + 20;
    incomingData.forEach((entry, index) => {
      const isEvenRow = index % 2 === 0;
      if (isEvenRow) {
        doc.fillColor('#F0F0F0').rect(40, rowTop, 500, 20).fill();
      }
      doc.fillColor('black');
      doc.text(entry.date, 45, rowTop + 5, { width: columnWidths.date });
      doc.text(entry.itemName, 45 + columnWidths.date, rowTop + 5, { width: columnWidths.itemName });
      doc.text(entry.quantity.toString(), 45 + columnWidths.date + columnWidths.itemName, rowTop + 5, { width: columnWidths.quantity });
      doc.text(entry.supplier, 45 + columnWidths.date + columnWidths.itemName + columnWidths.quantity, rowTop + 5, { width: columnWidths.supplier });
      rowTop += 20;

      if (rowTop > doc.page.height - 50) {
        doc.addPage();
        rowTop = 50;
      }
    });

    // Outgoing Data Section
    doc.addPage();
    doc.fontSize(16).text('Outgoing Goods', { underline: true });
    doc.moveDown(1);
    const outgoingTableTop = doc.y;

    // Table Headers
    doc.fontSize(12).fillColor('white').rect(40, outgoingTableTop, 500, 20).fill('#007BFF');
    doc.fillColor('white').text('Date', 45, outgoingTableTop + 5, { width: columnWidths.date });
    doc.text('Item Name', 45 + columnWidths.date, outgoingTableTop + 5, { width: columnWidths.itemName });
    doc.text('Quantity', 45 + columnWidths.date + columnWidths.itemName, outgoingTableTop + 5, { width: columnWidths.quantity });
    doc.text('Recipient', 45 + columnWidths.date + columnWidths.itemName + columnWidths.quantity, outgoingTableTop + 5, { width: columnWidths.supplier });

    // Outgoing Rows
    rowTop = outgoingTableTop + 20;
    outgoingData.forEach((entry, index) => {
      const isEvenRow = index % 2 === 0;
      if (isEvenRow) {
        doc.fillColor('#F0F0F0').rect(40, rowTop, 500, 20).fill();
      }
      doc.fillColor('black');
      doc.text(entry.date, 45, rowTop + 5, { width: columnWidths.date });
      doc.text(entry.itemName, 45 + columnWidths.date, rowTop + 5, { width: columnWidths.itemName });
      doc.text(entry.quantity.toString(), 45 + columnWidths.date + columnWidths.itemName, rowTop + 5, { width: columnWidths.quantity });
      doc.text(entry.supplier, 45 + columnWidths.date + columnWidths.itemName + columnWidths.quantity, rowTop + 5, { width: columnWidths.supplier });
      rowTop += 20;

      if (rowTop > doc.page.height - 50) {
        doc.addPage();
        rowTop = 50;
      }
    });

    // Charts Section
    doc.addPage();
    const incomingChartBuffer = Buffer.from(charts.incoming.split(',')[1], 'base64');
    const outgoingChartBuffer = Buffer.from(charts.outgoing.split(',')[1], 'base64');

    doc.fontSize(16).text('Charts', { underline: true });
    doc.moveDown(1);
    doc.text('Incoming Goods Chart:').moveDown(1);
    doc.image(incomingChartBuffer, { fit: [500, 300], align: 'center' });

    doc.addPage();
    doc.text('Outgoing Goods Chart:').moveDown(1);
    doc.image(outgoingChartBuffer, { fit: [500, 300], align: 'center' });

    doc.end();

    stream.on('finish', () => {
      res.download(filePath, 'Summary_Report.pdf', (err) => {
        if (err) {
          console.error('Error during file download:', err);
        }
        fs.unlinkSync(filePath); // Clean up after download
      });
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Error generating PDF', error: error.message });
  }
});


module.exports = { app, User, Customer,Goods,Supplier,Incoming,Outgoing,Selection };


if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

