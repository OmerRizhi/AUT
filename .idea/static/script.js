let startTime;
let currentBox = 0;
let data = [];

function startGame() {
    const queryParams = new URLSearchParams(window.location.search);
    const timeLimit = parseInt(queryParams.get("time")) || 120;
    const redirectURL = queryParams.get("next") || "https://example.com/thankyou";

    const inputArea = document.getElementById("input-area");
    for (let i = 0; i < 100; i++) {
        const input = document.createElement("input");
        input.type = "text";
        input.dataset.index = i;
        input.disabled = i !== 0;
        inputArea.appendChild(input);
    }

    const inputs = inputArea.querySelectorAll("input");
    inputs[0].focus();
    inputs.forEach((input, index) => {
        input.addEventListener("focus", () => {
            input.dataset.focusedAt = Date.now();
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && input.value.trim()) {
                data.push({
                    index,
                    text: input.value.trim(),
                    focusTime: parseInt(input.dataset.focusedAt),
                    typedAt: Date.now(),
                    submittedAt: Date.now()
                });
                if (index + 1 < inputs.length) {
                    input.disabled = true;
                    inputs[index + 1].disabled = false;
                    inputs[index + 1].focus();
                }
            }
        });
    });

    startTimer(timeLimit, redirectURL);
}

function startTimer(seconds, redirectURL) {
    const timerEl = document.getElementById("timer");
    let remaining = seconds;
    const interval = setInterval(() => {
        const min = String(Math.floor(remaining / 60)).padStart(2, '0');
        const sec = String(remaining % 60).padStart(2, '0');
        timerEl.textContent = `${min}:${sec}`;
        if (--remaining < 0) {
            clearInterval(interval);
            document.getElementById("popup").classList.add("show");
        }
    }, 1000);
}

function submitData() {
    const queryParams = new URLSearchParams(window.location.search);
    const redirectURL = queryParams.get("next") || "https://example.com/thankyou";

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "response_data.json";
    link.click();
    window.location.href = redirectURL;
}
