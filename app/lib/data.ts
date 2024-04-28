import { formatCurrency } from './utils';
import { unstable_noStore as noStore } from 'next/cache';
import { db } from './db';
import { InvoiceStatus, Prisma } from '@prisma/client';

export async function fetchRevenue() {
  noStore();

  try {
    const invoices = await db.invoice.findMany({
      select: {
        amount: true,
        date: true,
      },
    });

    return invoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  noStore();

  try {
    const data = await db.invoice.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        amount: true,
        date: true,
        status: true,
        customer: {
          select: {
            name: true,
            email: true,
            image_url: true,
          },
        },
      },
    });

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  noStore();

  try {
    const invoiceCountPromise = db.invoice.count();
    const customerCountPromise = db.customer.count();
    const invoiceStatusPromise = db.invoice.groupBy({
      by: ['status'],
      _sum: {
        amount: true,
      },
    });

    const numberOfInvoices = await invoiceCountPromise;
    const numberOfCustomers = await customerCountPromise;
    const invoiceStatus = await invoiceStatusPromise;

    const totalPaidInvoices = formatCurrency(
      invoiceStatus.find((status) => status.status === 'paid')?._sum.amount ??
        0,
    );

    const totalPendingInvoices = formatCurrency(
      invoiceStatus.find((status) => status.status === 'pending')?._sum
        .amount ?? 0,
    );

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  noStore();
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const validStatusValues = Object.values(InvoiceStatus);
    const isStatusValid = validStatusValues.includes(
      query.toUpperCase() as InvoiceStatus,
    );

    const validAmountValues = isNaN(parseFloat(query))
      ? undefined
      : parseFloat(query);

    const validDateValues = !isNaN(Date.parse(query)) && {
      date: { equals: new Date(query) },
    };

    const whereConditions = [
      { customer: { name: { contains: query, mode: 'insensitive' } } },
      { customer: { email: { contains: query, mode: 'insensitive' } } },
      {
        amount: {
          equals: validAmountValues,
        },
      },
      query && validDateValues,
      isStatusValid && { status: query.toUpperCase() as InvoiceStatus },
    ].filter(Boolean) as Prisma.InvoiceWhereInput[];

    const invoices = await db.invoice.findMany({
      where: {
        OR: whereConditions,
      },
      select: {
        id: true,
        customerId: true,
        amount: true,
        date: true,
        status: true,
        customer: {
          select: {
            name: true,
            email: true,
            image_url: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      take: ITEMS_PER_PAGE,
      skip: offset,
    });

    return invoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  noStore();

  try {
    const validStatusValues = Object.values(InvoiceStatus);
    const isStatusValid = validStatusValues.includes(
      query.toUpperCase() as InvoiceStatus,
    );

    const validAmountValues = isNaN(parseFloat(query))
      ? undefined
      : parseFloat(query);

    const validDateValues = !isNaN(Date.parse(query)) && {
      date: { equals: new Date(query) },
    };

    const whereConditions = [
      { customer: { name: { contains: query, mode: 'insensitive' } } },
      { customer: { email: { contains: query, mode: 'insensitive' } } },
      {
        amount: {
          equals: validAmountValues,
        },
      },
      query && validDateValues,
      isStatusValid && { status: query.toUpperCase() as InvoiceStatus },
    ].filter(Boolean) as Prisma.InvoiceWhereInput[];

    const count = await db.invoice.count({
      where: {
        OR: whereConditions,
      },
    });

    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  noStore();
  try {
    const data = await db.invoice.findMany({
      where: {
        id,
      },
      select: {
        id: true,
        customerId: true,
        amount: true,
        date: true,
        status: true,
        customer: {
          select: {
            name: true,
            email: true,
            image_url: true,
          },
        },
      },
    });

    const invoice = data.map((invoice) => ({
      ...invoice,
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  noStore();

  try {
    const customers = await db.customer.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image_url: true,
      },
    });
    return customers;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch all customers.');
  }
}

// export async function fetchFilteredCustomers(query: string) {
//   noStore();
//   try {
//     const data = await sql<CustomersTableType>`
// 		SELECT
// 		  customers.id,
// 		  customers.name,
// 		  customers.email,
// 		  customers.image_url,
// 		  COUNT(invoices.id) AS total_invoices,
// 		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
// 		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
// 		FROM customers
// 		LEFT JOIN invoices ON customers.id = invoices.customer_id
// 		WHERE
// 		  customers.name ILIKE ${`%${query}%`} OR
//         customers.email ILIKE ${`%${query}%`}
// 		GROUP BY customers.id, customers.name, customers.email, customers.image_url
// 		ORDER BY customers.name ASC
// 	  `;

//     const customers = data.rows.map((customer) => ({
//       ...customer,
//       total_pending: formatCurrency(customer.total_pending),
//       total_paid: formatCurrency(customer.total_paid),
//     }));

//     return customers;
//   } catch (err) {
//     console.error('Database Error:', err);
//     throw new Error('Failed to fetch customer table.');
//   }
// }
