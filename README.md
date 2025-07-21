# EEF Toolkit 2.0

Advanced analytics and planning tool for ESPN Eredivisie Fantasy (EEF) - built with Next.js, TypeScript, and Tailwind CSS.

## 🎯 Overview

EEF Toolkit 2.0 provides FPL-level analytical and planning capabilities for the ESPN Eredivisie Fantasy league. It's designed as a desktop Next.js web application that serves pre-generated JSON datasets with an internally constructed normalized API.

## ✨ Features

### Core Features (v1)
- **Squad Planner**: Formation visualization with drag & drop, scenario save/load
- **Free Transfers System**: Complete transfer management with free transfers, saved transfers, and point penalties
- **FDR Analysis**: Attack & defence difficulty ratings with horizon rankings
- **Price Change Monitor**: Track price movements and ownership changes
- **Player Analytics**: Enriched player tables with FBref integration
- **Localization**: Dutch and English language support

### Data Pipeline
- **Raw Ingestion**: Reverse-engineered ESPN EEF endpoints
- **Normalization**: Internal API with enriched player data
- **Static Delivery**: Pre-computed metrics for optimal performance
- **Data Integrity**: Manifest validation and freshness checks

### Free Transfers System
The squad planner now includes a comprehensive free transfers system that mirrors real EEF rules:

- **Unlimited Pre-Season**: Unlimited free transfers before gameweek 1 starts
- **Free Transfers**: 1 free transfer per gameweek (starting from gameweek 2)
- **Transfer Banking**: Save unused transfers for future gameweeks (max 5)
- **Point Penalties**: Extra transfers cost 4 points each
- **Transfer History**: Track all transfers with costs and timestamps
- **Gameweek Navigation**: Free transfers update automatically when changing gameweeks
- **Visual Indicators**: Clear display of available transfers and transfer costs

**Transfer Rules:**
- Users have unlimited free transfers before gameweek 1 starts
- Users get their first free transfer after gameweek 1 ends (before gameweek 2 starts)
- Unused transfers can be saved and carried forward
- Maximum of 5 free transfers can be accumulated
- Each extra transfer beyond free transfers costs 4 points
- Transfer history is maintained across all gameweeks

## 🏗️ Architecture

```
Raw Ingestion → Normalization → Type Generation + Build → Static Next.js App → Client Planner
```

### Data Flow
1. **Fetch Raw**: ESPN EEF endpoints via reverse engineering
2. **Normalize**: Transform to internal API format
3. **Enrich**: Merge with FBref data and price history
4. **Generate**: TypeScript types and static assets
5. **Serve**: Static Next.js app with client-side state management

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

### Step 1: Data Pipeline ✅ COMPLETED

The data ingestion pipeline has been successfully implemented:

1. **Raw Data Ingestion** (`npm run ingest`)
   - Fetches data from ESPN EEF API (espngoal.nl)
   - Supports bootstrap-static, my-team, and account-info endpoints
   - Configurable via environment variables
   - Timestamped data storage

2. **Data Normalization** (`npm run normalize`)
   - Processes raw JSON into structured internal format
   - Normalizes teams, players, events, and game settings
   - Generates individual JSON files for each data type
   - Creates comprehensive normalized-data.json

3. **Type Generation** (`npm run generate-types`)
   - Auto-generates TypeScript types from normalized data
   - Creates comprehensive type definitions for all entities
   - Includes API response types and utility interfaces
   - Supports filtering, sorting, and pagination

4. **Internal API** 
   - RESTful API endpoints for players and teams
   - Advanced filtering and sorting capabilities
   - Pagination support
   - Error handling and validation

**Data Statistics:**
- ✅ 18 Teams (Ajax, AZ, Feyenoord, etc.)
- ✅ 505 Players across all positions
- ✅ 34 Gameweeks (Speelronde 1-34)
- ✅ Complete game settings and scoring rules
- ✅ Position types: GK (67), DEF (153), MID (226), FWD (59)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eef-tool-2.0
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Data Ingestion

1. **Run data ingestion**
   ```bash
   npm run ingest
   ```

2. **Normalize data**
   ```bash
   npm run normalize
   ```

3. **Generate types**
   ```bash
   npm run generate-types
   ```

