# 🚀 Incarnate - Deployment Guide

> Complete guide for deploying the Incarnate avatar generation platform to production environments.

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Build Process](#build-process)
4. [Deployment Platforms](#deployment-platforms)
5. [Backend API Setup](#backend-api-setup)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring & Analytics](#monitoring--analytics)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Checklist

### 1. Code Quality

- [ ] All TypeScript errors resolved (`npx tsc --noEmit`)
- [ ] Console logs removed or replaced with proper logging
- [ ] Error boundaries implemented
- [ ] Loading states for all async operations
- [ ] Responsive design tested on mobile/tablet/desktop

### 2. Security

- [ ] API keys moved to environment variables
- [ ] Backend proxy implemented for sensitive API calls
- [ ] Input sanitization in place
- [ ] CORS properly configured
- [ ] Rate limiting implemented

### 3. Performance

- [ ] Images optimized (compressed)
- [ ] Code splitting configured
- [ ] Lazy loading for heavy components
- [ ] Bundle size analyzed (`npm run build` and check dist/)
- [ ] Lighthouse score > 90

### 4. SEO & Meta Tags

- [ ] Meta description added
- [ ] Open Graph tags configured
- [ ] Favicon created
- [ ] robots.txt configured
- [ ] sitemap.xml generated

---

## 🔐 Environment Configuration

### Development Environment

**File**: `.env.local`
```env
# Gemini API
GEMINI_API_KEY=AIzaSy...

# Tripo3D API (move to backend in production)
TRIPO_API_KEY=tsk_...

# Development Settings
NODE_ENV=development
VITE_APP_URL=http://localhost:3000
```

### Production Environment

**Recommended Structure**:
```env
# Frontend Environment (.env.production)
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_APP_URL=https://yourdomain.com

# Backend Environment (server .env)
GEMINI_API_KEY=AIzaSy...
TRIPO_API_KEY=tsk_...
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Environment Variable Access

**Update `vite.config.ts`**:
```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      // Only expose non-sensitive vars to frontend
      'process.env.API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
    },
    // Remove API key definitions for production
  };
});
```

---

## 🏗️ Build Process

### Production Build

```bash
# Install dependencies
npm ci --production=false

# Type check
npx tsc --noEmit

# Build for production
npm run build

# Preview production build locally
npm run preview
```

**Build Output** (`dist/`):
```
dist/
├── assets/
│   ├── index-[hash].js      # Main bundle
│   ├── index-[hash].css     # Styles
│   └── vendor-[hash].js     # Dependencies
├── index.html
└── vite.svg
```

### Bundle Analysis

```bash
# Install analyzer
npm install --save-dev rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});

# Build and analyze
npm run build
```

### Optimization Tips

**Code Splitting**:
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ai-services': ['@google/genai'],
        },
      },
    },
  },
});
```

**Compression**:
```typescript
// vite.config.ts
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
});
```

---

## 🌐 Deployment Platforms

### Option 1: Vercel (Recommended)

**Why Vercel?**
- Seamless Vite integration
- Automatic HTTPS
- Edge functions for API proxy
- Zero-config deployment

**Steps**:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Configure `vercel.json`**
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite",
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "/api/:path*"
       }
     ],
     "env": {
       "VITE_API_BASE_URL": "https://yourdomain.com/api"
     }
   }
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add GEMINI_API_KEY production
   vercel env add TRIPO_API_KEY production
   ```

**API Route Example** (`api/generate.ts`):
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, options } = req.body;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: prompt,
      config: options,
    });

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
```

---

### Option 2: Netlify

**Steps**:

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Configure `netlify.toml`**
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200

   [[redirects]]
     from = "/tripo-api/*"
     to = "https://api.tripo3d.ai/:splat"
     status = 200
     force = true
   ```

3. **Create Netlify Function** (`.netlify/functions/generate.ts`):
   ```typescript
   import type { Handler } from '@netlify/functions';
   import { GoogleGenAI } from '@google/genai';

   export const handler: Handler = async (event) => {
     if (event.httpMethod !== 'POST') {
       return { statusCode: 405, body: 'Method Not Allowed' };
     }

     const { prompt, options } = JSON.parse(event.body || '{}');
     const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

     try {
       const response = await ai.models.generateContent({
         model: 'gemini-3-pro-image-preview',
         contents: prompt,
         config: options,
       });

       return {
         statusCode: 200,
         body: JSON.stringify(response),
       };
     } catch (error: any) {
       return {
         statusCode: 500,
         body: JSON.stringify({ error: error.message }),
       };
     }
   };
   ```

4. **Deploy**
   ```bash
   netlify deploy --prod
   ```

---

### Option 3: Docker + Cloud Run

**Why Docker?**
- Complete environment control
- Easy scaling
- Works with any cloud provider (GCP, AWS, Azure)

**Dockerfile**:
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**:
```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

**Deploy to Google Cloud Run**:
```bash
# Build image
docker build -t incarnate-app .

# Tag for GCR
docker tag incarnate-app gcr.io/YOUR_PROJECT/incarnate-app

# Push to registry
docker push gcr.io/YOUR_PROJECT/incarnate-app

# Deploy to Cloud Run
gcloud run deploy incarnate-app \
  --image gcr.io/YOUR_PROJECT/incarnate-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

### Option 4: Traditional VPS (DigitalOcean, Linode)

**Setup Script** (`deploy.sh`):
```bash
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone https://github.com/tpandya42/Incarnate.git
cd Incarnate

# Install dependencies
npm ci

# Build app
npm run build

# Install serve
npm install -g serve

