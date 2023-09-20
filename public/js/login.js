addEventListener("load", () => {
    document.getElementById("login").addEventListener("submit", async (event) => {
        event.preventDefault()

        const data = {}
        new FormData(event.target).forEach((value, key) => data[key] = value)

        if (await login(data)) {
            window.location = "/main.html"
        }
    })
})

async function login(data) {
    const response = await fetch("/api/v1/users/login", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "content-type": "application/json" }
    })

    if (response.ok) {
        return true
    }

    const responseData = await response.json()
    const errorCode = responseData["errorCode"]
    if (errorCode === 3) {
        alert("user not found")
    } else if (errorCode === 4) {
        alert("password was incorrect")
    } else {
        alert("something unexpected happend")
    }

    return false
}