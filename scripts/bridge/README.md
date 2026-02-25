# Plugaishop Local Bridge (Claude-like)

O ChatGPT não acessa `E:\...` diretamente. Este bridge expõe um servidor local com APIs de leitura e modos controlados para:
- criar arquitetura (plan.json)
- aplicar patches "estilo Claude" via Unified Diff (git apply)

## Segurança
- Servidor só escuta em `127.0.0.1`
- Token obrigatório (`X-Bridge-Token`)
- Bloqueia `.env`, chaves, pastas perigosas
- Allowlist de caminhos do projeto
- Write/Apply Plan/Patch desativado por padrão (flags)
- Guardrail: patch apply exige `git` e worktree limpo (salvo force)

## Como rodar (recomendado)
PowerShell (na raiz da repo):

```powershell
cd E:\plugaishopp-app
$env:PLUGAISHOP_BRIDGE_TOKEN="CHANGE_ME_LONG_RANDOM"

# Read-only:
python -m scripts.bridge.bridge_server --repo "E:\plugaishopp-app" --token $env:PLUGAISHOP_BRIDGE_TOKEN --readonly