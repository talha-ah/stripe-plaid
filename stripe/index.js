document.addEventListener("DOMContentLoaded", async () => {
  const { STRIPE_PUBLIC } = await fetch("http://localhost:4242/config").then(
    (res) => res.json()
  )

  console.log("payment-method.js", STRIPE_PUBLIC)

  // 1. Initialize Stripe
  const stripe = Stripe(STRIPE_PUBLIC)

  // 2. Create the stripe element
  const elements = stripe.elements()

  // 3. Create an instance of the card Element
  const card = elements.create("card")

  // 4. mount the card element into the DOM
  card.mount("#payment-method-element")

  // 5. Handle real-time validation errors from the card Element.
  card.on("change", function (event) {
    // Disable the Pay button if there are no card details in the Element
    document.getElementById("payment-method-button").disabled = event.empty
    event.error && event.error.message && addMessage(event.error.message)
  })

  // 6. Get a reference to your form and add an event listener
  const form = document.getElementById("payment-method-form")

  // 7. Handle form submission
  form.addEventListener("submit", function (event) {
    event.preventDefault()
    // Complete payment when the submit button is clicked
    payWithCard(stripe, card)
  })

  // Calls stripe.confirmCardPayment
  // If the card requires authentication Stripe shows a pop-up modal to
  // prompt the user to enter authentication details without leaving your page.
  const payWithCard = function (stripe, card, clientSecret) {
    loading(true)
    stripe
      .createPaymentMethod({
        card: card,
        type: "card",
        billing_details: {
          name: "Jenny Rosen",
        },
      })
      .then(function (result) {
        console.log("payment method", result)
        addMessage("Payment method created: " + result.paymentMethod.id)
        loading(false)
      })
  }

  /* ------- UI helpers ------- */
  // Show a spinner on payment submission
  const loading = function (isLoading) {
    const button = document.getElementById("payment-method-button")

    if (isLoading) {
      // Disable the button and show a spinner
      button.disabled = true
      button.innerHTML = "Loading..."
    } else {
      button.disabled = false
      button.innerHTML = "Pay now"
    }
  }
})
