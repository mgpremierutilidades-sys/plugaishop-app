export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image: string;
  badge?: string;
};

export const products: Product[] = [
  {
    id: 'organizer-cables',
    name: 'Organizador magnético de cabos',
    description: 'Mantém o balcão da loja livre de fios e facilita a rotina de reposição.',
    category: 'Operação',
    price: 79.9,
    image:
      'https://images.unsplash.com/photo-1582719478248-54e9f2af4e04?auto=format&fit=crop&w=900&q=80',
    badge: 'Favorito da equipe',
  },
  {
    id: 'display-acrilico',
    name: 'Display acrílico para destaque',
    description: 'Expõe promoções de forma elegante e aumenta o ticket médio na saída.',
    category: 'Merchandising',
    price: 56.0,
    image:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'kit-embalagem',
    name: 'Kit de embalagens personalizadas',
    description: 'Envelopes e etiquetas com a marca PlugaiShop para reforçar o pós-venda.',
    category: 'Branding',
    price: 119.5,
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
    badge: 'Reposição rápida',
  },
  {
    id: 'totem-autoatendimento',
    name: 'Totem de autoatendimento',
    description: 'Reduz filas no caixa e ajuda clientes a consultar estoque em minutos.',
    category: 'Experiência',
    price: 1499.0,
    image:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sensor-estoque',
    name: 'Sensor inteligente de estoque',
    description: 'Notifica a equipe sobre variações de demanda e evita ruptura de gôndola.',
    category: 'Operação',
    price: 329.0,
    image:
      'https://images.unsplash.com/photo-1433838552652-f9a46b332c40?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'iluminacao-led',
    name: 'Kit de iluminação LED para vitrines',
    description: 'Valoriza produtos premium com temperatura de cor regulável.',
    category: 'Merchandising',
    price: 249.9,
    image:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80',
  },
];

export const categories = ['Todos', ...Array.from(new Set(products.map((product) => product.category)))] as const;
