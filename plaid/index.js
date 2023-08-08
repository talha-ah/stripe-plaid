document.addEventListener("DOMContentLoaded", async () => {
  const fetchLinkToken = async () => {
    const { link_token } = await fetch(`http://localhost:4242/link-token`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }).then((res) => res.json())
    console.log("plaid.js", link_token)
    return link_token
  }

  try {
    const handler = Plaid.create({
      token: await fetchLinkToken(),
      onSuccess: async (publicToken, metadata) => {
        console.log("onSuccess")
        console.log("public token", publicToken)
        console.log("accounts", metadata.accounts)
      },
      onEvent: (metadata) => {
        console.log("on event", metadata)
      },
      onExit: (error, metadata) => {
        console.log("onExit", error, metadata)
      },
    })

    document.getElementById("plaid-button").on("click", (e) => {
      handler.open()
    })
  } catch (e) {
    addMessage(e.message)
  }
})
