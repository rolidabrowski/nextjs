export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export type RevenueFromInvoice = {
  date: Date;
  amount: number;
};

export type Revenue = {
  month: string;
  revenue: number;
};
