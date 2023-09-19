

addEventListener("load", () => {
    document.getElementById("register").addEventListener("submit", async (event) => {
        event.preventDefault()
        const data = {};
        new FormData(event.target).forEach((value, key) => data[key] = value);
        await register(data);
        window.location = "/main.html"
    })
})
async function register(data) {
    console.log(data)

    const response = await fetch("/api/v1/users/register", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "content-type": "application/json" }
    })

    const responseData = await response.json()
    console.log(responseData)

    if (response.ok) {
        return
    }

    if (responseData["errorCode"] === 1) {
        alert("username already taken")
    }

    if (responseData["errorCode"] === 2) {
        alert("password too short")
    }

    else {
        alert("something unexpected happend")
    }
} 