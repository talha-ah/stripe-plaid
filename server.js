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

app.post("/subscribe", async (req, res) => {
  const { pending } = req.body

  const subscription = await stripe.subscriptions.create({
    customer: CUSTOMER_ID,
    items: [
      {
        price: PRICE_ID,
      },
    ],
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
    payment_settings: { save_default_payment_method: "on_subscription" },
  })

  res.send({
    subscriptionId: subscription.id,
    clientSecret: subscription.latest_invoice.payment_intent.client_secret,
  })
})

app.listen(4242, () => console.log("Node server listening on port 4242!"))
