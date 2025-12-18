// constants/categories.ts

// Slugs oficiais das categorias principais da Plugaí Shop
export type CategorySlug =
  | "eletronicos-informatica"
  | "eletrodomesticos"
  | "brinquedos-jogos"
  | "casa-decoracao"
  | "moda-acessorios"
  | "esporte-lazer"
  | "pet-shop"
  | "beleza-saude";

export interface Category {
  slug: CategorySlug;
  name: string;
  description: string;
  icon?: string;      // reservado para futuro (ícones por categoria)
  highlight?: string; // frase curta de destaque para algumas telas
}

// Lista oficial de categorias principais
export const CATEGORIES: Category[] = [
  {
    slug: "eletronicos-informatica",
    name: "Eletrônicos & Informática",
    description:
      "Celulares, notebooks, TVs, áudio, redes & Wi-Fi e muito mais para o dia a dia conectado.",
    highlight: "Tecnologia para o seu dia a dia.",
  },
  {
    slug: "eletrodomesticos",
    name: "Eletrodomésticos",
    description:
      "Geladeiras, fogões, micro-ondas, lava e seca, climatização e linha branca completa.",
    highlight: "Praticidade para sua casa.",
  },
  {
    slug: "brinquedos-jogos",
    name: "Brinquedos & Jogos",
    description:
      "Brinquedos educativos, bonecos colecionáveis, jogos de tabuleiro e muito mais para todas as idades.",
    highlight: "Diversão para todas as idades.",
  },
  {
    slug: "casa-decoracao",
    name: "Casa & Decoração",
    description:
      "Organização, cama, mesa e banho, utilidades domésticas e itens para deixar a casa mais aconchegante.",
    highlight: "Seu lar mais aconchegante.",
  },
  {
    slug: "moda-acessorios",
    name: "Moda & Acessórios",
    description:
      "Roupas, calçados, bolsas, mochilas, relógios e acessórios para todos os estilos.",
    highlight: "Estilo em todos os detalhes.",
  },
  {
    slug: "esporte-lazer",
    name: "Esporte & Lazer",
    description:
      "Artigos esportivos, fitness, camping, ciclismo e tudo para uma rotina ativa e saudável.",
    highlight: "Movimento, saúde e bem-estar.",
  },
  {
    slug: "pet-shop",
    name: "Mundo Pet",
    description:
      "Rações, petiscos, camas, brinquedos e acessórios para cães, gatos e outros pets.",
    highlight: "Tudo para o seu melhor amigo.",
  },
  {
    slug: "beleza-saude",
    name: "Beleza & Saúde",
    description:
      "Cuidados pessoais, skincare, perfumaria, bem-estar e aparelhos de cuidados em casa.",
    highlight: "Cuide de você todos os dias.",
  },
];

// Helper para recuperar categoria pelo slug
export function getCategoryBySlug(
  slug?: string | null
): Category | undefined {
  if (!slug) return undefined;
  return CATEGORIES.find((cat) => cat.slug === slug);
}
