import type { OrderPayload } from "../types/orderPayload";

export type BlingOrderPayload = {
  pedido: {
    numero?: string;
    data: string; // YYYY-MM-DD
    loja?: string;
    cliente?: {
      nome?: string;
      email?: string;
      fone?: string;
      documento?: string;
    };
    enderecoEntrega?: {
      cep?: string;
      endereco?: string;
      numero?: string;
      cidade?: string;
      uf?: string;
      complemento?: string;
    };
    itens: {
      codigo?: string; // SKU
      descricao: string;
      quantidade: number;
      valor: number; // unit
      desconto?: number;
    }[];
    transporte?: {
      frete: number;
      servico?: string;
      prazo?: string;
    };
    pagamento?: {
      forma?: string; // pix/card/boleto
      status?: string; // pending/paid/failed
    };
    totais: {
      subtotal: number;
      desconto: number;
      frete: number;
      total: number;
    };
    observacoes?: string;
  };
};

function toISODate(iso: string) {
  // "2025-12-21T..." -> "2025-12-21"
  return iso?.slice(0, 10) || new Date().toISOString().slice(0, 10);
}

export function toBlingPayload(p: OrderPayload): BlingOrderPayload {
  return {
    pedido: {
      numero: p.orderId,
      data: toISODate(p.createdAt),
      loja: p.source,

      cliente: {
        nome: p.customer?.name,
        email: p.customer?.email,
        fone: p.customer?.phone,
        documento: p.customer?.document,
      },

      enderecoEntrega: {
        cep: p.address?.zip,
        endereco: p.address?.street,
        numero: p.address?.number,
        cidade: p.address?.city,
        uf: p.address?.state,
        complemento: p.address?.complement,
      },

      itens: p.items.map((it) => ({
        codigo: it.sku,
        descricao: it.title,
        quantidade: it.quantity,
        valor: it.unitPrice,
        desconto: it.discount ?? 0,
      })),

      transporte: {
        frete: p.shipping.price,
        servico: p.shipping.method,
        prazo: p.shipping.deadline,
      },

      pagamento: p.payment
        ? {
            forma: p.payment.method,
            status: p.payment.status,
          }
        : undefined,

      totais: {
        subtotal: p.subtotal,
        desconto: p.discount,
        frete: p.shipping.price,
        total: p.total,
      },

      observacoes: `Pedido gerado pelo app Plugaí Shop (${p.orderId}).`,
    },
  };
}
