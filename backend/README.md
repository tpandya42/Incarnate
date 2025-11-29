# Incarnate Backend API

Express.js backend server for the Incarnate AI Avatar Generation platform.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Development mode
npm run dev

# Production build
npm run build
npm start
```

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `8080` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `GEMINI_API_KEY` | Yes | - | Google Gemini API key |
| `TRIPO_API_KEY` | Yes | - | Tripo3D API key |
| `CORS_ORIGINS` | No | `http://localhost:3000,http://localhost:3001` | Allowed origins |

## 📡 API Endpoints

### Health Check

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server status |
| `/api/health/ready` | GET | Service readiness |
| `/api/health/live` | GET | Liveness probe |

### Avatar Generation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/avatar/optimize-prompt` | POST | Optimize character prompt |
| `/api/avatar/generate-image` | POST | Generate avatar image |
| `/api/avatar/critique` | POST | Critique generated image |
| `/api/avatar/refine-prompt` | POST | Refine prompt based on critique |
| `/api/avatar/generate-video` | POST | Generate 360° video |
| `/api/avatar/generate-all` | POST | Full pipeline generation |

### 3D Model Generation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/model3d/generate` | POST | Start 3D model generation |
| `/api/model3d/task/:taskId` | GET | Check task status |
| `/api/model3d/download` | POST | Download model (proxy) |

### Voice Studio

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/voice/analyze` | POST | Analyze voice sample |
| `/api/voice/synthesize` | POST | Generate speech |
| `/api/voice/visemes` | POST | Generate lip-sync visemes |
| `/api/voice/analyze-mouth` | POST | Analyze mouth coordinates |

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config/
│   │   └── index.ts          # Environment configuration
│   ├── middleware/
│   │   └── index.ts          # Express middleware
│   ├── routes/
│   │   ├── index.ts          # Route exports
│   │   ├── avatar.routes.ts  # Avatar endpoints
│   │   ├── model3d.routes.ts # 3D model endpoints
│   │   ├── voice.routes.ts   # Voice endpoints
│   │   └── health.routes.ts  # Health endpoints
│   ├── services/
│   │   ├── index.ts          # Service exports
│   │   ├── gemini.service.ts # Gemini API integration
│   │   └── tripo.service.ts  # Tripo3D API integration
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   └── validators/
│       └── index.ts          # Zod validation schemas
├── .env.example              # Environment template
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── README.md                 # This file
```

## 🔒 Security Notes

- API keys are stored server-side, never exposed to client
- Input validation with Zod on all endpoints
- CORS configured for specific origins only
- Error messages sanitized in production

## 📝 License

MIT © Incarnate Team
