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
2. Click "Regenerate (AI)" button
3. Should see a side-by-side comparison view with:
   - **Rule-Based Version** (left/green) - Fast, deterministic
   - **AI-Generated Version** (right/purple) - AI-powered, potentially enhanced
4. Compare both versions and click "Use This Version" on your preferred one
5. Card updates with selected version
6. Check card metadata - `model_name` should be in provenance if AI version was selected

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
- If comparison view shows "Only rule-based version is available", AI generation failed but rule-based still works

### Issue: Comparison view not showing
**Solution**:
- Ensure you clicked "Regenerate (AI)" not "Regenerate (Rule-based)"
- Check browser console for errors
- Verify comparison mode is working: API should return `{ comparison: true, ruleBased: {...}, ai: {...} }`
- Try refreshing the page and opening the card modal again

## Expected Behavior

### When AI is Available:
- ✅ "Regenerate (AI)" button is enabled (purple)
- ✅ Status shows: "✓ AI (Ollama) is available and ready"
- ✅ Clicking "Regenerate (AI)" shows side-by-side comparison view
- ✅ You can choose between rule-based and AI-generated versions
- ✅ Selected version is applied to the card
- ✅ Card provenance includes `model_name` if AI version was selected

### When AI is NOT Available:
- ⚠️ "Regenerate (AI)" button is disabled (gray)
- ⚠️ Status shows specific error message
- ✅ "Regenerate (Rule-based)" still works (green button)
- ✅ System falls back to rule-based automatically
- ✅ Comparison view shows "Only rule-based version is available" if AI fails during comparison

## Manual Test

1. **Start Ollama**: `ollama serve`
2. **Pull model**: `ollama pull llama2`
3. **Set .env**: `OLLAMA_ENABLED=true` (and other vars)
4. **Restart server**: Kill and restart Node.js server
5. **Check status**: `curl http://localhost:5001/api/ai/status`
6. **Open card modal**: Check for green checkmark status
7. **Regenerate with AI**: Click "Regenerate (AI)" button
8. **View comparison**: Should see side-by-side comparison of rule-based vs AI versions
9. **Select version**: Click "Use This Version" on preferred version
10. **Verify result**: Card should update with selected version

## Performance Notes

- **Rule-based**: ~50-200ms (instant)
- **AI-based**: ~10-30 seconds for llama2 (depends on model size and hardware)
- **Comparison mode**: Generates both versions, takes ~10-30 seconds total
- **Timeout**: 30-second timeout for AI API calls to prevent hangs
- **Fallback**: Automatic if AI fails or unavailable
- **Model size impact**: Larger models (llama2: 3.8GB) are slower but more stable than smaller ones

## Model Recommendations

- **Recommended (Stable)**: `llama2` (~10-30s per regeneration, 3.8GB)
  - Most stable, produces good results
  - Default model in configuration
  - Tested and verified to work reliably

- **Not Recommended**: `phi` (~3-8s per regeneration, 1.6GB)
  - Faster but unstable - may crash on complex content
  - Not recommended for production use
  - Was tested but found to have reliability issues

- **Alternative Options**:
  - `mistral` - Good balance if available
  - `llama2:13b` - Higher quality but slower and requires more RAM
  - `tinyllama` - Very fast but lower quality

**Note**: The application defaults to `llama2` for stability. You can change `OLLAMA_MODEL` in `.env` to use a different model, but test thoroughly as some models may have compatibility issues.

## Comparison View Feature

When you click "Regenerate (AI)", the system:

1. **Generates both versions simultaneously**:
   - Rule-based version (fast, deterministic)
   - AI-generated version (slower, potentially enhanced)

2. **Displays side-by-side comparison**:
   - Left panel: Rule-based version (green border)
   - Right panel: AI-generated version (purple border)
   - Each shows: Title, Content preview, Type, Category, Tags

3. **Allows version selection**:
   - Click "Use This Version" on either panel
   - Selected version is applied directly (no re-generation)
   - Comparison view closes and card updates

4. **Handles errors gracefully**:
   - If AI generation fails, comparison view shows "Only rule-based version is available"
   - Rule-based version is always available as fallback
   - You can still use the rule-based version even if AI fails
