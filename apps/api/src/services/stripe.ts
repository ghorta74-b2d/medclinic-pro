import Stripe from 'stripe'

const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
  apiVersion: '2024-04-10',
})

interface CreatePaymentLinkParams {
  amount: number        // In smallest currency unit (centavos for MXN)
  currency: string      // e.g. 'mxn'
  description: string
  metadata: Record<string, string>
  customerEmail?: string
}

export async function createStripePaymentLink(params: CreatePaymentLinkParams) {
  // Create a Price ad hoc (no product catalog needed for one-time clinic charges)
  const price = await stripe.prices.create({
    currency: params.currency,
    unit_amount: params.amount,
    product_data: {
      name: params.description,
    },
  })

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: params.metadata,
    ...(params.customerEmail ? {
      customer_creation: 'always',
    } : {}),
    after_completion: {
      type: 'hosted_confirmation',
      hosted_confirmation: {
        custom_message: 'Su pago ha sido recibido. ¡Gracias!',
      },
    },
  })

  return { id: link.id, url: link.url }
}

export async function createStripeCustomer(email: string, name: string) {
  return stripe.customers.create({ email, name })
}
