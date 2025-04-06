let startTime;
let lastEnterTime;
let newEnterTime;
let currentBox = 0;
let items = [];

const urlParams = new URL(location.href).searchParams;

function getRedirectionUrl() {
    let prolific_id = urlParams.get('PROLIFIC_PID');
    let study_id = urlParams.get('STUDY_ID');
    let session_id = urlParams.get('SESSION_ID');
    let expUrl = urlParams.get('expUrl');
    return expUrl + '&PROLIFIC_PID=' + prolific_id + '&STUDY_ID=' + study_id + '&SESSION_ID=' + session_id;
}
const BUCKET_NAME = "verbal-fluency-2025";


function startGame() {
    const queryParams = new URLSearchParams(window.location.search);
    const timeLimit = parseInt(queryParams.get("time")) || 120;

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
        let startedTyping = false;

        input.addEventListener("keydown", (e) => {
            if (!startedTyping && e.key.length === 1) {
                // First character typed
                input.dataset.startTyping = new Date().toISOString();
                startedTyping = true;
            }

            if (e.key === "Enter" && input.value.trim()) {
                newEnterTime = new Date().toISOString();
                items.push({
                    index: index,
                    text: input.value.trim(),
                    startTimer: lastEnterTime || input.dataset.startTyping,
                    startTyping: input.dataset.startTyping || null,
                    enterPressed: new Date().toISOString()
                });

                lastEnterTime = newEnterTime;

                input.disabled = true;

                if (index + 1 < inputs.length) {
                    const nextInput = inputs[index + 1];
                    nextInput.disabled = false;
                    nextInput.focus();
                }
            }
        });
    });

    startTimer(timeLimit, getRedirectionUrl());
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


function getProlificId(){
    const urlParams = new URL(location.href).searchParams;
// Get parameters by name
    return urlParams.get('PROLIFIC_PID')
}


function uploadDataWithRetry(lastTry=false, endTest=true ,retryCount = 5, delay = 1000) {
    let subject = getProlificId();

    return new Promise((resolve, reject) => {
        function attemptUpload(remainingRetries) {
            $.ajax({
                url: 'https://hss74dd1ed.execute-api.us-east-1.amazonaws.com/dev/',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    "subject_id": `${subject}`,
                    "bucket": `${BUCKET_NAME}`,
                    "exp_data": JSON.stringify(JSON.stringify(items)) // no idea why it needs to double stringify, but it won't work otherwise.
                }),
                success: function(response) {
                    console.log('Data uploaded successfully:', response);
                    resolve(response); // Resolve the promise on success
                    if(endTest) {
                        window.location.href = getRedirectionUrl();
                    }
                },
                error: function(xhr, status, error) {
                    console.error(`Error uploading data (${remainingRetries} retries left):`, error);
                    if (remainingRetries > 0) {
                        setTimeout(() => {
                            attemptUpload(remainingRetries - 1); // Retry with reduced retry count
                        }, delay);
                    }
                }
            });
        }

        attemptUpload(retryCount); // Start the upload process
    });
}