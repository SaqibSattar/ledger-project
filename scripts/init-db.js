const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ledger-system';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'accountant', 'manager'], required: true },
}, {
  timestamps: true,
});

// Customer Schema
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  area: { type: String, required: true },
  role: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  unitPrice: { type: Number, required: true, min: 0 },
  stockQuantity: { type: Number, min: 0 },
  unit: { type: String, required: true },
  minStockAlert: { type: Number, min: 0 },
  registrationNumber: { type: String },
  registrationValidUpto: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

// Invoice Item Schema
const invoiceItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  nameSnapshot: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  rate: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

// Invoice Schema
const invoiceSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: [invoiceItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, required: true, min: 0, default: 0 },
  dueAmount: { type: Number, required: true, min: 0 },
  invoiceDate: { type: Date, required: true },
  invoiceNumber: { type: String, required: true, unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

// Create models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

async function initializeDatabase() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Product.deleteMany({});
    await Invoice.deleteMany({});
    console.log('Cleared existing data');

    // Create multiple users
    const users = [
      {
        name: 'Admin User',
        email: 'admin@ledger.com',
        password: await bcrypt.hash('admin123', 12),
        role: 'admin',
      },
      {
        name: 'Accountant User',
        email: 'accountant@ledger.com',
        password: await bcrypt.hash('accountant123', 12),
        role: 'accountant',
      },
      {
        name: 'Manager User',
        email: 'manager@ledger.com',
        password: await bcrypt.hash('manager123', 12),
        role: 'manager',
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@ledger.com',
        password: await bcrypt.hash('password123', 12),
        role: 'accountant',
      },
      {
        name: 'Michael Chen',
        email: 'michael.chen@ledger.com',
        password: await bcrypt.hash('password123', 12),
        role: 'manager',
      },
      {
        name: 'Emily Rodriguez',
        email: 'emily.rodriguez@ledger.com',
        password: await bcrypt.hash('password123', 12),
        role: 'accountant',
      },
      {
        name: 'David Wilson',
        email: 'david.wilson@ledger.com',
        password: await bcrypt.hash('password123', 12),
        role: 'manager',
      },
      {
        name: 'Lisa Thompson',
        email: 'lisa.thompson@ledger.com',
        password: await bcrypt.hash('password123', 12),
        role: 'accountant',
      },
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`Created ${createdUsers.length} users`);

    // Create customers
    const customers = [
      { name: 'MUHAMMAD YAQOOB', area: 'PESHAWAR', role: 'dealer', createdBy: createdUsers[0]._id },
      { name: 'AHMED KHAN', area: 'KARACHI', role: 'vendor', createdBy: createdUsers[0]._id },
      { name: 'FATIMA ALI', area: 'LAHORE', role: 'distributor', createdBy: createdUsers[1]._id },
      { name: 'HASSAN SHAH', area: 'ISLAMABAD', role: 'dealer', createdBy: createdUsers[1]._id },
      { name: 'SARA AHMED', area: 'RAWALPINDI', role: 'vendor', createdBy: createdUsers[2]._id },
      { name: 'OMAR MALIK', area: 'FAISALABAD', role: 'distributor', createdBy: createdUsers[2]._id },
      { name: 'AYESHA KHAN', area: 'MULTAN', role: 'dealer', createdBy: createdUsers[3]._id },
      { name: 'BILAL HASSAN', area: 'QUETTA', role: 'vendor', createdBy: createdUsers[3]._id },
      { name: 'NAZIA BEGUM', area: 'HYDERABAD', role: 'distributor', createdBy: createdUsers[4]._id },
      { name: 'TARIQ MAHMOOD', area: 'SIALKOT', role: 'dealer', createdBy: createdUsers[4]._id },
      { name: 'RUKHSANA BIBI', area: 'GUJRANWALA', role: 'vendor', createdBy: createdUsers[5]._id },
      { name: 'JAVED IQBAL', area: 'SARGODHA', role: 'distributor', createdBy: createdUsers[5]._id },
      { name: 'SHABANA PARVEEN', area: 'BAHAWALPUR', role: 'dealer', createdBy: createdUsers[6]._id },
      { name: 'KAMRAN ALI', area: 'SAHIWAL', role: 'vendor', createdBy: createdUsers[6]._id },
      { name: 'NASREEN AKHTAR', area: 'JHELUM', role: 'distributor', createdBy: createdUsers[7]._id },
    ];

    const createdCustomers = await Customer.insertMany(customers);
    console.log(`Created ${createdCustomers.length} customers`);

    // Create products
    const products = [
      {
        name: 'IMIDACLOPRID 25% WP 25KG',
        description: 'Insecticide powder formulation for crop protection',
        unitPrice: 1300,
        stockQuantity: 500,
        unit: 'kg',
        minStockAlert: 50,
        registrationNumber: 'REG-001',
        registrationValidUpto: new Date('2026-12-31'),
        createdBy: createdUsers[0]._id,
      },
      {
        name: 'FUSE 25% WG 48 GM',
        description: 'Herbicide granular formulation for weed control',
        unitPrice: 100,
        stockQuantity: 1000,
        unit: 'gm',
        minStockAlert: 100,
        registrationNumber: 'REG-002',
        registrationValidUpto: new Date('2027-06-30'),
        createdBy: createdUsers[0]._id,
      },
      {
        name: 'HITTER 1.9 EC 200-ML (40)',
        description: 'Insecticide emulsifiable concentrate',
        unitPrice: 275,
        stockQuantity: 200,
        unit: 'ml',
        minStockAlert: 20,
        registrationNumber: 'REG-003',
        registrationValidUpto: new Date('2026-09-15'),
        createdBy: createdUsers[1]._id,
      },
      {
        name: 'SALOON 2.5% EC 1-LTR(12)',
        description: 'Herbicide emulsifiable concentrate',
        unitPrice: 1025,
        stockQuantity: 150,
        unit: 'ltr',
        minStockAlert: 15,
        registrationNumber: 'REG-004',
        registrationValidUpto: new Date('2027-03-20'),
        createdBy: createdUsers[1]._id,
      },
      {
        name: 'HY ULTRA 25%OD 400ML',
        description: 'Ultra concentrated oil dispersion',
        unitPrice: 650,
        stockQuantity: 300,
        unit: 'ml',
        minStockAlert: 30,
        registrationNumber: 'REG-005',
        registrationValidUpto: new Date('2026-11-10'),
        createdBy: createdUsers[2]._id,
      },
      {
        name: 'ROUNDUP READY 480 SL',
        description: 'Glyphosate herbicide for broadleaf weed control',
        unitPrice: 850,
        stockQuantity: 400,
        unit: 'ml',
        minStockAlert: 40,
        registrationNumber: 'REG-006',
        registrationValidUpto: new Date('2027-01-15'),
        createdBy: createdUsers[2]._id,
      },
      {
        name: 'CONQUEST 2.5 EC 500ML',
        description: 'Insecticide for cotton and vegetable crops',
        unitPrice: 450,
        stockQuantity: 250,
        unit: 'ml',
        minStockAlert: 25,
        registrationNumber: 'REG-007',
        registrationValidUpto: new Date('2026-08-30'),
        createdBy: createdUsers[3]._id,
      },
      {
        name: 'WEEDMARSH 75% WP 1KG',
        description: 'Herbicide wettable powder for rice fields',
        unitPrice: 750,
        stockQuantity: 180,
        unit: 'kg',
        minStockAlert: 18,
        registrationNumber: 'REG-008',
        registrationValidUpto: new Date('2027-04-10'),
        createdBy: createdUsers[3]._id,
      },
      {
        name: 'PESTGUARD 20% SC 250ML',
        description: 'Systemic insecticide suspension concentrate',
        unitPrice: 320,
        stockQuantity: 350,
        unit: 'ml',
        minStockAlert: 35,
        registrationNumber: 'REG-009',
        registrationValidUpto: new Date('2026-10-25'),
        createdBy: createdUsers[4]._id,
      },
      {
        name: 'CROPMASTER 50% EC 1LTR',
        description: 'Multi-purpose crop protection solution',
        unitPrice: 1200,
        stockQuantity: 120,
        unit: 'ltr',
        minStockAlert: 12,
        registrationNumber: 'REG-010',
        registrationValidUpto: new Date('2027-02-28'),
        createdBy: createdUsers[4]._id,
      },
      {
        name: 'FUNGICIDE PLUS 70% WP 500GM',
        description: 'Fungicide for disease prevention in crops',
        unitPrice: 280,
        stockQuantity: 220,
        unit: 'gm',
        minStockAlert: 22,
        registrationNumber: 'REG-011',
        registrationValidUpto: new Date('2026-12-15'),
        createdBy: createdUsers[5]._id,
      },
      {
        name: 'NEMATODE KILLER 40% EC 200ML',
        description: 'Nematicide for soil pest control',
        unitPrice: 380,
        stockQuantity: 160,
        unit: 'ml',
        minStockAlert: 16,
        registrationNumber: 'REG-012',
        registrationValidUpto: new Date('2026-11-20'),
        createdBy: createdUsers[5]._id,
      },
      {
        name: 'GROWTH BOOSTER 15% SL 1LTR',
        description: 'Plant growth regulator and enhancer',
        unitPrice: 950,
        stockQuantity: 90,
        unit: 'ltr',
        minStockAlert: 9,
        registrationNumber: 'REG-013',
        registrationValidUpto: new Date('2027-05-30'),
        createdBy: createdUsers[6]._id,
      },
      {
        name: 'SOIL CONDITIONER 25KG',
        description: 'Organic soil amendment and conditioner',
        unitPrice: 1800,
        stockQuantity: 80,
        unit: 'kg',
        minStockAlert: 8,
        registrationNumber: 'REG-014',
        registrationValidUpto: new Date('2027-08-15'),
        createdBy: createdUsers[6]._id,
      },
      {
        name: 'MICRO NUTRIENT MIX 5KG',
        description: 'Essential micronutrients for plant health',
        unitPrice: 2200,
        stockQuantity: 60,
        unit: 'kg',
        minStockAlert: 6,
        registrationNumber: 'REG-015',
        registrationValidUpto: new Date('2027-07-10'),
        createdBy: createdUsers[7]._id,
      },
    ];

    const createdProducts = await Product.insertMany(products);
    console.log(`Created ${createdProducts.length} products`);

    // Create invoices
    const invoices = [
      {
        customerId: createdCustomers[0]._id,
        items: [
          {
            productId: createdProducts[0]._id,
            nameSnapshot: 'IMIDACLOPRID 25% WP 25KG',
            quantity: 125,
            rate: 1300,
            amount: 162500,
          },
        ],
        totalAmount: 162500,
        paidAmount: 0,
        dueAmount: 162500,
        invoiceDate: new Date('2025-10-11'),
        invoiceNumber: '1101006001',
        createdBy: createdUsers[0]._id,
      },
      {
        customerId: createdCustomers[1]._id,
        items: [
          {
            productId: createdProducts[1]._id,
            nameSnapshot: 'FUSE 25% WG 48 GM',
            quantity: 200,
            rate: 100,
            amount: 20000,
          },
          {
            productId: createdProducts[2]._id,
            nameSnapshot: 'HITTER 1.9 EC 200-ML (40)',
            quantity: 50,
            rate: 275,
            amount: 13750,
          },
        ],
        totalAmount: 33750,
        paidAmount: 20000,
        dueAmount: 13750,
        invoiceDate: new Date('2025-10-12'),
        invoiceNumber: '1101006002',
        createdBy: createdUsers[1]._id,
      },
      {
        customerId: createdCustomers[2]._id,
        items: [
          {
            productId: createdProducts[3]._id,
            nameSnapshot: 'SALOON 2.5% EC 1-LTR(12)',
            quantity: 25,
            rate: 1025,
            amount: 25625,
          },
        ],
        totalAmount: 25625,
        paidAmount: 25625,
        dueAmount: 0,
        invoiceDate: new Date('2025-10-13'),
        invoiceNumber: '1101006003',
        createdBy: createdUsers[2]._id,
      },
      {
        customerId: createdCustomers[3]._id,
        items: [
          {
            productId: createdProducts[4]._id,
            nameSnapshot: 'HY ULTRA 25%OD 400ML',
            quantity: 100,
            rate: 650,
            amount: 65000,
          },
          {
            productId: createdProducts[5]._id,
            nameSnapshot: 'ROUNDUP READY 480 SL',
            quantity: 30,
            rate: 850,
            amount: 25500,
          },
        ],
        totalAmount: 90500,
        paidAmount: 50000,
        dueAmount: 40500,
        invoiceDate: new Date('2025-10-14'),
        invoiceNumber: '1101006004',
        createdBy: createdUsers[3]._id,
      },
      {
        customerId: createdCustomers[4]._id,
        items: [
          {
            productId: createdProducts[6]._id,
            nameSnapshot: 'CONQUEST 2.5 EC 500ML',
            quantity: 80,
            rate: 450,
            amount: 36000,
          },
        ],
        totalAmount: 36000,
        paidAmount: 0,
        dueAmount: 36000,
        invoiceDate: new Date('2025-10-15'),
        invoiceNumber: '1101006005',
        createdBy: createdUsers[4]._id,
      },
      {
        customerId: createdCustomers[5]._id,
        items: [
          {
            productId: createdProducts[7]._id,
            nameSnapshot: 'WEEDMARSH 75% WP 1KG',
            quantity: 40,
            rate: 750,
            amount: 30000,
          },
          {
            productId: createdProducts[8]._id,
            nameSnapshot: 'PESTGUARD 20% SC 250ML',
            quantity: 60,
            rate: 320,
            amount: 19200,
          },
        ],
        totalAmount: 49200,
        paidAmount: 30000,
        dueAmount: 19200,
        invoiceDate: new Date('2025-10-16'),
        invoiceNumber: '1101006006',
        createdBy: createdUsers[5]._id,
      },
      {
        customerId: createdCustomers[6]._id,
        items: [
          {
            productId: createdProducts[9]._id,
            nameSnapshot: 'CROPMASTER 50% EC 1LTR',
            quantity: 15,
            rate: 1200,
            amount: 18000,
          },
        ],
        totalAmount: 18000,
        paidAmount: 18000,
        dueAmount: 0,
        invoiceDate: new Date('2025-10-17'),
        invoiceNumber: '1101006007',
        createdBy: createdUsers[6]._id,
      },
      {
        customerId: createdCustomers[7]._id,
        items: [
          {
            productId: createdProducts[10]._id,
            nameSnapshot: 'FUNGICIDE PLUS 70% WP 500GM',
            quantity: 100,
            rate: 280,
            amount: 28000,
          },
          {
            productId: createdProducts[11]._id,
            nameSnapshot: 'NEMATODE KILLER 40% EC 200ML',
            quantity: 40,
            rate: 380,
            amount: 15200,
          },
        ],
        totalAmount: 43200,
        paidAmount: 25000,
        dueAmount: 18200,
        invoiceDate: new Date('2025-10-18'),
        invoiceNumber: '1101006008',
        createdBy: createdUsers[7]._id,
      },
      {
        customerId: createdCustomers[8]._id,
        items: [
          {
            productId: createdProducts[12]._id,
            nameSnapshot: 'GROWTH BOOSTER 15% SL 1LTR',
            quantity: 20,
            rate: 950,
            amount: 19000,
          },
        ],
        totalAmount: 19000,
        paidAmount: 0,
        dueAmount: 19000,
        invoiceDate: new Date('2025-10-19'),
        invoiceNumber: '1101006009',
        createdBy: createdUsers[0]._id,
      },
      {
        customerId: createdCustomers[9]._id,
        items: [
          {
            productId: createdProducts[13]._id,
            nameSnapshot: 'SOIL CONDITIONER 25KG',
            quantity: 10,
            rate: 1800,
            amount: 18000,
          },
          {
            productId: createdProducts[14]._id,
            nameSnapshot: 'MICRO NUTRIENT MIX 5KG',
            quantity: 8,
            rate: 2200,
            amount: 17600,
          },
        ],
        totalAmount: 35600,
        paidAmount: 20000,
        dueAmount: 15600,
        invoiceDate: new Date('2025-10-20'),
        invoiceNumber: '1101006010',
        createdBy: createdUsers[1]._id,
      },
      {
        customerId: createdCustomers[10]._id,
        items: [
          {
            productId: createdProducts[0]._id,
            nameSnapshot: 'IMIDACLOPRID 25% WP 25KG',
            quantity: 75,
            rate: 1300,
            amount: 97500,
          },
        ],
        totalAmount: 97500,
        paidAmount: 50000,
        dueAmount: 47500,
        invoiceDate: new Date('2025-10-21'),
        invoiceNumber: '1101006011',
        createdBy: createdUsers[2]._id,
      },
      {
        customerId: createdCustomers[11]._id,
        items: [
          {
            productId: createdProducts[1]._id,
            nameSnapshot: 'FUSE 25% WG 48 GM',
            quantity: 150,
            rate: 100,
            amount: 15000,
          },
          {
            productId: createdProducts[3]._id,
            nameSnapshot: 'SALOON 2.5% EC 1-LTR(12)',
            quantity: 20,
            rate: 1025,
            amount: 20500,
          },
        ],
        totalAmount: 35500,
        paidAmount: 35500,
        dueAmount: 0,
        invoiceDate: new Date('2025-10-22'),
        invoiceNumber: '1101006012',
        createdBy: createdUsers[3]._id,
      },
      {
        customerId: createdCustomers[12]._id,
        items: [
          {
            productId: createdProducts[5]._id,
            nameSnapshot: 'ROUNDUP READY 480 SL',
            quantity: 25,
            rate: 850,
            amount: 21250,
          },
        ],
        totalAmount: 21250,
        paidAmount: 0,
        dueAmount: 21250,
        invoiceDate: new Date('2025-10-23'),
        invoiceNumber: '1101006013',
        createdBy: createdUsers[4]._id,
      },
      {
        customerId: createdCustomers[13]._id,
        items: [
          {
            productId: createdProducts[7]._id,
            nameSnapshot: 'WEEDMARSH 75% WP 1KG',
            quantity: 30,
            rate: 750,
            amount: 22500,
          },
          {
            productId: createdProducts[9]._id,
            nameSnapshot: 'CROPMASTER 50% EC 1LTR',
            quantity: 12,
            rate: 1200,
            amount: 14400,
          },
        ],
        totalAmount: 36900,
        paidAmount: 20000,
        dueAmount: 16900,
        invoiceDate: new Date('2025-10-24'),
        invoiceNumber: '1101006014',
        createdBy: createdUsers[5]._id,
      },
      {
        customerId: createdCustomers[14]._id,
        items: [
          {
            productId: createdProducts[11]._id,
            nameSnapshot: 'NEMATODE KILLER 40% EC 200ML',
            quantity: 35,
            rate: 380,
            amount: 13300,
          },
          {
            productId: createdProducts[13]._id,
            nameSnapshot: 'SOIL CONDITIONER 25KG',
            quantity: 8,
            rate: 1800,
            amount: 14400,
          },
        ],
        totalAmount: 27700,
        paidAmount: 15000,
        dueAmount: 12700,
        invoiceDate: new Date('2025-10-25'),
        invoiceNumber: '1101006015',
        createdBy: createdUsers[6]._id,
      },
    ];

    const createdInvoices = await Invoice.insertMany(invoices);
    console.log(`Created ${createdInvoices.length} invoices`);

    // Create additional invoices for comprehensive ledger testing
    const additionalInvoices = [];
    let invoiceCounter = 16;

    // Create 10-15 more invoices for each customer with different dates
    for (let i = 0; i < createdCustomers.length; i++) {
      const customer = createdCustomers[i];
      const numInvoices = Math.floor(Math.random() * 6) + 10; // 10-15 invoices per customer

      for (let j = 0; j < numInvoices; j++) {
        const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per invoice
        const items = [];
        let totalAmount = 0;

        for (let k = 0; k < numItems; k++) {
          const product = createdProducts[Math.floor(Math.random() * createdProducts.length)];
          const quantity = Math.floor(Math.random() * 50) + 10; // 10-59 quantity
          const amount = quantity * product.unitPrice;

          items.push({
            productId: product._id,
            nameSnapshot: product.name,
            quantity: quantity,
            rate: product.unitPrice,
            amount: amount,
          });

          totalAmount += amount;
        }

        // Randomize payment status
        const paymentRandom = Math.random();
        let paidAmount = 0;
        if (paymentRandom > 0.7) {
          paidAmount = totalAmount; // Fully paid
        } else if (paymentRandom > 0.4) {
          paidAmount = Math.floor(totalAmount * (Math.random() * 0.7 + 0.2)); // Partially paid
        }
        // else unpaid

        const dueAmount = totalAmount - paidAmount;

        // Create invoice with dates ranging from September to October 2025
        const dayOffset = Math.floor(Math.random() * 45) + 1; // 1-45 days ago
        const invoiceDate = new Date('2025-10-25');
        invoiceDate.setDate(invoiceDate.getDate() - dayOffset);

        const paddedNumber = String(invoiceCounter).padStart(4, '0');
        const invoiceNumber = `11010060${paddedNumber}`;

        additionalInvoices.push({
          customerId: customer._id,
          items: items,
          totalAmount: totalAmount,
          paidAmount: paidAmount,
          dueAmount: dueAmount,
          invoiceDate: invoiceDate,
          invoiceNumber: invoiceNumber,
          createdBy: createdUsers[Math.floor(Math.random() * createdUsers.length)]._id,
        });

        invoiceCounter++;
      }
    }

    const moreInvoices = await Invoice.insertMany(additionalInvoices);
    console.log(`Created ${moreInvoices.length} additional invoices for ledger testing`);

    // Update stock quantities for additional sold products
    for (const invoice of additionalInvoices) {
      for (const item of invoice.items) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stockQuantity: -item.quantity } }
        );
      }
    }
    console.log('Updated product stock quantities for additional invoices');

    // Update stock quantities for sold products
    const stockUpdates = [
      { productId: createdProducts[0]._id, sold: 200 }, // IMIDACLOPRID
      { productId: createdProducts[1]._id, sold: 350 }, // FUSE
      { productId: createdProducts[2]._id, sold: 50 }, // HITTER
      { productId: createdProducts[3]._id, sold: 45 }, // SALOON
      { productId: createdProducts[4]._id, sold: 100 }, // HY ULTRA
      { productId: createdProducts[5]._id, sold: 55 }, // ROUNDUP
      { productId: createdProducts[6]._id, sold: 80 }, // CONQUEST
      { productId: createdProducts[7]._id, sold: 70 }, // WEEDMARSH
      { productId: createdProducts[8]._id, sold: 60 }, // PESTGUARD
      { productId: createdProducts[9]._id, sold: 27 }, // CROPMASTER
      { productId: createdProducts[10]._id, sold: 100 }, // FUNGICIDE
      { productId: createdProducts[11]._id, sold: 75 }, // NEMATODE
      { productId: createdProducts[12]._id, sold: 20 }, // GROWTH BOOSTER
      { productId: createdProducts[13]._id, sold: 18 }, // SOIL CONDITIONER
      { productId: createdProducts[14]._id, sold: 8 }, // MICRO NUTRIENT
    ];

    for (const update of stockUpdates) {
      await Product.findByIdAndUpdate(
        update.productId,
        { $inc: { stockQuantity: -update.sold } }
      );
    }
    console.log('Updated product stock quantities');

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📋 Login credentials:');
    console.log('👤 Admin: admin@ledger.com / admin123');
    console.log('👤 Accountant: accountant@ledger.com / accountant123');
    console.log('👤 Manager: manager@ledger.com / manager123');
    console.log('👤 Sarah Johnson: sarah.johnson@ledger.com / password123');
    console.log('👤 Michael Chen: michael.chen@ledger.com / password123');
    console.log('👤 Emily Rodriguez: emily.rodriguez@ledger.com / password123');
    console.log('👤 David Wilson: david.wilson@ledger.com / password123');
    console.log('👤 Lisa Thompson: lisa.thompson@ledger.com / password123');
    console.log('\n📊 Sample data created:');
    console.log(`• ${createdUsers.length} users (Admin, Accountant, Manager roles)`);
    console.log(`• ${createdCustomers.length} customers (across different areas)`);
    console.log(`• ${createdProducts.length} products (pesticides, herbicides, fertilizers)`);
    console.log(`• ${createdInvoices.length + moreInvoices.length} invoices total (${createdInvoices.length} base + ${moreInvoices.length} additional)`);
    console.log(`• 10-15 invoices per customer for comprehensive ledger testing`);
    console.log(`• Invoice dates range from September to October 2025`);
    console.log(`• Mixed payment statuses: Paid, Unpaid, Partially Paid`);
    console.log('\n🏢 Areas covered: PESHAWAR, KARACHI, LAHORE, ISLAMABAD, RAWALPINDI, FAISALABAD, MULTAN, QUETTA, HYDERABAD, SIALKOT, GUJRANWALA, SARGODHA, BAHAWALPUR, SAHIWAL, JHELUM');
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

initializeDatabase();
