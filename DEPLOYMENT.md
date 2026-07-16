# Validex Deployment Guide

## Vercel Deployment

### 1. Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import from GitHub: `Rahman-King/validex`
4. Click "Import"

### 2. Configure Environment Variables

In Vercel project settings, add the following environment variables:

#### Required Variables
```
FIREWORKS_API_KEY=your_fireworks_api_key
GEMINI_API_KEY=your_gemini_api_key
BOHR_ACCESS_KEY=your_bohr_access_key
```

#### Optional Variables
```
BOHR_APP_KEY=dev
BOHR_SERVICE_URL=your_bohr_service_url
FIREWORKS_BASE_URL=https://api.fireworks.ai/inference/v1
ALLOWED_MODELS=accounts/fireworks/models/minimax-m3,accounts/fireworks/models/llama-v3-8b-instruct,accounts/fireworks/models/mistral-7b-instruct-4k,accounts/fireworks/models/gemma-7b-it,accounts/fireworks/models/qwen-7b-chat,accounts/fireworks/models/phi-3-mini-128k-instruct,accounts/fireworks/models/kimi-k2p6,accounts/fireworks/models/llama-v3-70b-instruct,accounts/fireworks/models/mixtral-8x7b-instruct,accounts/fireworks/models/deepseek-ai/deepseek-r1,accounts/fireworks/models/qwen-72b-chat,accounts/fireworks/models/codestral-22b-v0.1,accounts/fireworks/models/gemma-2-27b-it
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_ROUTER=true
OLLAMA_ROUTER_TIMEOUT_MS=5000
OLLAMA_ROUTER=qwen-router
OLL_SYNTHESIS_MODEL=llama3:8b
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=Validex
```

### 3. Deploy

1. Click "Deploy"
2. Vercel will automatically build and deploy
3. Wait for deployment to complete
4. Your app will be available at `https://your-project.vercel.app`

## Bohr Microservice Deployment

### Option 1: Local Development

```bash
cd services
pip install -r requirements.txt
python bohr-service.py
```

The service will run on `http://localhost:5001`

### Option 2: Cloud Deployment (Recommended for Production)

#### Using Railway/Render/Heroku

1. Create a new project on Railway/Render/Heroku
2. Add the following environment variables:
   ```
   BOHR_ACCESS_KEY=your_bohr_access_key
   BOHR_APP_KEY=dev
   BOHR_SERVICE_PORT=5001
   ```
3. Deploy the `services/bohr-service.py` file
4. Update `BOHR_SERVICE_URL` in Vercel to point to your deployed service

#### Using Docker

```bash
cd services
docker build -t bohr-service .
docker run -d -p 5001:5001 --env-file .env bohr-service
```

### Option 3: Server Deployment

```bash
# On your server
cd /path/to/validex/services
pip install -r requirements.txt

# Run with systemd or supervisor
python bohr-service.py
```

## Post-Deployment Setup

### 1. Configure Ollama (if using local routing)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull router model
ollama pull qwen2.5:0.5b
ollama create qwen-router -f Modelfile

# Pull synthesis model
ollama pull llama3:8b

# Start Ollama server
ollama serve
```

### 2. Test the Application

```bash
# Test chat endpoint
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello",
    "sessionId": "test",
    "taskMode": "general"
  }'

# Test verification endpoint
curl -X POST https://your-app.vercel.app/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "prompt": "What is 2+2?",
      "answer": "4"
    },
    "taskMode": "math"
  }'
```

### 3. Monitor and Scale

- **Vercel**: Use Vercel Analytics for performance monitoring
- **Bohr Service**: Monitor logs and scale based on usage
- **Ollama**: Monitor resource usage and consider GPU acceleration for production

## Troubleshooting

### Vercel Deployment Issues

**Build fails:**
- Check that all dependencies are in `package.json`
- Verify Node.js version compatibility (requires 20+)
- Check build logs for specific errors

**Environment variables not working:**
- Ensure variables are set in Vercel project settings
- Redeploy after adding environment variables
- Check variable names match exactly

### Bohr Service Issues

**Service not responding:**
- Check if the service is running: `curl http://localhost:5001/health`
- Verify Python dependencies are installed
- Check port 5001 is not blocked by firewall

**Connection refused:**
- Ensure `BOHR_SERVICE_URL` is correctly set in Vercel
- Check if Bohr service is accessible from Vercel
- Verify firewall rules allow external connections

### Ollama Issues

**Router not responding:**
- Check Ollama is running: `ollama list`
- Verify qwen-router model exists: `ollama show qwen-router`
- Check OLLAMA_BASE_URL is correct

**Synthesis fails:**
- Ensure llama3:8b model is pulled: `ollama pull llama3:8b`
- Check OLL_SYNTHESIS_MODEL is set correctly
- Verify Ollama server is accessible

## Security Considerations

1. **Never commit actual .env files** - use .env.example as template
2. **Rotate API keys regularly** - especially if compromised
3. **Use Vercel Environment Variables** - don't hardcode secrets
4. **Enable rate limiting** - protect your API endpoints
5. **Monitor usage** - set up alerts for unusual activity
6. **Use HTTPS only** - ensure all connections are encrypted

## Performance Optimization

1. **Enable Vercel Edge Functions** for faster response times
2. **Use Vercel KV** for caching if needed
3. **Configure CDN** for static assets
4. **Optimize images** using Vercel Image Optimization
5. **Enable compression** for faster load times
6. **Monitor and optimize** using Vercel Analytics

## Backup and Recovery

1. **Database backups** - if using external databases
2. **Configuration backups** - keep copies of environment variables
3. **Code backups** - GitHub serves as backup
4. **Disaster recovery** - have a rollback plan ready
