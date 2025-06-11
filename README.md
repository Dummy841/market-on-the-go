# AgriPay - Farm Management Dashboard

A comprehensive farm management system built with React, TypeScript, and Capacitor for cross-platform deployment.

## Features

- **Dashboard**: Overview of farm operations, sales, and analytics
- **Farmer Management**: Register and manage farmer profiles
- **Customer Management**: Handle customer data and orders
- **Product Management**: Inventory management with barcode support
- **Sales Dashboard**: Point-of-sale system with payment processing
- **Order Tracking**: Real-time order status and delivery tracking
- **Coupon System**: Discount management and promotional codes
- **Ticket System**: Customer support and issue tracking
- **Employee Management**: Role-based access control
- **Mobile App**: Native Android app with camera and offline capabilities

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **UI Components**: Radix UI, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Mobile**: Capacitor for native Android app
- **Charts**: Recharts for data visualization
- **QR/Barcode**: React QR Code, Barcode Generator
- **Authentication**: Supabase Auth with role-based permissions

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Android Studio (for mobile development)
- Java 17+ (for Android builds)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd agri-pay-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Add your Supabase credentials
```

4. Start the development server:
```bash
npm run dev
```

### Building for Android

1. Build the web application:
```bash
npm run build
```

2. Initialize Capacitor (first time only):
```bash
npx cap init
```

3. Add Android platform:
```bash
npx cap add android
```

4. Sync web assets to Android:
```bash
npx cap sync android
```

5. Open in Android Studio:
```bash
npx cap open android
```

6. Build APK or run on device from Android Studio

### Quick Android Commands

```bash
# Build and sync for Android
npm run android:build

# Open in Android Studio for development
npm run android:dev

# Run on connected Android device
npm run android:run
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Application pages/routes
├── hooks/              # Custom React hooks
├── utils/              # Utility functions and types
├── context/            # React context providers
└── integrations/       # External service integrations

android/                # Android native project files
├── app/               # Android app configuration
└── gradle/            # Gradle build configuration
```

## Features Overview

### Dashboard
- Real-time analytics and metrics
- Sales overview and trends
- Quick action buttons for common tasks

### Farmer Management
- Farmer registration with photo upload
- Bank account details management
- Product and transaction history
- Settlement tracking

### Sales System
- Barcode scanning for products
- Shopping cart with quantity management
- Multiple payment methods (Cash, UPI, Card)
- Receipt generation and printing
- Coupon application

### Mobile Features
- Native camera integration for photo capture
- Haptic feedback for better UX
- Offline data storage
- Network status monitoring
- Device information access

### Security
- Role-based access control (Admin, Manager, Sales, Accountant)
- Row-level security with Supabase
- Protected routes and API endpoints
- Secure authentication flow

## Database Schema

The application uses Supabase with the following main tables:
- `farmers` - Farmer profiles and details
- `customers` - Customer information
- `products` - Product inventory
- `categories` - Product categories
- `transactions` - Sales and payment records
- `tickets` - Support tickets
- `coupons` - Discount coupons
- `employees` - Staff management
- `roles` - Permission management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please create an issue in the repository or contact the development team.