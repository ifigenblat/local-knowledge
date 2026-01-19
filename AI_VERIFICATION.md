# AI (Ollama) Verification Guide

This guide helps you verify that AI-powered card regeneration is working correctly.

## Quick Verification Methods

### 1. **Check UI Status** (Easiest)
1. Open any card with a provenance snippet
2. Expand the "Provenance & Evidence" section
3. Look at the "Regenerate (AI)" button:
   - **Green checkmark**: AI is available and ready ✓
   - **Grayed out with alert icon**: AI is not available
   - **Status message**: Shows specific error if unavailable

### 2. **API Endpoint Check** (Programmatic)
```bash
# Check AI status via API
curl http://localhost:5001/api/ai/status

# Expected response when working:
{
  "enabled": true,
  "configured": true,
  "apiUrl": "http://localhost:11434",
  "model": "llama2",
  "available": true,
  "error": null
}

# Expected response when NOT working:
{
  "enabled": false,
  "configured": true,
  "apiUrl": "http://localhost:11434",
  "model": "llama2",
  "available": false,
  "error": "Ollama is not enabled. Set OLLAMA_ENABLED=true in your .env file."
}
```

### 3. **Test Ollama Directly** (Terminal)
```bash
# Check if Ollama service is running
curl http://localhost:11434/api/tags

# Should return list of available models if working

# Test model directly
curl http://localhost:11434/api/show \
  -d '{"name": "llama2"}'

# Should return model details if model exists
```

### 4. **Check Environment Variables**
```bash
# In server/.env file, ensure these are set:
OLLAMA_ENABLED=true
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

## Step-by-Step Setup Verification

### Step 1: Install Ollama
```bash
# macOS
brew install ollama

# Or download from https://ollama.ai
```

**Verify**: `ollama --version` should show a version number

### Step 2: Start Ollama Service
```bash
# Start Ollama in one terminal
ollama serve

# Should see: "Ollama is running..."
```

**Verify**: `curl http://localhost:11434/api/tags` should return JSON

### Step 3: Install a Model
```bash
# In another terminal, pull a model
ollama pull llama2

# Or use a smaller/faster model:
ollama pull mistral
ollama pull phi
```

**Verify**: `ollama list` should show the installed model

### Step 4: Configure Server
```bash
# Edit server/.env
OLLAMA_ENABLED=true
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama2  # Use the model you installed
```

**Verify**: Restart server, then `curl http://localhost:5001/api/ai/status`

### Step 5: Test in Application
1. Open a card with provenance snippet
2. Click "Regenerate (AI)"
3. Should see success message: "Card regenerated successfully using AI"
4. Check card metadata - `model_name` should be in provenance

## Troubleshooting

### Issue: "Ollama is not enabled"
**Solution**: Set `OLLAMA_ENABLED=true` in `server/.env` and restart server

### Issue: "Ollama is not reachable"
**Solution**: 
- Ensure `ollama serve` is running
- Check `OLLAMA_API_URL` in `.env` matches your Ollama service
- Default: `http://localhost:11434`

### Issue: "Model not found"
**Solution**: 
- Run `ollama pull <model-name>`
- Ensure `OLLAMA_MODEL` in `.env` matches installed model
- Check available models: `ollama list`

### Issue: AI button is grayed out
**Solution**: 
- Check status message in card modal for specific error
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check server logs for errors

### Issue: AI regeneration fails silently
**Solution**:
- Check server console for error messages
- AI mode will automatically fallback to rule-based if it fails
- Check that model is compatible (supports JSON output)

## Expected Behavior

### When AI is Available:
- ✅ "Regenerate (AI)" button is enabled (purple)
- ✅ Status shows: "✓ AI (Ollama) is available and ready"
- ✅ Regeneration uses AI for better quality results
- ✅ Card provenance includes `model_name`

### When AI is NOT Available:
- ⚠️ "Regenerate (AI)" button is disabled (gray)
- ⚠️ Status shows specific error message
- ✅ "Regenerate (Rule-based)" still works (green button)
- ✅ System falls back to rule-based automatically

## Manual Test

1. **Start Ollama**: `ollama serve`
2. **Pull model**: `ollama pull llama2`
3. **Set .env**: `OLLAMA_ENABLED=true` (and other vars)
4. **Restart server**: Kill and restart Node.js server
5. **Check status**: `curl http://localhost:5001/api/ai/status`
6. **Open card modal**: Check for green checkmark status
7. **Regenerate with AI**: Click "Regenerate (AI)" button
8. **Verify result**: Card should update with AI-generated content

## Performance Notes

- **Rule-based**: ~50-200ms (instant)
- **AI-based**: ~2-10 seconds (depends on model size and hardware)
- **Fallback**: Automatic if AI fails or unavailable

## Model Recommendations

- **Fast & Light**: `phi`, `tinyllama` (~1-2s per regeneration)
- **Balanced**: `mistral`, `llama2` (~3-5s per regeneration)
- **High Quality**: `llama2:13b`, `mistral:7b` (~5-15s per regeneration)

Choose based on your hardware and quality needs!
