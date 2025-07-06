# 5Rivers Trucking Frontend

A modern React-based frontend application for the 5Rivers Trucking management system, built with Vite, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Modern UI Components**: Built with Radix UI and shadcn/ui for professional, accessible components
- **GraphQL Integration**: Apollo Client for efficient data fetching from Neo4j backend
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Type Safety**: Full TypeScript implementation
- **Professional Design System**: Logistics-themed color palette and consistent styling

## 🛠️ Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Data Fetching**: Apollo Client with GraphQL
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Animations**: Tailwind CSS animations with Framer Motion support

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (buttons, cards, etc.)
│   ├── modals/          # Modal components for forms and views
│   ├── Layout.tsx       # Main application layout
│   └── AppSidebar.tsx   # Navigation sidebar
├── pages/               # Page components
│   ├── Dashboard.tsx    # Main dashboard
│   ├── Companies.tsx    # Company management
│   ├── Drivers.tsx      # Driver management
│   ├── Units.tsx        # Fleet management
│   ├── Dispatchers.tsx  # Dispatcher management
│   ├── Jobs.tsx         # Job management
│   ├── JobTypes.tsx     # Job type configuration
│   ├── Invoices.tsx     # Invoice management
│   └── NotFound.tsx     # 404 page
├── lib/                 # Utility libraries
│   ├── graphql/         # GraphQL queries and mutations
│   ├── apollo-client.ts # Apollo Client configuration
│   ├── config.ts        # Application configuration
│   └── utils.ts         # Utility functions
├── hooks/               # Custom React hooks
├── index.css           # Global styles and design system
└── main.tsx            # Application entry point
```

## ⚙️ Environment Configuration

### Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables:**

### Environment Variables

#### API Configuration
```env
VITE_API_URL=http://localhost:4001          # Backend API URL
VITE_GRAPHQL_ENDPOINT=http://localhost:4001/graphql  # GraphQL endpoint
```

#### Application Settings
```env
VITE_APP_NAME="5Rivers Trucking"            # Application display name
VITE_APP_VERSION=1.0.0                      # Application version
```

#### Development Server
```env
VITE_DEV_PORT=3000                          # Development server port
VITE_DEV_HOST=localhost                     # Development server host
```

#### UI Configuration
```env
VITE_PAGINATION_PAGE_SIZE=20                # Default pagination size
VITE_SEARCH_DEBOUNCE_MS=300                 # Search input debounce delay
VITE_MAX_FILE_SIZE=10485760                 # Max file size (10MB)
```

#### User Experience
```env
VITE_TOAST_DURATION=5000                    # Toast notification duration (ms)
VITE_CACHE_DURATION_MS=300000               # Cache duration (5 minutes)
```

All variables have sensible defaults and only need to be customized if you want different values.

## 🎨 Design System

### Color Palette
- **Primary**: Professional blue (`#2563eb`) for main actions
- **Accent**: Orange (`#f59e0b`) for highlights and CTAs
- **Entity-Specific Gradients**:
  - Companies: Blue gradient
  - Drivers: Green gradient  
  - Units: Purple gradient
  - Dispatchers: Orange gradient
  - Jobs: Teal gradient
  - Job Types: Indigo gradient
  - Invoices: Emerald gradient

### Typography
- **Font**: System fonts with fallbacks
- **Hierarchy**: Consistent text sizing and spacing
- **Accessibility**: Proper contrast ratios

### Components
- **Cards**: Gradient backgrounds with shadow system
- **Buttons**: Gradient styling with hover effects
- **Modals**: Professional slide-in dialogs
- **Forms**: Consistent input styling and validation

## 🔧 Setup and Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## 🌐 GraphQL Integration

The application connects to a Neo4j-powered GraphQL backend with:

- **Companies**: CRUD operations for client management
- **Drivers**: Fleet driver management
- **Units**: Vehicle and equipment tracking
- **Dispatchers**: Staff management
- **Jobs**: Delivery job management
- **Job Types**: Job categorization
- **Invoices**: Billing and payment tracking

### Apollo Client Configuration
- Automatic error handling
- Optimistic updates
- Cache management
- Loading states

## 📱 Features by Page

### Dashboard
- Business metrics overview
- Recent job activity
- Quick action buttons
- Revenue tracking

### Companies
- Client directory with contact information
- Active job counts
- Add/edit company forms
- Job history views

### Drivers (Planned)
- Driver profiles and credentials
- Assignment tracking
- Performance metrics
- Document management

### Units (Planned)
- Fleet vehicle inventory
- Maintenance tracking
- Assignment status
- Equipment details

### Dispatchers (Planned)
- Staff directory
- Job assignments
- Performance tracking
- Communication tools

### Jobs (Planned)
- Job creation and management
- Route planning
- Status tracking
- Assignment workflows

### Job Types (Planned)
- Service categories
- Pricing templates
- Requirements configuration
- Default settings

### Invoices (Planned)
- Billing generation
- Payment tracking
- Financial reporting
- Export capabilities

## 🎯 Next Steps

1. **Complete Page Implementation**: Finish all entity management pages
2. **Enhanced Forms**: Add validation and error handling
3. **Real-time Updates**: WebSocket integration for live data
4. **Advanced Features**: Filtering, searching, and sorting
5. **Mobile Optimization**: Progressive Web App features
6. **Performance**: Code splitting and lazy loading

## 🔒 Security

- Environment-based configuration
- Secure GraphQL endpoints
- Input validation and sanitization
- Authentication integration ready

## 📄 License

Private - 5Rivers Trucking Inc.

---

Built with ❤️ for modern trucking operations.
