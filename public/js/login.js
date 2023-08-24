

addEventListener("load", () => {
    document.getElementById("login").addEventListener("submit", (event) => {
        event.preventDefault()
        const data = {};
        new FormData(event.target).forEach((value, key) => data[key] = value);
        login(data);
        window.location = "/main.html"
    })
})


async function login(data) {
    const response = await fetch("/api/v1/users/login", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "content-type": "application/json" }
    })

    const responseData = await response.json()

}