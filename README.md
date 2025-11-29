<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🎨 Incarnate - AI Avatar & 3D Model Generator

[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?logo=vite)](https://vitejs.dev/)
[![Gemini](https://img.shields.io/badge/Gemini-3%20Pro-4285F4?logo=google)](https://ai.google.dev/)

> **Transform text descriptions into stunning AI-generated avatars, 360° videos, and production-ready 3D models** — all powered by Google's cutting-edge Gemini 3 Pro, Veo 3.1, and Tripo3D.

<div align="center">
  <img src="./Screenshot 2025-11-29 at 16.05.04.png" alt="Incarnate App Screenshot" width="800"/>
</div>

## ✨ Features

### 🎭 **Multi-Modal Avatar Generation**
- **AI-Powered Image Generation**: Create high-quality character portraits using Gemini 3 Pro Image Preview
- **360° Video Turnarounds**: Generate cinematic rotating showcases with Veo 3.1 Fast
- **3D Model Export**: Convert 2D images to fully-textured GLB 3D models via Tripo3D API

### 🧠 **Intelligent Prompt Optimization**
- Automatic prompt enhancement using Gemini 3 Pro
- Reference image support for facial likeness preservation
- Multi-style support (Cyberpunk, Fantasy, Anime, Realistic, etc.)

### 🎬 **Three Background Modes**
- **STUDIO**: Neutral backgrounds optimized for 3D reconstruction
- **IMMERSIVE**: Detailed environmental integration
- **GAMEPLAY**: Third-person video game perspective

### 🔄 **Real-Time Generation Pipeline**
- Live progress tracking with detailed logs
- Phase-by-phase status updates (Image → Video → 3D)
- Comprehensive error handling and retry logic

### 🎨 **Modern UI/UX**
- Sleek glassmorphism design with gradient accents
- Responsive layout with animated backgrounds
- Real-time preview and download capabilities

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher)
- **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/apikey)
- **Tripo3D API Key** (embedded in code for demo purposes)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tpandya42/Incarnate.git
   cd Incarnate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:3000`

## 📖 Usage

### Basic Workflow

1. **Enter Character Details**
   - Name: Give your avatar a unique identity
   - Description: Detailed appearance and personality traits
   - Art Style: Choose from Cyberpunk, Fantasy, Anime, etc.

2. **Upload Reference Image (Optional)**
   - Upload a photo for facial likeness preservation
   - Supports JPG, PNG formats

3. **Generate Assets**
   - Click "Generate Avatar + Video + 3D Model"
   - Monitor real-time progress through the generation pipeline
   - View logs for detailed status updates

4. **Download & Use**
   - Avatar Image: High-resolution PNG/JPEG
   - 360° Video: MP4 format
   - 3D Model: GLB format with PBR textures

### Example Prompts

**Cyberpunk Hacker**
```
Name: Nova
Description: Female hacker with neon blue hair, cybernetic eye implant, 
wearing a leather jacket with glowing circuitry patterns
Style: Cyberpunk anime, neon lights, futuristic
```

**Fantasy Warrior**
```
Name: Thorin
Description: Dwarven warrior with braided red beard, ornate armor, 
wielding a glowing battle axe
Style: Epic fantasy, realistic, cinematic lighting
```

## 🏗️ Architecture

### Technology Stack

**Frontend**
- React 19.2.0 with TypeScript
- Vite 6.2.0 for blazing-fast builds
- TailwindCSS for utility-first styling

**AI Services**
- **Gemini 3 Pro Preview**: Prompt optimization & critique
- **Gemini 3 Pro Image Preview**: Image generation (2K, 1:1 aspect ratio)
- **Veo 3.1 Fast**: Video generation (720p, 16:9)
- **Tripo3D API v2**: Image-to-3D conversion with PBR textures

### Project Structure
```
Incarnate/
├── components/           # React components
│   ├── ApiKeySelector.tsx
│   ├── AudioRecorder.tsx
│   ├── ImageUpload.tsx
│   ├── LipsyncPreview.tsx
│   ├── LoadingOverlay.tsx
│   └── ModelViewer.tsx
├── services/            # API integrations
│   ├── geminiService.ts  # Gemini API logic
│   └── tripoService.ts   # Tripo3D API logic
├── App.tsx              # Main application component
├── types.ts             # TypeScript type definitions
├── vite.config.ts       # Vite configuration
└── package.json         # Dependencies
```

## 🔌 API Integration

### Gemini API
- **Model**: `gemini-3-pro-preview`, `gemini-3-pro-image-preview`
- **Video**: `veo-3.1-fast-generate-preview`
- **Configuration**: Environment variable `GEMINI_API_KEY`

### Tripo3D API
- **Endpoint**: `https://api.tripo3d.ai/v2/openapi`
- **Model Version**: `v2.5-20250123`
- **Features**: PBR textures, auto-sizing, rendered previews

## 🛠️ Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Type Checking
```bash
npx tsc --noEmit
```

## 🎯 Key Features Implementation

### Prompt Optimization Pipeline
1. User input → Gemini 3 Pro analysis
2. Multimodal processing (text + reference image)
3. Critical requirements injection (T-pose, single character, clean background)
4. Return optimized generation prompt

### Critique & Refinement Loop
1. Generate initial image
2. Gemini analyzes against original brief (score 0-100)
3. If score < threshold, refine prompt automatically
4. Regenerate with improvements

### 3D Model Generation
1. Upload base64 image to Tripo3D
2. Receive file token
3. Start image-to-model task
4. Poll for completion (progress tracking)
5. Download GLB with PBR textures + preview renders

## 🔐 Security Notes

- API keys stored in environment variables (`.env.local`)
- Tripo3D key hardcoded for demo (replace in production)
- CORS proxy configured in Vite for development

## 🐛 Troubleshooting

### Common Issues

**"API Key not found"**
- Ensure `GEMINI_API_KEY` is set in `.env.local`
- Restart dev server after adding environment variables

**Video generation fails**
- Check Gemini API quota limits
- Verify Veo 3.1 model availability
- Review retry logic in `geminiService.ts`

**3D model download fails**
- Tripo3D URLs expire in 5 minutes
- Model is downloaded immediately and converted to blob URL
- Check browser console for detailed errors

**CORS errors with Tripo3D**
- Verify Vite proxy configuration in `vite.config.ts`
- Ensure `/tripo-api` prefix is used in development

## 📚 Additional Resources

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Veo Video Generation](https://ai.google.dev/docs/veo)
- [Tripo3D API Docs](https://platform.tripo3d.ai/docs)
- [React 19 Documentation](https://react.dev/)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Tanmay Pandya**
- GitHub: [@tpandya42](https://github.com/tpandya42)

## 🌟 Acknowledgments

- Google AI for Gemini & Veo APIs
- Tripo3D for 3D model generation
- React & Vite communities

---

<div align="center">
  <p>Built with ❤️ using Gemini 3 Pro, Veo 3.1, and Tripo3D</p>
  <p>View in AI Studio: https://ai.studio/apps/drive/1y0QVIC-ri8A5RuLSrEWFt5ongFN5hU_L</p>
</div>
