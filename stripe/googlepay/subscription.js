document.addEventListener("DOMContentLoaded", async () => {
  const { clientSecret } = await fetch("http://localhost:4242/subscribe", {
    method: "POST",
    body: JSON.stringify({
      pending: true,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => res.json())

  const options = {
    locale: "en",
    clientSecret: clientSecret,
    // Fully customizable with appearance API.
    appearance: {
      theme: "stripe",
    },
  }

  const { STRIPE_PUBLIC } = await fetch("http://localhost:4242/config").then(
    (res) => res.json()
  )

  console.log("google-pay-subscription.js", STRIPE_PUBLIC)
  console.log("clientSecret", clientSecret)

  const stripe = Stripe(STRIPE_PUBLIC)

  // Set up Stripe.js and Elements to use in checkout form, passing the client secret obtained in step 5
  const elements = stripe.elements(options)

  // Create and mount the Payment Element
  const paymentElement = elements.create("payment")
  paymentElement.mount("#payment-element")

  const form = document.getElementById("payment-form")

  form.addEventListener("submit", async (event) => {
    event.preventDefault()

    console.log("event", event)

    const { error } = await stripe.confirmPayment({
      //`Elements` instance that was used to create the Payment Element
      elements,
      confirmParams: {
        return_url:
          "https://aa9f-2a04-4a43-968f-ffc0-2553-bf08-8e9-8cf7.ngrok-free.app/stripe/googlepay/subscription-redirect.html",
      },
    })

    if (error) {
      // This point will only be reached if there is an immediate error when
      // confirming the payment. Show error to your customer (for example, payment
      // details incomplete)
      addMessage(error.message)
    } else {
      // Your customer will be redirected to your `return_url`. For some payment
      // methods like iDEAL, your customer will be redirected to an intermediate
      // site first to authorize the payment, then redirected to the `return_url`.
    }
  })
})
