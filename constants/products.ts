// constants/products.ts
// Catálogo fictício base de produtos da Plugaí Shop (compatível com constants/categories.ts)

export type CategorySlug =
  | "eletronicos-informatica"
  | "eletrodomesticos"
  | "brinquedos-jogos"
  | "casa-decoracao"
  | "moda-acessorios"
  | "esporte-lazer"
  | "pet-shop"
  | "beleza-saude";

export type ProductBadge =
  | "OFERTA"
  | "LANÇAMENTO"
  | "QUERIDINHO"
  | "DESTAQUE"
  | string;

export type Product = {
  id: string;
  name: string;
  category: CategorySlug;

  price: number;
  oldPrice?: number;

  badge?: ProductBadge;
  installments?: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Smartphone 5G 128GB",
    category: "eletronicos-informatica",
    price: 1899.9,
    oldPrice: 2399.9,
    badge: "OFERTA",
    installments: "em até 10x sem juros",
  },
  {
    id: "2",
    name: 'Notebook 15" SSD 512GB',
    category: "eletronicos-informatica",
    price: 3499.9,
    oldPrice: 3999.9,
    badge: "LANÇAMENTO",
    installments: "em até 12x sem juros",
  },
  {
    id: "3",
    name: "Air Fryer 5L Inox",
    category: "eletrodomesticos",
    price: 499.9,
    oldPrice: 699.9,
    badge: "QUERIDINHO",
    installments: "em até 6x sem juros",
  },
  {
    id: "4",
    name: "Jogo de Panelas Antiaderente 7 pçs",
    category: "casa-decoracao",
    price: 379.9,
    oldPrice: 459.9,
    badge: "OFERTA",
    installments: "em até 5x sem juros",
  },
  {
    id: "5",
    name: "Vestido casual feminino",
    category: "moda-acessorios",
    price: 129.9,
    oldPrice: 169.9,
    badge: "24% OFF",
    installments: "em até 3x sem juros",
  },
  {
    id: "6",
    name: "Conjunto infantil verão",
    category: "moda-acessorios",
    price: 89.9,
    oldPrice: 119.9,
    badge: "DESTAQUE",
    installments: "em até 2x sem juros",
  },
  {
    id: "7",
    name: "Kit maquiagem profissional 12 peças",
    category: "beleza-saude",
    price: 219.9,
    oldPrice: 299.9,
    badge: "OFERTA",
    installments: "em até 4x sem juros",
  },
  {
    id: "8",
    name: "Hidratante corporal maciez intensa 400ml",
    category: "beleza-saude",
    price: 49.9,
    installments: "em até 2x sem juros",
  },
  {
    id: "9",
    name: "Kit blocos de montar criativos 500 peças",
    category: "brinquedos-jogos",
    price: 159.9,
    oldPrice: 199.9,
    badge: "DESTAQUE",
    installments: "em até 4x sem juros",
  },
  {
    id: "10",
    name: "Jogo de tabuleiro estratégico família",
    category: "brinquedos-jogos",
    price: 119.9,
    installments: "em até 3x sem juros",
  },
  {
    id: "11",
    name: "Cama pet confortável tamanho M",
    category: "pet-shop",
    price: 139.9,
    installments: "em até 3x sem juros",
  },
  {
    id: "12",
    name: "Coleira peitoral ajustável para cães",
    category: "pet-shop",
    price: 59.9,
    installments: "em até 2x sem juros",
  },
];
