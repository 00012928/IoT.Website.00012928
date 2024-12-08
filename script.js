const firebaseConfig = {
  apiKey: "AIzaSyAC98uVKkP0QhDrUEf-SdE15mpEB3i2H9Q",
  authDomain: "project-8800160955213572428.firebaseapp.com",
  databaseURL: "https://project-8800160955213572428-default-rtdb.firebaseio.com",
  projectId: "project-8800160955213572428",
  storageBucket: "project-8800160955213572428.firebasestorage.app",
  messagingSenderId: "705576656171",
  appId: "1:705576656171:web:52616afa89e25edacf396e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const temperatureEl = document.getElementById("temperature");
const humidityEl = document.getElementById("humidity");
const flameAlertEl = document.getElementById("flame-alert");
const buzzerStatusEl = document.getElementById("buzzer-status");
const updateBuzzerButton = document.getElementById("update-buzzer");
const cardListEl = document.getElementById("card-list");
const newCardUidInput = document.getElementById("new-card-uid");
const addCardButton = document.getElementById("add-card");

const avgTempEl = document.getElementById("avg-temp");
const maxTempEl = document.getElementById("max-temp");
const minTempEl = document.getElementById("min-temp");
const avgHumEl = document.getElementById("avg-hum");
const maxHumEl = document.getElementById("max-hum");
const minHumEl = document.getElementById("min-hum");

const historyTableBody = document.getElementById("history-table-body");

// Chart.js setup
let sensorChart = null;
function renderChart(timestamps, temperatures, humidities) {
  const ctx = document.getElementById("sensorChart").getContext("2d");

  if (sensorChart) {
    sensorChart.destroy(); // Destroy previous chart instance
  }

  sensorChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: timestamps,
      datasets: [
        {
          label: "Temperature (°C)",
          data: temperatures,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          fill: true
        },
        {
          label: "Humidity (%)",
          data: humidities,
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: "top"
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Timestamp"
          }
        },
        y: {
          title: {
            display: true,
            text: "Values"
          }
        }
      }
    }
  });
}

// Fetch sensor data and history
database.ref("sensors").on("value", (snapshot) => {
  const data = snapshot.val();
  if (data) {
    temperatureEl.textContent = (data.temperature || 0).toFixed(1);
    humidityEl.textContent = (data.humidity || 0).toFixed(1);
  }
});

database.ref("sensor_history").on("value", (snapshot) => {
  const history = snapshot.val();
  if (history) {
    const timestamps = [];
    const temperatures = [];
    const humidities = [];

    historyTableBody.innerHTML = ""; // Clear existing table rows

    Object.values(history).forEach((entry) => {
      // Extract values
      const timestamp = entry.timestamp || "N/A";
      const temperature = entry.temperature || 0;
      const humidity = entry.humidity || 0;

      // Populate Chart.js data
      timestamps.push(timestamp);
      temperatures.push(temperature);
      humidities.push(humidity);

      // Add row to Sensor History Table
      const row = document.createElement("tr");
      const timestampCell = document.createElement("td");
      const temperatureCell = document.createElement("td");
      const humidityCell = document.createElement("td");

      timestampCell.textContent = timestamp;
      temperatureCell.textContent = temperature.toFixed(1);
      humidityCell.textContent = humidity.toFixed(1);

      row.appendChild(timestampCell);
      row.appendChild(temperatureCell);
      row.appendChild(humidityCell);
      historyTableBody.appendChild(row);
    });

    renderChart(timestamps, temperatures, humidities);
    performAnalysis(temperatures, humidities);
  }
});

// Perform data analysis
function performAnalysis(temperatures, humidities) {
  if (temperatures.length === 0 || humidities.length === 0) return;

  const avgTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
  const maxTemp = Math.max(...temperatures);
  const minTemp = Math.min(...temperatures);

  const avgHum = humidities.reduce((a, b) => a + b, 0) / humidities.length;
  const maxHum = Math.max(...humidities);
  const minHum = Math.min(...humidities);

  avgTempEl.textContent = avgTemp.toFixed(1);
  maxTempEl.textContent = maxTemp.toFixed(1);
  minTempEl.textContent = minTemp.toFixed(1);

  avgHumEl.textContent = avgHum.toFixed(1);
  maxHumEl.textContent = maxHum.toFixed(1);
  minHumEl.textContent = minHum.toFixed(1);
}

// Realtime listener for flame status
database.ref("settings/Buzzer").on("value", (snapshot) => {
  const buzzerStatus = parseInt(snapshot.val(), 10);
  flameAlertEl.classList.toggle("hidden", buzzerStatus !== 1);
  buzzerStatusEl.value = buzzerStatus.toString();
});

// Update buzzer status
updateBuzzerButton.addEventListener("click", () => {
  const newStatus = parseInt(buzzerStatusEl.value, 10);
  updateBuzzerButton.disabled = true; // Disable button while updating
  database.ref("settings/Buzzer").set(newStatus)
    .then(() => {
      alert("Buzzer status updated successfully!");
    })
    .catch((error) => {
      console.error("Error updating buzzer status:", error);
      alert("Failed to update buzzer status.");
    })
    .finally(() => {
      updateBuzzerButton.disabled = false; // Re-enable button
    });
});

// Fetch and display authorized cards
database.ref("authorized_cards").on("value", (snapshot) => {
  const cards = snapshot.val();
  cardListEl.innerHTML = "";

  if (cards) {
    cards.forEach((card, index) => {
      if (card) {
        const li = document.createElement("li");
        li.textContent = card;

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => {
          deleteButton.disabled = true; // Disable button while deleting
          deleteCard(index);
        });

        li.appendChild(deleteButton);
        cardListEl.appendChild(li);
      }
    });
  }
});

// Add new card
addCardButton.addEventListener("click", () => {
  const newCardUid = newCardUidInput.value.trim();
  if (!/^[0-9a-fA-F]+$/.test(newCardUid)) {
    alert("Please enter a valid hexadecimal card UID.");
    return;
  }
  if (newCardUid) {
    addCard(newCardUid);
    newCardUidInput.value = "";
  } else {
    alert("Please enter a valid card UID.");
  }
});

function addCard(uid) {
  addCardButton.disabled = true; // Disable button while adding
  database.ref("authorized_cards").transaction((cards) => {
    if (!cards) cards = [];
    if (!cards.includes(uid)) {
      cards.push(uid);
      alert("Card added successfully!");
    } else {
      alert("Card already exists.");
    }
    return cards;
  }).catch((error) => {
    console.error("Error adding card:", error);
    alert("Failed to add card.");
  }).finally(() => {
    addCardButton.disabled = false; // Re-enable button
  });
}

function deleteCard(index) {
  database.ref("authorized_cards").transaction((cards) => {
    if (cards && index >= 0 && index < cards.length) {
      cards.splice(index, 1);
      alert("Card deleted successfully!");
    } else {
      alert("Invalid card index.");
    }
    return cards;
  }).catch((error) => {
    console.error("Error deleting card:", error);
    alert("Failed to delete card.");
  });
}