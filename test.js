fetch("http://localhost:3000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
        message: "Habari Bwana Shamba! My tomatoes are showing yellow spots.",
        context: {
            location: "Nairobi, Kenya",
            weather: { temp: 24, condition: 1 }
        }
    })
}).then(res => res.json()).then(console.log).catch(console.error);
