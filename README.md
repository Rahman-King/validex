# Validex - Intelligent AI Verification System

A multi-tier AI routing and verification system with suggestion-based verification architecture. Uses multiple AI models (Bohr, Gemini, local Ollama) to provide comprehensive data verification and validation.

## Features

### Core Architecture
- **Intelligent Routing**: Uses Qwen2.5:0.5b via Ollama for smart request classification (local, 3GB RAM)
- **Suggestion-Based Verification**: Multi-model suggestion system where Bohr and Gemini provide suggestions, local model synthesizes final decision
- **Multi-Tier Architecture**: 
  - Tier 1: 6 cost-effective models (Minimax M3, Llama 3 8B, Mistral 7B, Gemma 7B, Qwen 7B, Phi-3 Mini 128K)
  - Tier 2: 7 high-performance models (Kimi K2P6, Llama 3 70B, Mixtral 8x7B, DeepSeek R1, Qwen 72B, Codestral 22B, Gemma 2 27B)
- **Three-Stage Verification**: Structural validation, content verification, anomaly detection
- **Bohr API Integration**: Scientific data verification via Bohrium microservice
- **Gemini API Integration**: Content quality assessment and fact-checking
- **Local Model Synthesis**: Ollama-based final decision synthesis from multiple suggestions

### Verification Features
- **PII Detection**: Automatically detects personally identifiable information
- **Bias Detection**: Identifies potential bias in content
- **Hallucination Detection**: Detects AI hallucinations and uncertainty language
- **Scientific Verification**: Formula validation, numerical analysis, outlier detection
- **Online Research**: Google, ArXiv, Wikipedia, Scholar integration for fact-checking
- **Anomaly Detection**: Statistical outlier detection and consistency checks

### Cost Optimization
- Token budget management
- Prompt compression
- Semantic caching
- Dynamic model selection based on complexity
- Local router for zero-cost routing decisions

## Prerequisites

- Node.js 20+
- Fireworks API Key ([Get one here](https://fireworks.ai/))
- Gemini API Key ([Get one here](https://ai.google.dev/))
- Bohrium API Key ([Get one here](https://www.bohrium.com/settings/user))
- Ollama with Qwen2.5:0.5b model ([Install Ollama](https://ollama.com/))
- Python 3.8+ (for Bohr microservice)
- Docker (for containerized deployment)

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env and add your API keys
# FIREWORKS_API_KEY=your_actual_api_key_here
# GEMINI_API_KEY=your_gemini_api_key
# BOHR_ACCESS_KEY=your_bohr_access_key
# BOHR_APP_KEY=dev

# Pull and build the Qwen router model with Ollama
ollama pull qwen2.5:0.5b
ollama create qwen-router -f Modelfile

# Pull synthesis model for local decision making
ollama pull llama3:8b

# Install Bohr microservice dependencies
cd services
pip install -r requirements.txt
cd ..
```

## Development

```bash
# Start Bohr microservice (in separate terminal)
cd services
python bohr-service.py

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### Using Docker directly

```bash
# Build Docker image
docker build -t validex .

# Run container with environment variables
docker run -d \
  -p 3000:3000 \
  -e FIREWORKS_API_KEY=your_api_key_here \
  -e GEMINI_API_KEY=your_gemini_key \
  -e BOHR_ACCESS_KEY=your_bohr_key \
  -e OLLAMA_ROUTER=true \
  validex

# Or use env file
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  validex
```

## Environment Variables

### Required
- `FIREWORKS_API_KEY`: Your Fireworks API key
- `GEMINI_API_KEY`: Your Gemini API key
- `BOHR_ACCESS_KEY`: Your Bohrium access key

### Optional
- `BOHR_APP_KEY`: Bohrium app key (default: dev)
- `BOHR_SERVICE_URL`: Bohr microservice URL (default: http://localhost:5001)
- `OLLAMA_ROUTER`: Enable/disable AI routing (default: true)
- `OLLAMA_ROUTER_TIMEOUT_MS`: Router timeout in milliseconds (default: 1500)
- `OLLAMA_BASE_URL`: Ollama server URL (default: http://localhost:11434)
- `OLL_SYNTHESIS_MODEL`: Local model for synthesis (default: llama3:8b)
- `ALLOWED_MODELS`: Comma-separated list of Fireworks models to use

## Architecture

### Verification Flow

1. **Stage 1 - Structural Validation**: Data format, required fields, type checking
2. **Stage 2 - Content Verification**: 
   - PII, bias, hallucination detection
   - Bohr API suggestion collection (scientific verification)
   - Gemini API suggestion collection (content quality)
   - Local Ollama model synthesis (final decision)
3. **Stage 3 - Anomaly Detection**: Outlier detection, consistency checks

### Routing Flow

1. **Tier 0**: Local processing (rule engine, exact cache, semantic cache)
2. **Qwen Router**: Classifies request using Qwen2.5:0.5b via Ollama (local)
3. **Decision Engine**: Multi-factor scoring for optimal tier selection
4. **Tier Selection**: Routes to appropriate tier based on complexity and cost
5. **Inference**: Executes request using selected Fireworks model
6. **Verification**: Three-stage verification with suggestion synthesis
7. **Learning**: Records metrics for adaptive optimization

### Key Components

- `lib/verification/suggestion-synthesis.ts`: Multi-model suggestion collection and synthesis
- `lib/verification/stage2-content.ts`: Content verification with suggestion system
- `lib/verification/types.ts`: Verification system types and interfaces
- `lib/router/gemma-router.ts`: Qwen-powered routing intelligence (local via Ollama)
- `lib/router/deterministic-fallback.ts`: Heuristic fallback routing
- `lib/models/registry.ts`: Model configuration and selection (13 models)
- `services/bohr-service.py`: Bohrium API microservice for scientific verification
- `app/api/chat/route.ts`: Main API endpoint
- `app/api/verify/route.ts`: Verification API endpoint

## API Usage

### Chat API

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing",
    "sessionId": "user123",
    "taskMode": "general"
  }'
```

### Verification API

```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "prompt": "What is 2+2?",
      "answer": "4"
    },
    "taskMode": "math",
    "config": {
      "enableSuggestionSystem": true,
      "enableBohrVerification": true
    }
  }'
```

## Task Modes

- **general**: General-purpose tasks
- **math**: Mathematical reasoning (Bohr verification enabled)
- **code**: Code generation and debugging
- **reasoning**: Complex reasoning tasks (Bohr verification enabled)
- **factual**: Fact-checking with online research
- **sentiment**: Sentiment analysis
- **summarization**: Text summarization
- **ner**: Named entity recognition

## Model Registry

### Tier 1 Models (Cost-Effective)
- Minimax M3 ($0.15/M)
- Llama 3 8B Instruct ($0.10/M)
- Mistral 7B Instruct ($0.08/M)
- Gemma 7B IT ($0.07/M)
- Qwen 7B Chat ($0.09/M)
- Phi-3 Mini 128K ($0.12/M) - Long-context specialist

### Tier 2 Models (High-Performance)
- Kimi K2P6 ($0.50/$1.50 per M)
- Llama 3 70B Instruct ($0.70/M)
- Mixtral 8x7B Instruct ($0.40/M)
- DeepSeek R1 ($0.60/M) - Math/reasoning specialist
- Qwen 72B Chat ($0.65/M)
- Codestral 22B ($0.35/M) - Coding specialist
- Gemma 2 27B IT ($0.45/M)

## License

MIT
