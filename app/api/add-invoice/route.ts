import { db } from '@/app/lib/db';
import { z } from 'zod';
import { NextResponse } from 'next/server';

const InvoiceSchema = z.object({
  customerId: z.number({ invalid_type_error: 'Please select a customer.' }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

export async function POST(request: Request) {
  const body = await request.json();

  const validatedFields = InvoiceSchema.safeParse({
    customerId: body.customerId,
    amount: body.amount,
    status: body.status,
    date: body.date,
  });

  if (!validatedFields.success) {
    return NextResponse.json(
      { errors: validatedFields.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString();

  const customer = await db.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return NextResponse.json(
      { message: 'Customer not found' },
      { status: 404 },
    );
  }

  try {
    await db.invoice.create({
      data: {
        customerId: customerId,
        amount: amountInCents,
        status: status,
        date: date,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error, message: 'Database Error: Failed to Create Invoice.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: 'Invoice created' }, { status: 200 });
}
