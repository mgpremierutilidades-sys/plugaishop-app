export type Product = {
  id: string;
  title: string;
  price: string;
  oldPrice?: string;
  installmentText: string;
  tags: Array<"destaque" | "descoberta" | "oferta" | "lancamento">;
};

export const CATEGORIES = [
  "Eletrônicos & Informática",
  "Eletrodomésticos",
  "Brinquedos & Jogos",
  "Casa & Decoração",
  "Moda & Acessórios",
  "Esporte & Lazer",
  "Mundo Pet",
  "Beleza & Saúde",
] as const;

export const PRODUCTS: Product[] = [
  {
    id: "p1",
    title: "Smartphone 5G\n128GB",
    price: "R$ 1.899,90",
    oldPrice: "R$ 2.399,90",
    installmentText: "em até 10x sem juros",
    tags: ["destaque", "descoberta", "oferta"],
  },
  {
    id: "p2",
    title: 'Notebook 15" SSD\n512GB',
    price: "R$ 3.499,90",
    oldPrice: "R$ 3.999,90",
    installmentText: "em até 12x sem juros",
    tags: ["destaque", "descoberta"],
  },
  {
    id: "p3",
    title: "Air Fryer 5L Inox",
    price: "R$ 499,90",
    oldPrice: "R$ 699,90",
    installmentText: "em até 6x sem juros",
    tags: ["descoberta", "oferta"],
  },
  {
    id: "p4",
    title: "Jogo de Panelas\nAntiaderente 7 pcs",
    price: "R$ 379,90",
    oldPrice: "R$ 459,90",
    installmentText: "em até 5x sem juros",
    tags: ["descoberta"],
  },
  {
    id: "p5",
    title: "Vestido casual\nfeminino",
    price: "R$ 129,90",
    oldPrice: "R$ 169,90",
    installmentText: "em até 3x sem juros",
    tags: ["descoberta"],
  },
  {
    id: "p6",
    title: "Conjunto infantil\nverão",
    price: "R$ 89,90",
    oldPrice: "R$ 119,90",
    installmentText: "em até 2x sem juros",
    tags: ["descoberta", "oferta"],
  },
  {
    id: "p7",
    title: "Kit maquiagem\nprofissional 12 peças",
    price: "R$ 219,90",
    oldPrice: "R$ 299,90",
    installmentText: "em até 4x sem juros",
    tags: ["descoberta"],
  },
  {
    id: "p8",
    title: "Hidratante corporal\nmaciez intensa 400...",
    price: "R$ 49,90",
    installmentText: "em até 2x sem juros",
    tags: ["descoberta"],
  },
  {
    id: "p9",
    title: "Kit blocos de montar\ncriativos 500 peças",
    price: "R$ 159,90",
    oldPrice: "R$ 199,90",
    installmentText: "em até 4x sem juros",
    tags: ["descoberta"],
  },
  {
    id: "p10",
    title: "Jogo de tabuleiro\nestratégico família",
    price: "R$ 119,90",
    installmentText: "em até 3x sem juros",
    tags: ["descoberta"],
  },
  {
    id: "p11",
    title: "Cama pet confortável\ntamanho M",
    price: "R$ 139,90",
    installmentText: "em até 3x sem juros",
    tags: ["descoberta"],
  },
  {
    id: "p12",
    title: "Coleira peitoral\najustável para cães",
    price: "R$ 59,90",
    installmentText: "em até 2x sem juros",
    tags: ["descoberta"],
  },
];
