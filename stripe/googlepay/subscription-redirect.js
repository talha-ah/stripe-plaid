document.addEventListener("DOMContentLoaded", async () => {
  const { STRIPE_PUBLIC } = await fetch("http://localhost:4242/config").then(
    (res) => res.json()
  )

  console.log("google-pay-subscription-hook.js", STRIPE_PUBLIC) // Initialize Stripe.js using your publishable key

  const stripe = Stripe(STRIPE_PUBLIC)

  // Retrieve the "payment_intent_client_secret" query parameter appended to
  // your return_url by Stripe.js
  const clientSecret = new URLSearchParams(window.location.search).get(
    "payment_intent_client_secret"
  )
  const setup_intent_client_secret = new URLSearchParams(
    window.location.search
  ).get("setup_intent_client_secret")

  console.log("clientSecret", clientSecret)
  console.log("setup_intent_client_secret", setup_intent_client_secret) // incase of trialing subscription

  if (clientSecret) {
    // Retrieve the PaymentIntent
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      console.log("paymentIntent", paymentIntent)
      // Inspect the PaymentIntent `status` to indicate the status of the payment
      // to your customer.
      //
      // Some payment methods will [immediately succeed or fail][0] upon
      // confirmation, while others will first enter a `processing` state.
      //
      // [0]: https://stripe.com/docs/payments/payment-methods#payment-notification
      switch (paymentIntent.status) {
        case "succeeded":
          addMessage("Success! Payment received.")
          break

        case "processing":
          addMessage(
            "Payment processing. We'll update you when payment is received."
          )
          break

        case "requires_payment_method":
          addMessage("Payment failed. Please try another payment method.")
          // Redirect your user back to your payment page to attempt collecting
          // payment again
          break

        default:
          addMessage("Something went wrong.")
          break
      }
    })
  } else if (setup_intent_client_secret) {
    // https://stripe.com/docs/billing/subscriptions/overview#non-payment
    stripe
      .retrieveSetupIntent(setup_intent_client_secret)
      .then(({ setupIntent }) => {
        console.log("setupIntent", setupIntent)
        // Inspect the PaymentIntent `status` to indicate the status of the payment
        // to your customer.
        //
        // Some payment methods will [immediately succeed or fail][0] upon
        // confirmation, while others will first enter a `processing` state.
        //
        // [0]: https://stripe.com/docs/payments/payment-methods#payment-notification
        switch (setupIntent.status) {
          case "succeeded":
            addMessage("Success! Payment received.")
            break

          case "processing":
            addMessage(
              "Payment processing. We'll update you when payment is received."
            )
            break

          case "requires_payment_method":
            addMessage("Payment failed. Please try another payment method.")
            // Redirect your user back to your payment page to attempt collecting
            // payment again
            break

          default:
            addMessage("Something went wrong.")
            break
        }
      })
  }
})
