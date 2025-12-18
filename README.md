# Plugaí Shop App (2026)

Aplicativo mobile (Expo + Expo Router) da **Plugaí Shop**.

## Requisitos
- Node LTS (recomendado Node 20+)
- NPM (ou Yarn — mas mantenha apenas 1 lockfile no repositório)

## Rodar em desenvolvimento
```bash
npm install
npx expo start
```

Atalhos:
- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`

## Padrões do projeto (importantes)
### Theme
O arquivo `constants/theme.ts` exporta **default**:
```ts
import theme from "../../constants/theme";
```
Opcionalmente:
```ts
import theme, { Colors, Radius, Spacing } from "../../constants/theme";
```

### Banner Home
No `app/(tabs)/index.tsx` o banner deve usar:
```tsx
source={require("../../assets/banners/banner-home.png")}
```

## Estrutura (alto nível)
- `app/` rotas (Expo Router)
- `components/` componentes reutilizáveis
- `constants/` dados estáticos + theme
- `context/` providers globais (ex.: carrinho)
- `hooks/` hooks compartilhados
- `utils/` utilitários (ex.: moeda)
- `assets/` imagens e banners

## Scripts úteis
- `npm run lint` (Expo lint)
- `npm run reset-project` (restaura o template base)

