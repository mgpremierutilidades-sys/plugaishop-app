// data/catalog.ts
export type Product = {
  id: string;
  sku?: string;
  title: string;
  price: number;
  category: string;
  image?: string; // URL (Image { uri })
  description?: string;
  unitLabel?: string; // ex: "/ un"
  discountPercent?: number;

  // Preparação Dropi / Bling / Nuvemshop
  supplierId?: string;
  supplierName?: string;
  origin?: "dropi" | "estoque" | "outros";
};

export const products: Product[] = [
  {
    id: "p-001",
    sku: "PLG-001",
    title: "Fone Bluetooth ANC Premium",
    price: 199.9,
    category: "Eletrônicos",
    image:
      "https://images.unsplash.com/photo-1518441902117-f0a54d6d7f5b?auto=format&fit=crop&w=900&q=80",
    description:
      "Cancelamento de ruído, graves fortes e bateria de longa duração.",
    unitLabel: "/ un",
    discountPercent: 12,
    supplierId: "dropi-01",
    supplierName: "Dropi",
    origin: "dropi",
  },
  {
    id: "p-002",
    sku: "PLG-002",
    title: "Air Fryer 4L Digital",
    price: 349.9,
    category: "Eletrodomésticos",
    image:
      "https://images.unsplash.com/photo-1622021142947-da7dedc7c39b?auto=format&fit=crop&w=900&q=80",
    description: "Painel digital e preparo rápido com menos óleo.",
    unitLabel: "/ un",
    discountPercent: 18,
    supplierId: "dropi-01",
    supplierName: "Dropi",
    origin: "dropi",
  },
  {
    id: "p-003",
    sku: "PLG-003",
    title: "Smartwatch Fitness Pro",
    price: 229.9,
    category: "Acessórios",
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
    description: "Monitoramento de saúde e treinos com notificações.",
    unitLabel: "/ un",
    discountPercent: 10,
    supplierId: "dropi-02",
    supplierName: "Dropi",
    origin: "dropi",
  },
  {
    id: "p-004",
    sku: "PLG-004",
    title: "Teclado Mecânico RGB",
    price: 189.9,
    category: "Informática",
    image:
      "https://images.unsplash.com/photo-1541140134513-85a161dc4a00?auto=format&fit=crop&w=900&q=80",
    description: "Switch responsivo, RGB e construção reforçada.",
    unitLabel: "/ un",
    discountPercent: 15,
    supplierId: "dropi-02",
    supplierName: "Dropi",
    origin: "dropi",
  },
  {
    id: "p-005",
    sku: "PLG-005",
    title: "Mochila Antifurto Executiva",
    price: 159.9,
    category: "Acessórios",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    description: "Compartimentos inteligentes, discreta e resistente.",
    unitLabel: "/ un",
    discountPercent: 8,
    supplierId: "dropi-03",
    supplierName: "Dropi",
    origin: "dropi",
  },
  {
    id: "p-006",
    sku: "PLG-006",
    title: "Caixa de Som Bluetooth Potente",
    price: 179.9,
    category: "Eletrônicos",
    image:
      "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=80",
    description: "Som encorpado, graves fortes e conexão estável.",
    unitLabel: "/ un",
    discountPercent: 20,
    supplierId: "dropi-03",
    supplierName: "Dropi",
    origin: "dropi",
  },

  // Produtos extra para “PRODUTOS IMPERDÍVEIS” rolar bem
  {
    id: "p-007",
    sku: "PLG-007",
    title: "Liquidificador Turbo 900W",
    price: 169.9,
    category: "Eletrodomésticos",
    image:
      "https://images.unsplash.com/photo-1542444459-db47a1ecfbe2?auto=format&fit=crop&w=900&q=80",
    description: "Copo resistente e potência para receitas do dia a dia.",
    unitLabel: "/ un",
    discountPercent: 10,
    supplierId: "dropi-01",
    supplierName: "Dropi",
    origin: "dropi",
  },
  {
    id: "p-008",
    sku: "PLG-008",
    title: "Mouse Gamer 6 Botões",
    price: 89.9,
    category: "Informática",
    image:
      "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=900&q=80",
    description: "Precisão e pegada confortável para jogos e trabalho.",
    unitLabel: "/ un",
    discountPercent: 12,
    supplierId: "dropi-02",
    supplierName: "Dropi",
    origin: "dropi",
  },
  {
    id: "p-009",
    sku: "PLG-009",
    title: "Kit 3 Camisetas Básicas Premium",
    price: 119.9,
    category: "Vestuário",
    image:
      "https://images.unsplash.com/photo-1520975869018-bc4f6b51a5ad?auto=format&fit=crop&w=900&q=80",
    description: "Conforto e caimento para uso diário.",
    unitLabel: "/ kit",
    discountPercent: 15,
    supplierId: "dropi-04",
    supplierName: "Dropi",
    origin: "dropi",
  },
  {
    id: "p-010",
    sku: "PLG-010",
    title: "Sanduicheira Antiaderente",
    price: 79.9,
    category: "Eletrodomésticos",
    image:
      "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=900&q=80",
    description: "Aquece rápido e limpa fácil.",
    unitLabel: "/ un",
    discountPercent: 10,
    supplierId: "dropi-01",
    supplierName: "Dropi",
    origin: "dropi",
  },
  {
    id: "p-011",
    sku: "PLG-011",
    title: "Cabo USB-C Reforçado 2m",
    price: 29.9,
    category: "Acessórios",
    image:
      "https://images.unsplash.com/photo-1583864697784-a0efc8379f70?auto=format&fit=crop&w=900&q=80",
    description: "Carregamento estável e alta durabilidade.",
    unitLabel: "/ un",
    discountPercent: 5,
    supplierId: "dropi-05",
    supplierName: "Dropi",
    origin: "dropi",
  },
  {
    id: "p-012",
    sku: "PLG-012",
    title: "Organizador Multiuso para Casa",
    price: 49.9,
    category: "Casa",
    image:
      "https://images.unsplash.com/photo-1582582429416-5c790b0a3f3a?auto=format&fit=crop&w=900&q=80",
    description: "Organização rápida e visual limpo.",
    unitLabel: "/ un",
    discountPercent: 10,
    supplierId: "dropi-06",
    supplierName: "Dropi",
    origin: "dropi",
  },
];
