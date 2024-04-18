document.addEventListener("DOMContentLoaded", async () => {
  const { STRIPE_PUBLIC } = await fetch(
    `https://${window.location.hostname}/config`
  ).then((res) => res.json())

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
    event?.error?.message && addMessage(event.error.message)
  })

  // 6. Get a reference to your form and add an event listener
  const form = document.getElementById("payment-method-form")

  // 7. Handle form submission
  form.addEventListener("submit", function (event) {
    event.preventDefault()
    // Complete payment when the submit button is clicked
    payWithCard(stripe, card)
  })

  let canBuy = false
  let canSubscribe = false
  let payment_method = null
  const addButton = document.getElementById("add-payment-method")
  const buyBalanceButton = document.getElementById("buy balance")
  const subscriptionButton = document.getElementById("create subscription")

  // Calls stripe.confirmCardPayment
  // If the card requires authentication Stripe shows a pop-up modal to
  // prompt the user to enter authentication details without leaving your page.
  const payWithCard = function (stripe, card, clientSecret) {
    canBuy = false
    canSubscribe = false
    payment_method = null
    addButton.style.display = "none"
    buyBalanceButton.style.display = "none"
    subscriptionButton.style.display = "none"

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
        if (result.error) {
          // Show error in payment form
          addMessage(result.error.message)
          loading(false)
        } else {
          payment_method = result.paymentMethod.id
          addButton.style.display = "block"
          loading(false)

          addMessage("Payment method created: " + result.paymentMethod.id)
          console.log("payment method", result)
        }
      })
      .catch(function (error) {
        addMessage(error.message)
        loading(false)
      })
  }

  // Add payment method to the customer
  addButton.addEventListener("click", async () => {
    if (payment_method) {
      const response = await fetch(
        `https://${window.location.hostname}/payment-method`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_method }),
        }
      ).then((res) => res.json())

      console.log("payment-method-response", response)
      if (response && response.status === "requires_action") {
        const { error: errorAction, setupIntent } =
          await stripe.handleNextAction({
            clientSecret: response.client_secret,
            return_url: `https://${window.location.hostname}/stripe/index.html`,
          })

        console.log("handle-next-action", errorAction, setupIntent)

        if (errorAction) {
          addMessage(errorAction.message)
        } else {
          canBuy = true
          canSubscribe = true
          addButton.style.display = "none"
          buyBalanceButton.style.display = "block"
          subscriptionButton.style.display = "block"
        }
      } else {
        canBuy = true
        canSubscribe = true
        addButton.style.display = "none"
        buyBalanceButton.style.display = "block"
        subscriptionButton.style.display = "block"
      }
    } else {
      addMessage("No payment method to add")
    }
  })

  // Buy balance
  buyBalanceButton.addEventListener("click", async () => {
    if (payment_method && canBuy) {
      const response = await fetch(
        `https://${window.location.hostname}/payment-intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: 20,
            payment_method,
            currency: "usd",
            payment_method_type: "card",
          }),
        }
      ).then((res) => res.json())

      console.log("balance", response)
      if (response && response.status === "requires_action") {
        const { error: errorAction, paymentIntent } =
          await stripe.confirmCardPayment(response.client_secret)

        console.log("confirm-card-payment", errorAction, paymentIntent)

        if (errorAction) addMessage(errorAction.message)
      }
    } else {
      addMessage("No payment method to add")
    }
  })

  // Create subscription
  subscriptionButton.addEventListener("click", async () => {
    if (payment_method && canSubscribe) {
      const response = await fetch(
        `https://${window.location.hostname}/subscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_method, pending: false }),
        }
      ).then((res) => res.json())

      console.log("subscription", response)
      if (response && response.status === "requires_action") {
        const { error: errorAction, paymentIntent } =
          await stripe.confirmCardPayment(response.client_secret)

        console.log("confirm-card-payment", errorAction, paymentIntent)

        if (errorAction) addMessage(errorAction.message)
      }
    } else {
      addMessage("No payment method to add")
    }
  })

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
