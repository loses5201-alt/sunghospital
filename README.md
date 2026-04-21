# sunghospital

## Connect Claude API

1. Copy `.env.example` to `.env`.
2. Put your Anthropic key in `ANTHROPIC_API_KEY`.
3. (Optional) Change `ANTHROPIC_MODEL` if needed.
4. Run:

```powershell
.\scripts\test-claude.ps1
```

You can also pass a custom prompt:

```powershell
.\scripts\test-claude.ps1 -Prompt "請用一句話介紹這個專案"
```