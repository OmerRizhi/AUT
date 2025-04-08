// === Variables ===
const BUCKET_NAME = "verbal-fluency-2025";
let data = [];
let timerInterval;
const gameDuration = 2 * 60;
const colors = ["#fce4ec", "#e3f2fd", "#e8f5e9", "#fff3e0", "#f3e5f5", "#e0f2f1"];
let currentClusterColorIndex = 1;
let clustered = [];
let selectedStartIndex = null;

// === Game Start ===
function startGame() {
    document.getElementById("instruction").style.display = "none";
    document.getElementById("input-area").style.display = "block";
    document.getElementById("timer").style.display = "block";

    const inputArea = document.getElementById("input-area");
    const inputs = inputArea.querySelectorAll("input");
    inputs[0].disabled = false;
    inputs[0].focus();

    inputs.forEach((input, index) => {
        let startedTyping = false;

        input.addEventListener("keydown", (e) => {
            if (!startedTyping && e.key.length === 1) {
                input.dataset.startTyping = new Date().toISOString();
                startedTyping = true;
            }

            if (e.key === "Enter" && input.value.trim()) {
                data.push({
                    index: index,
                    text: input.value.trim(),
                    startTyping: input.dataset.startTyping || null,
                    enterPressed: new Date().toISOString()
                });

                input.disabled = true;
                if (index + 1 < inputs.length) {
                    inputs[index + 1].disabled = false;
                    inputs[index + 1].focus();
                }
            }
        });
    });

    startTimer(gameDuration);
}

// === Timer ===
function startTimer(seconds) {
    const timerDisplay = document.getElementById("timer");
    let timeLeft = seconds;

    const updateTimer = () => {
        const minutes = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerDisplay.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(timerInterval);
            timerDisplay.textContent = "0:00";
            endGame();
        }
    };

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

// === End Game & Clustering ===
function endGame() {
    alert("Time is up!");
    document.getElementById("input-area").style.display = "none";
    document.getElementById("timer").style.display = "none";
    startClustering();
}

function startClustering() {
    document.getElementById("clustering-phase").style.display = "block";
    const clusterUl = document.getElementById("cluster-list");

    data.forEach((item, index) => {
        const li = document.createElement("li");
        li.textContent = `${index + 1}. ${item.text}`;
        li.dataset.index = index;
        li.classList.add("cluster-item");
        clusterUl.appendChild(li);
    });

    document.querySelectorAll(".cluster-item").forEach((li) => {
        li.addEventListener("click", () => handleClusterClick(li));
    });
}

function handleClusterClick(itemEl) {
    const idx = parseInt(itemEl.dataset.index);

    // If clicked item is already clustered → uncluster the group
    if (clustered[idx]) {
        const clusterId = clustered[idx];
        // Loop through all items in the cluster and reset them
        document.querySelectorAll(".cluster-item").forEach((el) => {
            console.log(el.dataset.index);
            const elIdx = parseInt(el.dataset.index);
            if (clustered[elIdx] === clusterId) {
                el.style.backgroundColor = ""; // Reset background color
                delete clustered[elIdx]; // Remove from cluster
            }
        });
        selectedStartIndex = null; // Reset start index when un-clustered
        return; // Exit function if already clustered
    }

    // Selecting first item (start of cluster)
    if (selectedStartIndex === null) {
        selectedStartIndex = idx;
        itemEl.style.backgroundColor = "#ddd"; // Mark start item
        console.log(clustered);
        return;
    }

    // Selecting end item (end of cluster) → cluster all in range
    const start = Math.min(selectedStartIndex, idx);
    const end = Math.max(selectedStartIndex, idx);
    const color = colors[currentClusterColorIndex % colors.length];

    // Loop over the range to set the cluster and background color
    for (let i = start; i <= end; i++) {
        const el = document.querySelector(`[data-index='${i}']`);
        el.style.backgroundColor = color; // Set background color for cluster
        clustered[i] = currentClusterColorIndex; // Store cluster index
    }

    // Reset selected start index and increment cluster color
    selectedStartIndex = null;
    currentClusterColorIndex++;

    // Enable submit button when all items are clustered
    if (Object.keys(clustered).length === data.length) {
        document.getElementById("submit-clusters").disabled = false;
    }
}


// === Submit ===
document.getElementById("submit-clusters").addEventListener("click", () => {
    const clusterMap = {};

    Object.entries(clustered).forEach(([index, clusterId]) => {
        if (!clusterMap[clusterId]) clusterMap[clusterId] = [];
        clusterMap[clusterId].push(data[parseInt(index)]);
    });

    const finalClusters = Object.entries(clusterMap).map(([id, items]) => ({
        clusterId: parseInt(id),
        items: items
    }));

    console.log("Final Clusters:", finalClusters);
    data = finalClusters;
    uploadDataWithRetry();
    alert("Thanks! Clusters saved.");

});


// === upload to S3 ===

function getRedirectionUrl() {
    const urlParams = new URL(location.href).searchParams;
    let prolific_id = urlParams.get('PROLIFIC_PID');
    let study_id = urlParams.get('STUDY_ID');
    let session_id = urlParams.get('SESSION_ID');
    let expUrl = urlParams.get('expUrl');
    return expUrl + '&PROLIFIC_PID=' + prolific_id + '&STUDY_ID=' + study_id + '&SESSION_ID=' + session_id;
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
                    "exp_data": JSON.stringify(JSON.stringify(data)) // no idea why it needs to double stringify, but it won't work otherwise.
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