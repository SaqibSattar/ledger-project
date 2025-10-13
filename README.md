# Ledger & Invoicing System

A comprehensive full-stack ledger and invoicing system built with Next.js 15+, MongoDB, and NextAuth for managing customers, products, invoices, and generating customer ledgers.

## Features

- **User Management**: Role-based access control (Admin, Accountant)
- **Customer Management**: Create and manage customer profiles
- **Product Management**: Inventory tracking with stock alerts
- **Invoice Generation**: Create invoices with automatic calculations
- **Ledger Generation**: Auto-generated customer account statements with running balances
- **Search & Filtering**: Advanced filtering across all entities
- **Responsive Design**: Modern UI built with Tailwind CSS

## Tech Stack

- **Frontend & Backend**: Next.js 15+ (App Router)
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth with JWT strategy
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **UI Components**: Custom components with Radix UI primitives

## Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ledger-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/ledger-system
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   JWT_SECRET=your-jwt-secret-here
   ```

4. **Initialize the database**
   ```bash
   node scripts/init-db.js
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Default Login Credentials

After running the initialization script:

- **Admin**: admin@ledger.com / admin123
- **Accountant**: accountant@ledant.com / accountant123

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── customers/         # Customer management
│   ├── products/          # Product management
│   ├── invoices/          # Invoice management
│   └── ledger/            # Ledger generation
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   ├── forms/            # Form components
│   └── layout/           # Layout components
├── lib/                   # Utility functions
├── models/                # MongoDB models
└── types/                 # TypeScript type definitions
```

## Key Features Explained

### Customer Management
- Create customer profiles with name, area, and role
- Search and filter customers by name or area
- Edit and delete customer records

### Product Management
- Add products with pricing, stock tracking, and registration details
- Low stock alerts and inventory management
- Optional registration number and validity tracking

### Invoice Generation
- Select customer and products to create invoices
- Automatic calculation of totals and amounts
- Stock quantity updates upon invoice creation
- Payment tracking and due amount calculations

### Ledger Generation
- Auto-generated customer account statements
- Running balance calculations
- Filter by date range, customer, area, or user
- Summary statistics (total credit, paid, current balance)

## API Endpoints

- `GET/POST /api/customers` - Customer CRUD operations
- `GET/POST /api/products` - Product CRUD operations
- `GET/POST /api/invoices` - Invoice CRUD operations
- `GET /api/ledger` - Generate customer ledgers
- `POST /api/users` - User management (admin only)

## Database Models

### User
- name, email, password (hashed), role, timestamps

### Customer
- name, area, role, createdBy, timestamps

### Product
- name, description, unitPrice, stockQuantity, unit, minStockAlert, registrationNumber, registrationValidUpto, createdBy, timestamps

### Invoice
- customerId, items[], totalAmount, paidAmount, dueAmount, invoiceDate, invoiceNumber, createdBy, timestamps

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the repository.