// A reference to Stripe.js initialized with your real test publishable API key.
var stripe = Stripe(
  "pk_test_51J4AEDFss2Kn689dqv8BUB9fN0YLr1nmM6450VSNP7z6G8TiTJvlpt6IYrsjFSbERmtvW4AXdtrUy88SrwWTTfYh00B3IGgM6r"
)

// The items the customer wants to buy
var purchase = {
  items: [{ id: "xl-tshirt" }],
}

// Disable the button until we have Stripe set up on the page
// document.querySelector("#submit").disabled = true

var elements = stripe.elements()

var style = {
  base: {
    color: "#32325d",
    fontFamily: "Arial, sans-serif",
    fontSmoothing: "antialiased",
    fontSize: "16px",
    "::placeholder": {
      color: "#32325d",
    },
  },
  invalid: {
    fontFamily: "Arial, sans-serif",
    color: "#fa755a",
    iconColor: "#fa755a",
  },
}

var card = elements.create("card", { style: style })
// Stripe injects an iframe into the DOM
card.mount("#card-element")

card.on("change", function (event) {
  // Disable the Pay button if there are no card details in the Element
  document.querySelector("button").disabled = event.empty
  document.querySelector("#card-error").textContent = event.error
    ? event.error.message
    : ""
})

var form = document.getElementById("payment-form")
form.addEventListener("submit", function (event) {
  event.preventDefault()
  // Complete payment when the submit button is clicked
  payWithCard(stripe, card)
})

// Calls stripe.confirmCardPayment
// If the card requires authentication Stripe shows a pop-up modal to
// prompt the user to enter authentication details without leaving your page.
var payWithCard = function (stripe, card, clientSecret) {
  loading(true)
  stripe
    .createPaymentMethod({
      type: "card",
      card: card,
      billing_details: {
        name: "Jenny Rosen",
      },
    })
    .then(function (result) {
      console.log("payment method", result)
    })
}

/* ------- UI helpers ------- */

// Shows a success message when the payment is complete
var orderComplete = function (paymentIntentId) {
  loading(false)
  document
    .querySelector(".result-message a")
    .setAttribute(
      "href",
      "https://dashboard.stripe.com/test/payments/" + paymentIntentId
    )
  document.querySelector(".result-message").classList.remove("hidden")
  document.querySelector("button").disabled = true
}

// Show the customer the error from Stripe if their card fails to charge
var showError = function (errorMsgText) {
  loading(false)
  var errorMsg = document.querySelector("#card-error")
  errorMsg.textContent = errorMsgText
  setTimeout(function () {
    errorMsg.textContent = ""
  }, 4000)
}

// Show a spinner on payment submission
var loading = function (isLoading) {
  if (isLoading) {
    // Disable the button and show a spinner
    document.querySelector("button").disabled = true
    document.querySelector("#spinner").classList.remove("hidden")
    document.querySelector("#button-text").classList.add("hidden")
  } else {
    document.querySelector("button").disabled = false
    document.querySelector("#spinner").classList.add("hidden")
    document.querySelector("#button-text").classList.remove("hidden")
  }
}
