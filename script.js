let currentImageBase64 = null;
let currentWeather = null;

async function sendMessage() {
    let input = document.getElementById("userInput").value;
    if (!input && !currentImageBase64) return;

    let chatbox = document.getElementById("chatbox");

    let userMsgHtml = `<div class="user-message">`;
    if (currentImageBase64) {
        userMsgHtml += `<img src="${currentImageBase64}" style="max-width: 100%; border-radius: 8px; margin-bottom: 8px;"/><br>`;
    }
    if (input) {
        userMsgHtml += `${input}`;
    } else {
        userMsgHtml += `[Image uploaded]`;
    }
    userMsgHtml += `</div>`;
    
    chatbox.innerHTML += userMsgHtml;

    let loading = document.createElement("div");
    loading.className = "bot-message";
    loading.innerText = "Typing...";
    chatbox.appendChild(loading);
    chatbox.scrollTop = chatbox.scrollHeight;

    const payload = {
        message: input || "Please analyze this crop image. Identify the plant, any diseases or pests, and suggest local Kenyan treatments.",
        image: currentImageBase64,
        context: {
            location: document.getElementById("weatherLocation").innerText,
            weather: currentWeather
        }
    };

    // Reset input elements
    removeImage();
    document.getElementById("userInput").value = "";

    try {
        let response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        let data = await response.json();
        loading.remove();

        const formattedReply = formatMessage(data.reply);
        chatbox.innerHTML += `<div class="bot-message">${formattedReply}</div>`;
        chatbox.scrollTop = chatbox.scrollHeight;

    } catch (err) {
        loading.innerText = "Error connecting to AI.";
    }
}

function quickMsg(text) {
    document.getElementById("userInput").value = text;
    sendMessage();
}

function handleEnter(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

function startVoice() {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Your browser does not support Speech Recognition.");
        return;
    }
    
    const recognition = new webkitSpeechRecognition();
    const micBtn = document.querySelector(".mic-btn");
    const userInput = document.getElementById("userInput");

    recognition.lang = 'en-US'; // Default, can be changed
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        micBtn.classList.add("recording");
        userInput.placeholder = "Listening...";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        sendMessage(); // Automatically send after voice input
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        micBtn.classList.remove("recording");
        userInput.placeholder = "Type or speak...";
    };

    recognition.onend = () => {
        micBtn.classList.remove("recording");
        userInput.placeholder = "Type or speak...";
    };

    recognition.start();
}

function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentImageBase64 = e.target.result;
            const previewContainer = document.getElementById("imagePreviewContainer");
            const previewImage = document.getElementById("imagePreview");
            
            previewImage.src = currentImageBase64;
            previewContainer.style.display = "block";
        }
        reader.readAsDataURL(file);
    }
}

function removeImage() {
    currentImageBase64 = null;
    document.getElementById("imagePreviewContainer").style.display = "none";
    document.getElementById("fileInput").value = "";
}

async function fetchWeather() {
    try {
        // Nairobi coordinates: 1.2921 S, 36.8219 E
        const url = "https://api.open-meteo.com/v1/forecast?latitude=-1.2921&longitude=36.8219&current_weather=true";
        const res = await fetch(url);
        const data = await res.json();
        
        if (data && data.current_weather) {
            const temp = data.current_weather.temperature;
            const wmoCode = data.current_weather.weathercode;
            
            document.getElementById("weatherLocation").innerText = "Nairobi, Kenya";
            document.getElementById("weatherTemp").innerText = `${temp}°C`;
            
            currentWeather = {
                temp: temp,
                condition: wmoCode
            };
            
            // Map simple weather codes
            let desc = "Clear";
            let icon = "☀️";
            if (wmoCode >= 1 && wmoCode <= 3) { desc = "Partly Cloudy"; icon = "⛅"; }
            else if (wmoCode >= 45 && wmoCode <= 48) { desc = "Foggy"; icon = "🌫️"; }
            else if (wmoCode >= 51 && wmoCode <= 67) { desc = "Rainy"; icon = "🌧️"; }
            else if (wmoCode >= 71 && wmoCode <= 77) { desc = "Snowy"; icon = "❄️"; }
            else if (wmoCode >= 80 && wmoCode <= 82) { desc = "Showers"; icon = "🌦️"; }
            else if (wmoCode >= 95) { desc = "Thunderstorm"; icon = "⛈️"; }
            
            document.getElementById("weatherDesc").innerText = desc;
            document.getElementById("weatherIcon").innerText = icon;
        }
    } catch (e) {
        console.error("Error fetching weather:", e);
        document.getElementById("weatherLocation").innerText = "Location Offline";
    }
}

function formatMessage(text) {
    if (!text) return "";
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Bullet points (simple)
    text = text.replace(/^\s*[\*\-]\s+(.*)$/gm, "• $1");
    // Line breaks
    return text.replace(/\n/g, "<br>");
}

// Call on load
window.onload = () => {
    fetchWeather();
};