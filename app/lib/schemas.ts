import { z } from 'zod';

export const InvoiceFormSchema = z.object({
  id: z.string({ invalid_type_error: 'Please select a customer.' }),
  customerId: z.string(),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});