# Start with PM2
pm2 start "serve -s dist -p 3000" --name incarnate-app

# Setup nginx reverse proxy
sudo apt install -y nginx

# Create nginx config
sudo tee /etc/nginx/sites-available/incarnate <<EOF
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/incarnate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL with Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔌 Backend API Setup

### Express.js Backend Template

**File**: `backend/server.js`

```javascript
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});
app.use('/api/', limiter);

// Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Routes
app.post('/api/optimize-prompt', async (req, res) => {
  try {
    const { name, description, style, scenario, backgroundMode } = req.body;
    
    // Validate input
    if (!name || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Call Gemini API
    const model = 'gemini-3-pro-preview';
    const response = await ai.models.generateContent({
      model,
      contents: `Optimize prompt: ${name}, ${description}, ${style}...`,
    });

    res.json({ prompt: response.text });
  } catch (error) {
    console.error('Prompt optimization error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, referenceImageBase64 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const model = 'gemini-3-pro-image-preview';
    const contents = [{ text: prompt }];

    if (referenceImageBase64) {
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: referenceImageBase64,
        },
      });
    }

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        imageConfig: {
          aspectRatio: '1:1',
          imageSize: '2K',
        },
      },
    });

    const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    
    if (!imageData) {
      return res.status(500).json({ error: 'No image generated' });
    }

    res.json({
      data: imageData.data,
      mimeType: imageData.mimeType,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-video', async (req, res) => {
  try {
    const { referenceImage, prompt } = req.body;

    if (!referenceImage || !prompt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const model = 'veo-3.1-fast-generate-preview';
    
    let operation = await ai.models.generateVideos({
      model,
      prompt,
      image: {
        imageBytes: referenceImage.data,
        mimeType: referenceImage.mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9',
      },
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    if (operation.error) {
      throw new Error(operation.error.message);
    }

    const videoUrl = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUrl) {
      throw new Error('No video URL in response');
    }

    res.json({ videoUrl });
  } catch (error) {
    console.error('Video generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy for Tripo3D (to hide API key)
app.post('/api/tripo/:endpoint', async (req, res) => {
  try {
    const { endpoint } = req.params;
    const response = await fetch(`https://api.tripo3d.ai/v2/openapi/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TRIPO_API_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Tripo API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
```

**Package.json**:
```json
{
  "name": "incarnate-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "@google/genai": "^1.30.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "express-rate-limit": "^6.7.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
```

### Update Frontend Service Layer

**File**: `services/geminiService.ts`

```typescript
// Replace direct API calls with backend proxy
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const optimizePrompt = async (...params): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/api/optimize-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.prompt;
};
```

---

## ⚡ Performance Optimization

### 1. Image Optimization

**Compress images before upload**:
```typescript
const compressImage = async (base64: string, maxSizeKB: number = 500): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = `data:image/jpeg;base64,${base64}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Resize if too large
      const maxDimension = 2048;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx!.drawImage(img, 0, 0, width, height);

      // Compress
      let quality = 0.9;
      let result = canvas.toDataURL('image/jpeg', quality);
      
      while (result.length > maxSizeKB * 1024 && quality > 0.5) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }

      resolve(result.split(',')[1]);
    };
  });
};
```

### 2. Lazy Loading

```typescript
// Lazy load heavy components
const ModelViewer = lazy(() => import('./components/ModelViewer'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {model3DUrl && <ModelViewer modelUrl={model3DUrl} />}
    </Suspense>
  );
}
```

### 3. Service Worker (PWA)

**File**: `public/service-worker.js`

```javascript
const CACHE_NAME = 'incarnate-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/index.js',
  '/assets/index.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

---

## 📊 Monitoring & Analytics

### 1. Error Tracking (Sentry)

```bash
npm install @sentry/react
```

**Setup**:
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});

// Wrap app
<Sentry.ErrorBoundary fallback={<ErrorPage />}>
  <App />
</Sentry.ErrorBoundary>
```

### 2. Analytics (Google Analytics 4)

```html
<!-- index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**Track Events**:
```typescript
const trackGeneration = (phase: string) => {
  gtag('event', 'avatar_generation', {
    event_category: 'generation',
    event_label: phase,
  });
};
```

### 3. Performance Monitoring

```typescript
// Log performance metrics
const logPerformance = (label: string, duration: number) => {
  console.log(`[Performance] ${label}: ${duration}ms`);
  
  // Send to analytics
  gtag('event', 'timing_complete', {
    name: label,
    value: duration,
    event_category: 'performance',
  });
};

// Usage
const startTime = performance.now();
await generateAvatarImage(prompt);
logPerformance('image_generation', performance.now() - startTime);
```

---

## 🐛 Troubleshooting

### Common Issues

#### Build Fails with TypeScript Errors

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npx tsc --noEmit
npm run build
```

#### Environment Variables Not Working

```bash
# Ensure .env.local exists and has correct format
cat .env.local

# Restart dev server
npm run dev
```

#### CORS Errors in Production

**Fix in backend**:
```javascript
app.use(cors({
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true,
}));
```

#### Video/3D Generation Timeouts

**Increase timeout limits**:
```typescript
const maxWaitMs = 600000; // 10 minutes
```

**Check API quotas**:
```bash
# View Gemini API usage
https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
```

---

## 📞 Support

**Deployment Issues**: [GitHub Issues](https://github.com/tpandya42/Incarnate/issues)  
**Platform-Specific Help**:
- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com)
- [Google Cloud Run Docs](https://cloud.google.com/run/docs)

---

<div align="center">
  <p><strong>Deployment Guide v1.0</strong></p>
  <p>Happy Deploying! 🚀</p>
</div>
