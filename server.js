require("dotenv").config()
const cors = require("cors")
const express = require("express")
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

app.post("/payment-intent", async (req, res) => {
  const { currency, amount, paymentMethodType } = req.body

  console.log("payment-intent", req.body)

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: currency,
    customer: CUSTOMER_ID,
    payment_method_types: [paymentMethodType],
  })

  res.send({ clientSecret: paymentIntent.client_secret })
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

app.post("/subscribe", async (req, res) => {
  const { trial_days } = req.body

  // When I create a 'pending' subscription without trial days, it returns the subscription.latest_invoice.payment_intent but with trial days, it doesn't return it.
  // So, And hence it doesn't return the client secret for trial subscriptions.

  // In case of trial: Subscription status is trialing Invoice status is paid Payment intent is not present In case of no trial: Subscription status is incomplete Invoice status is open Payment intent is present and inside it, the client_secret as well!

  // You can use SetupIntents for subscriptions. Stripe automatically creates SetupIntents for subscriptions that don’t require an initial payment. The authentication and authorization process also completes at this point, if required.
  // https://stripe.com/docs/billing/subscriptions/overview#non-payment

  const subscription = await stripe.subscriptions.create({
    customer: CUSTOMER_ID,
    items: [
      {
        price: PRICE_ID,
      },
    ],
    trial_settings: {
      end_behavior: {
        missing_payment_method: "cancel",
      },
    },
    trial_period_days: trial_days,
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
    payment_settings: { save_default_payment_method: "on_subscription" },
  })

  if (
    subscription.latest_invoice &&
    subscription.latest_invoice.payment_intent &&
    subscription.latest_invoice.payment_intent.client_secret
  ) {
    // https://stripe.com/docs/billing/subscriptions/build-subscriptions?ui=elements
    return res.send({
      status: subscription.status,
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    })
  }

  if (
    subscription.pending_setup_intent &&
    subscription.pending_setup_intent.client_secret
  ) {
    // https://stripe.com/docs/billing/subscriptions/overview#non-payment
    return res.send({
      status: subscription.status,
      subscriptionId: subscription.id,
      clientSecret: subscription.pending_setup_intent.client_secret,
    })
  }

  res.send({ status: subscription.status, subscriptionId: subscription.id })
})

app.listen(4242, () => console.log("Node server listening on port 4242!"))
