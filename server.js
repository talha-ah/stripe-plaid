require("dotenv").config()
const cors = require("cors")
const express = require("express")
const ngrok = require("@ngrok/ngrok")

const app = express()

const PRICE_ID = process.env.PRICE_ID
const CUSTOMER_ID = process.env.CUSTOMER_ID
const PLAID_CLIENT = process.env.PLAID_CLIENT
const PLAID_SECRET = process.env.PLAID_SECRET
const STRIPE_PUBLIC = process.env.STRIPE_PUBLIC
const STRIPE_SECRET = process.env.STRIPE_SECRET

const stripe = require("stripe")(STRIPE_SECRET)

const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid")
const configuration = new Configuration({
  basePath: PlaidEnvironments["sandbox"],
  baseOptions: {
    headers: {
      "PLAID-SECRET": PLAID_SECRET,
      "PLAID-CLIENT-ID": PLAID_CLIENT,
    },
  },
})
const plaidClient = new PlaidApi(configuration)

app.use(express.static(__dirname))
app.use(express.json())

app.use(cors())

app.get("/config", async (req, res) => {
  res.send({ STRIPE_PUBLIC })
})

app.get("/link-token", async (req, res) => {
  // const response = await plaidClient.linkTokenCreate({
  //   language: "en",
  //   products: ["auth"],
  //   country_codes: ["US"],
  //   client_name: "TEST PLAID APP",
  //   user: { client_user_id: "1234" },
  // })

  // res.send({ response: response.data })
  res.send({ response: "refused" })
})

app.post("/payment-method", async (req, res) => {
  const { payment_method } = req.body

  const setupIntent = await stripe.setupIntents.create({
    confirm: true,
    customer: CUSTOMER_ID,
    payment_method: payment_method,
    payment_method_types: ["card"],
  })

  console.log("setup-intent", setupIntent)

  if (setupIntent.status === "requires_action") {
    return res.send({
      status: setupIntent.status,
      next_action: setupIntent.next_action,
      client_secret: setupIntent.client_secret,
    })
  }

  return res.send({ success: true })
})

app.post("/payment-intent", async (req, res) => {
  try {
    const { currency, amount, payment_method_type, payment_method } = req.body

    console.log("payment-intent", req.body)

    const paymentIntent = await stripe.paymentIntents.create({
      confirm: true,
      currency: currency,
      amount: amount * 100,
      customer: CUSTOMER_ID,
      payment_method: payment_method,
      payment_method_types: [payment_method_type],
    })

    if (paymentIntent.status === "requires_payment_method") {
      throw new Error("Payment Method not found. Please contact support.")
    }

    if (paymentIntent.status === "requires_action") {
      return res.send({
        status: paymentIntent.status,
        paymentIntent: paymentIntent.id,
        next_action: paymentIntent.next_action,
        client_secret: paymentIntent.client_secret,
        message: "Further authentication actions are required",
      })
    }

    res.send({
      status: paymentIntent.status,
      paymentIntent: paymentIntent.id,
      message: "Balance added successfully",
      next_action: paymentIntent.next_action,
    })
  } catch (err) {
    switch (err.code) {
      case "incorrect_cvc":
        break
      case "invalid_cvc":
        break
      case "expired_card":
        break
      case "invalid_expiry_year":
        break
      case "invalid_expiry_month":
        break
    }

    return res.status(405).send({ error: err.message })
  }
})

app.post("/subscribe", async (req, res) => {
  const { trial_days, pending, payment_method } = req.body

  // 'pending' subscriptons are for google/apple pay subscriptions

  // When I create a 'pending' subscription without trial days, it returns the subscription.latest_invoice.payment_intent but with trial days, it doesn't return it.
  // So, And hence it doesn't return the client secret for trial subscriptions.

  // In case of trial: Subscription status is trialing Invoice status is paid Payment intent is not present In case of no trial: Subscription status is incomplete Invoice status is open Payment intent is present and inside it, the client_secret as well!

  // You can use SetupIntents for subscriptions. Stripe automatically creates SetupIntents for subscriptions that don’t require an initial payment. The authentication and authorization process also completes at this point, if required.
  // https://stripe.com/docs/billing/subscriptions/overview#non-payment

  const subscription = await stripe.subscriptions.create({
    customer: CUSTOMER_ID,
    items: [{ price: PRICE_ID }],
    trial_period_days: trial_days,
    default_payment_method: payment_method,
    expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
    trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
    payment_settings: { save_default_payment_method: "on_subscription" },
    ...(pending && { payment_behavior: "default_incomplete" }),
  })

  console.log("subscription", subscription)

  // for non trial subscriptions
  if (
    subscription?.latest_invoice?.payment_intent?.client_secret &&
    (subscription?.latest_invoice?.payment_intent?.next_action ||
      subscription?.latest_invoice?.payment_intent?.status ===
        "requires_action" ||
      subscription?.latest_invoice?.payment_intent?.status ===
        "requires_confirmation")
  ) {
    // https://stripe.com/docs/billing/subscriptions/build-subscriptions?ui=elements
    return res.send({
      subscriptionId: subscription.id,
      status: subscription.latest_invoice.payment_intent.status,
      next_action: subscription.latest_invoice.payment_intent.next_action,
      client_secret: subscription.latest_invoice.payment_intent.client_secret,
    })
  }

  // for trial subscriptions
  if (
    subscription?.pending_setup_intent?.client_secret &&
    (subscription?.pending_setup_intent?.status === "requires_confirmation" ||
      subscription?.pending_setup_intent?.next_action)
  ) {
    // https://stripe.com/docs/billing/subscriptions/overview#non-payment
    return res.send({
      status: subscription.status,
      subscriptionId: subscription.id,
      next_action: subscription.pending_setup_intent.next_action,
      client_secret: subscription.pending_setup_intent.client_secret,
    })
  }

  res.send({ status: subscription.status, subscriptionId: subscription.id })
})

// extra route to confirm the payment intent
app.post("/confirm", async (req, res) => {
  const { payment_intent_id } = req.body

  const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)
  if (!paymentIntent) throw new Error("Payment Intent not found")

  const invoice = await stripe.invoices.retrieve(paymentIntent.invoice)
  if (!invoice) throw new Error("Invoice not found")

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
  if (!subscription) throw new Error("Subscription not found")

  // add the subscription to the organization in the database
  // not needed in this example project

  res.send({ subscriptionId: subscription.id })
})

app.listen(4242, () => console.log("Node server listening on port 4242!"))

// Get your endpoint online
ngrok.connect({ addr: 4242, authtoken_from_env: true }).then((listener) => {
  console.log(`Ingress established at: ${listener.url()}`)
  require("openurl").open(listener.url())
})
