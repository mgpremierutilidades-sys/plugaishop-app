export type ShippingQuote = {
  provider: "correios" | "loggi" | "dropi";
  service: string;
  price: number;
  deadline: string;
};

export type ShippingRequest = {
  zip: string;
  weightKg?: number;
  declaredValue?: number;
};
