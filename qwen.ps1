# ========================================
# Quick Qwen Code Launcher - LOCAL MODE
# ========================================
# Runs Qwen Code with local Ollama model

# Force environment variables for local Ollama
$env:OPENAI_API_KEY = "ollama"
$env:OPENAI_BASE_URL = "http://localhost:11434/v1"

# Clear any cached OAuth credentials
$oauthFile = "$env:USERPROFILE\.qwen\oauth_creds.json"
if (Test-Path $oauthFile) {
    Remove-Item $oauthFile -Force
    Write-Host "Cleared OAuth credentials"
}

Set-Location "C:\Users\ben_l\automerchant-local"
node "C:\Projects\QwenCode\dist\cli.js" --model "qwen2.5-coder-7b-instruct" --openai-base-url "http://localhost:1234/v1" --openai-api-key "lm-studio"
