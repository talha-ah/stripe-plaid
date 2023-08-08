document.addEventListener("DOMContentLoaded", async () => {
  const { STRIPE_PUBLIC } = await fetch("http://localhost:4242/config").then(
    (res) => res.json()
  )

  console.log("google-pay.js", STRIPE_PUBLIC)

  // 1. Initialize Stripe
  const stripe = Stripe(STRIPE_PUBLIC)

  const paymentRequestPayload = {
    total: {
      label: "Demo total",
      amount: 3999,
    },
    country: "US",
    currency: "usd",
    requestPayerName: true,
    requestPayerEmail: true,
  }

  // 2. Create a payment request object
  const paymentRequest = stripe.paymentRequest(paymentRequestPayload)

  // 3. Create a PaymentRequestButton element
  const elements = stripe.elements()
  const prButton = elements.create("paymentRequestButton", {
    paymentRequest: paymentRequest,
  })

  // Check the availability of the Payment Request API,
  // then mount the PaymentRequestButton
  paymentRequest.canMakePayment().then(function (result) {
    if (result) {
      prButton.mount("#payment-request-button")
    } else {
      document.getElementById("payment-request-button").style.display = "none"
      addMessage(
        "Google Pay support not found. Check the pre-requisites above and ensure you are testing in a supported browser."
      )
    }
  })

  paymentRequest.on("paymentmethod", async (e) => {
    // Make a call to the server to create a new
    // payment intent and store its client_secret.
    const { error: backendError, clientSecret } = await fetch(
      "/payment-intent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethodType: "card",
          currency: paymentRequestPayload.currency,
          amount: paymentRequestPayload.total.amount,
        }),
      }
    ).then((r) => r.json())

    if (backendError) {
      addMessage(backendError.message)
      e.complete("fail")
      return
    }

    addMessage(`Client secret returned.`)

    // Confirm the PaymentIntent without handling potential next actions (yet).
    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: e.paymentMethod.id,
      },
      {
        handleActions: false,
      }
    )

    if (error) {
      addMessage(error.message)

      // Report to the browser that the payment failed, prompting it to
      // re-show the payment interface, or show an error message and close
      // the payment interface.
      e.complete("fail")
      return
    }
    // Report to the browser that the confirmation was successful, prompting
    // it to close the browser payment method collection interface.
    e.complete("success")

    // Check if the PaymentIntent requires any actions and if so let Stripe.js
    // handle the flow. If using an API version older than "2019-02-11" instead
    // instead check for: `paymentIntent.status === "requires_source_action"`.
    if (paymentIntent.status === "requires_action") {
      // Let Stripe.js handle the rest of the payment flow.
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret
      )
      if (error) {
        // The payment failed -- ask your customer for a new payment method.
        addMessage(error.message)
        return
      }
      addMessage(`Payment ${paymentIntent.status}: ${paymentIntent.id}`)
    }

    addMessage(`Payment ${paymentIntent.status}: ${paymentIntent.id}`)
  })
})
