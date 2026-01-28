# Patch Carrinho + Checkout (Plugaishop 2026)

## Por que este patch existe
- Remove redirecionamentos automáticos que impediam o fluxo do checkout.
- Separa **Checkout** fora de `(tabs)` (padrão marketplace) para evitar abas extras e telas "opacas" por Modal do carrinho.
- Corrige o Carrinho para iniciar o checkout em `/checkout` (sem pular etapas).
- Fecha Modal do carrinho ao sair da aba (evita overlay/opacity em outras telas).
- Em DEV, falha alto se o `CartProvider` não estiver montado (evita UI "inerte" silenciosa).

## Passos (PowerShell)
1) **Aplicar o patch** na raiz do projeto:
```powershell
cd C:\plugaishop-app
Expand-Archive -Path .\plugaishop_carrinho_checkout_patch.zip -DestinationPath . -Force
```

2) **Remover o checkout antigo dentro das tabs** (obrigatório para não duplicar rotas):
```powershell
Remove-Item -Recurse -Force "app\(tabs)\checkout"
```

3) Limpar cache e iniciar:
```powershell
npx expo start -c
```

## Critérios de aceite
- TabBar não mostra mais `checkout` como aba.
- Carrinho -> "Continuar a compra" abre `/checkout` (index).
- Endereço/Entrega/Pagamento/Revisão/Sucesso navegáveis.
- Revisão não fica com overlay/opacidade vindo do carrinho.