## 📁 Project Structure

```
eef-tool-2.0/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Reusable React components
│   ├── lib/                 # Utility functions and stores
│   └── types/               # TypeScript type definitions
├── data/
│   ├── raw/                 # Raw ESPN data snapshots
│   └── internal/            # Normalized internal API
├── scripts/                 # Data processing scripts
└── docs/                    # Documentation
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run ingest` - Fetch raw ESPN data
- `npm run normalize` - Normalize raw data
- `npm run generate-types` - Generate TypeScript types

### Key Components

#### Formation Validator
Enforces positional constraints for valid XI + bench combinations:
- 1 GK (always)
- 3-5 DEF
- 3-5 MID  
- 1-3 FWD
- Total: 15 players (11 starting + 4 bench)

#### FDR Calculator
Computes fixture difficulty ratings using xG data:
- Attack FDR: How easy it is to score against opponent
- Defence FDR: How easy it is to keep clean sheet
- Horizon rankings: Aggregated difficulty over N gameweeks

#### State Management
Zustand store with three slices:
- **Preferences**: Language, theme, auto-save settings
- **Scenarios**: Squad scenarios with save/load/export
- **Planner**: Current formation, selected players, budget

## 📊 Data Sources

### ESPN EEF Endpoints
- `bootstrap-static`: Players, teams, game settings
- `fixtures`: Match data and results
- `teams`: Team statistics
- `price-history`: Player price and ownership data

### FBref Integration
- xG and xA data
- Advanced metrics
- Performance analytics

## 🎨 UI Components

### Core Components
- `NavBar`: Navigation with language switcher
- `PlayerTable`: Sortable/filterable player data
- `PitchFormation`: Visual squad builder
- `BenchBar`: Bench management
- `FDRTicker`: Real-time difficulty display
- `ScenarioList`: Scenario management

### Design System
- **Colors**: Primary blue, secondary gray palette
- **Typography**: Inter font family
- **Components**: Tailwind CSS utility classes
- **Responsive**: Mobile-first design

## 🔧 Configuration

### Environment Variables
```bash
# ESPN API Configuration
ESPN_LEAGUE_ID=123456
ESPN_SEASON=2024

# Data Processing
DATA_UPDATE_INTERVAL=7200000  # 2 hours
MAX_RETRIES=3

# Build Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Build Settings
- **Static Export**: Optimized for static hosting
- **Type Generation**: Automatic from JSON schemas
- **Code Splitting**: Lazy-loaded components
- **Performance**: Lighthouse score target ≥90

## 🧪 Testing

### Test Strategy
- **Unit Tests**: Formation validator, FDR calculator
- **Component Tests**: React Testing Library
- **E2E Tests**: Playwright for critical user flows
- **Data Integrity**: Manifest validation

### Running Tests
```bash
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:coverage # Coverage report
```

## 📈 Performance

### Optimization Targets
- **Lighthouse Desktop**: ≥90
- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <2.5s
- **Pitch Drag Performance**: ≤16ms average frame

### Performance Strategies
- Pre-computed metrics at build time
- Code splitting for heavy components
- Virtualized tables for large datasets
- Static asset optimization

## 🔒 Security

### Data Protection
- No raw API calls from client
- Internal API only serves normalized data
- No authentication tokens in client code
- Static delivery prevents data leakage

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repository
2. Configure build settings
3. Set environment variables
4. Deploy automatically

### Manual Deployment
```bash
npm run build
npm run export
# Deploy out/ directory to static hosting
```

## 📝 Roadmap

### v1.0 (Current)
- [x] Basic project structure
- [x] Formation validation
- [x] FDR calculation
- [x] State management
- [x] Data ingestion pipeline
- [x] Player analysis page
- [ ] Squad planner
- [ ] Price monitoring

### Future Versions
- **v1.1**: FBref integration, advanced analytics
- **v1.2**: Mobile optimization, PWA features
- **v2.0**: Multi-user support, notifications
- **v2.1**: Machine learning predictions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- ESPN for the fantasy football platform
- FBref for advanced statistics
- Next.js team for the excellent framework
- Tailwind CSS for the utility-first approach

---

**Note**: This tool is for educational and personal use. Please respect ESPN's terms of service and rate limits when fetching data. 