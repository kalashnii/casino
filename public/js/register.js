addEventListener("load", () => {
    document.getElementById("register").addEventListener("submit", async (event) => {
        event.preventDefault()

        const data = {}
        new FormData(event.target).forEach((value, key) => data[key] = value)

        if (await register(data)) {
            window.location = "/main.html"
        }
    })
})

async function register(data) {
    const response = await fetch("/api/v1/users/register", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "content-type": "application/json" }
    })

    if (response.ok) {
        return true;
    }

    const responseData = await response.json()
    const errorCode = responseData["errorCode"]
    if (errorCode === 1) {
        alert("username already taken")
    } else if (errorCode === 2) {
        alert("password too short")
    } else {
        alert("something unexpected happend")
    }

    return false;
}