
"use strict";

// ========================================
// 1. SELECTEURS
// ========================================

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);


// ========================================
// 2. MODES POMODORO
// ========================================

const modes = {
    focus: {
        minutes: 25,
        label: "TEMPS DE CONCENTRATION"
    },
    short: {
        minutes: 5,
        label: "PETITE PAUSE"
    },
    long: {
        minutes: 15,
        label: "LONGUE PAUSE"
    }
};

let currentMode = "focus";
let initialSeconds = 25 * 60;
let timeLeft = initialSeconds;
let intervalId = null;
let session = 1;


// ========================================
// 3. VARIABLES AUDIO
// ========================================

let audioContext = null;

// Son ambiant
let source = null;
let gain = null;
let soundOn = false;


// Créer le contexte audio au premier besoin
async function getAudioContext() {

    const AudioCtx =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioCtx) {
        throw new Error("Audio non pris en charge.");
    }

    if (!audioContext || audioContext.state === "closed") {
        audioContext = new AudioCtx();
    }

    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }

    return audioContext;
}


// ========================================
// 4. AFFICHAGE DU TEMPS
// ========================================

function showTime() {

    const hours = Math.floor(timeLeft / 3600);

    const min = Math.floor((timeLeft % 3600) / 60);

    const sec = timeLeft % 60;

    let formattedTime;

    if (hours > 0) {

        formattedTime =
            `${hours}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

    } else {

        formattedTime =
            `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

    }

    $("#time").textContent = formattedTime;

    const progress =
        Math.max(0, Math.min(1, (initialSeconds - timeLeft) / initialSeconds));

    $(".clock").style.background = `
        conic-gradient(
            #ffffffb8 ${progress * 360}deg,
            #ffffff22 ${progress * 360}deg
        )
    `;
}


// ========================================
// 5. NOTIFICATIONS SONORES
// ========================================

async function playNotification(type) {

    try {

        const ctx = await getAudioContext();

        // Notes de début ou de fin
        const notes = type === "start"
            ? [
                { frequency: 523.25, delay: 0, duration: 0.18 },
                { frequency: 659.25, delay: 0.18, duration: 0.25 }
            ]
            : [
                { frequency: 659.25, delay: 0, duration: 0.18 },
                { frequency: 783.99, delay: 0.22, duration: 0.18 },
                { frequency: 1046.50, delay: 0.44, duration: 0.35 }
            ];

        const now = ctx.currentTime;

        notes.forEach(note => {

            const oscillator = ctx.createOscillator();

            const notificationGain = ctx.createGain();

            oscillator.type = "sine";

            oscillator.frequency.value = note.frequency;

            oscillator.connect(notificationGain);

            notificationGain.connect(ctx.destination);

            const start = now + note.delay;

            const end = start + note.duration;

            notificationGain.gain.setValueAtTime(0.0001, start);

            notificationGain.gain.exponentialRampToValueAtTime(
                0.18,
                start + 0.025
            );

            notificationGain.gain.exponentialRampToValueAtTime(
                0.0001,
                end
            );

            oscillator.start(start);

            oscillator.stop(end + 0.02);

        });

    } catch (error) {

        console.error("Erreur notification audio :", error);

    }

}


// ========================================
// 6. START / PAUSE / RESET
// ========================================

function stopTimer() {

    if (intervalId !== null) {
        clearInterval(intervalId);
    }

    intervalId = null;

    $("#start").textContent = "▶ Start";
}


async function startTimer() {

    if (intervalId !== null || timeLeft <= 0) {
        return;
    }

    // Son au démarrage
    await playNotification("start");

    intervalId = setInterval(() => {

        timeLeft--;

        showTime();

        if (timeLeft <= 0) {

            stopTimer();

            // Son à la fin
            playNotification("end");

            $("#status").textContent =
                "Bravo ! Tu as terminé cette session.";

            if (currentMode === "focus") {
                session++;
            }

            $("#session").textContent = `Session ${session}`;

        }

    }, 1000);

    $("#start").textContent = "Ⅱ Pause";

    $("#status").textContent =
        "Concentre-toi sur une seule chose.";

}


// Bouton Start / Pause

$("#start").addEventListener("click", () => {

    if (intervalId === null) {

        startTimer();

    } else {

        stopTimer();

        $("#status").textContent = "Minuteur en pause.";

    }

});


// Bouton Reset

$("#reset").addEventListener("click", () => {

    stopTimer();

    timeLeft = initialSeconds;

    showTime();

    $("#status").textContent = "Minuteur réinitialisé.";

});


// ========================================
// 7. CHOIX DU MODE
// ========================================

function chooseMode(mode) {

    if (!modes[mode]) return;

    stopTimer();

    currentMode = mode;

    initialSeconds = modes[mode].minutes * 60;

    timeLeft = initialSeconds;

    $("#label").textContent = modes[mode].label;

    $$(".mode").forEach(btn => {

        btn.classList.toggle(
            "active",
            btn.dataset.mode === mode
        );

    });

    $("#status").textContent = "Prêt quand tu l'es.";

    showTime();

}


$$(".mode").forEach(btn => {

    btn.addEventListener("click", () => {

        chooseMode(btn.dataset.mode);

    });

});


// ========================================
// 8. DURÉE PERSONNALISÉE
// ========================================

$("#apply").addEventListener("click", () => {

    const minutes = Number($("#minutes").value);

    if (
        !Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > 240
    ) {

        $("#status").textContent =
            "Entre une durée entre 1 et 240 minutes.";

        return;

    }

    stopTimer();

    currentMode = "custom";

    initialSeconds = minutes * 60;

    timeLeft = initialSeconds;

    $("#label").textContent = "DURÉE PERSONNALISÉE";

    $$(".mode").forEach(btn => {

        btn.classList.remove("active");

    });

    $("#status").textContent =
        `Durée réglée sur ${minutes} minutes.`;

    showTime();

});


// ========================================
// 9. BACKGROUND
// ========================================

function setBackground(imageUrl) {

    if (!imageUrl) return;

    $("#bg").style.backgroundImage =
        `url("${imageUrl}")`;

    $("#bg").style.backgroundSize = "cover";
    $("#bg").style.backgroundPosition = "center";
    $("#bg").style.backgroundRepeat = "no-repeat";

    $$(".wall").forEach(btn => {
        btn.classList.toggle(
            "selected",
            btn.dataset.bg === imageUrl
        );
    });

    localStorage.setItem("sf-image", imageUrl);
    localStorage.removeItem("sf-bg");
}

$$(".wall").forEach(btn => {

    btn.addEventListener("click", () => {

        setBackground(btn.dataset.bg);

    });

});


$$(".wall").forEach(btn => {

    btn.addEventListener("click", () => {

        setBackground(btn.dataset.bg);

    });

});


// ========================================
// 10. IMPORTER UNE IMAGE
// ========================================

$("#upload").addEventListener("change", event => {

    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {

        $("#status").textContent =
            "Choisis une image valide.";

        return;

    }

    const reader = new FileReader();

    reader.onload = () => {

        $("#bg").style.backgroundImage =
            `url("${reader.result}")`;

        $("#bg").style.backgroundSize = "cover";

        $("#bg").style.backgroundPosition = "center";

        $$(".wall").forEach(btn => {

            btn.classList.remove("selected");

        });

        try {

            localStorage.setItem("sf-image", reader.result);

            localStorage.removeItem("sf-bg");

        } catch (error) {

            $("#status").textContent =
                "Image appliquée, mais trop grande pour être mémorisée.";

        }

    };

    reader.onerror = () => {

        $("#status").textContent =
            "Impossible de charger cette image.";

    };

    reader.readAsDataURL(file);

});


// ========================================
// 11. COULEURS
// ========================================

function setColor(color) {

    document.documentElement.style.setProperty(
        "--clock",
        color
    );

    $$(".dot").forEach(btn => {

        btn.classList.toggle(
            "selected",
            btn.dataset.color.toLowerCase() === color.toLowerCase()
        );

    });

    $("#color").value = color;

    localStorage.setItem("sf-color", color);

}


$$(".dot").forEach(btn => {

    btn.addEventListener("click", () => {

        setColor(btn.dataset.color);

    });

});


$("#color").addEventListener("input", event => {

    setColor(event.target.value);

});


// ========================================
// 12. GÉNÉRER LES SONS AMBIANTS
// ========================================

function makeNoiseBuffer(ctx, kind) {

    const buffer = ctx.createBuffer(
        1,
        ctx.sampleRate * 2,
        ctx.sampleRate
    );

    const data = buffer.getChannelData(0);

    let last = 0;

    for (let i = 0; i < data.length; i++) {

        const white = Math.random() * 2 - 1;

        if (kind === "rain") {

            last = (last + 0.025 * white) / 1.025;

            data[i] = last * 3.5;

        } else if (kind === "wind") {

            last = 0.97 * last + 0.03 * white;

            data[i] = last * 2.4;

        } else {

            data[i] = white * 0.22;

        }

    }

    return buffer;

}


// ========================================
// 13. ACTIVER LE SON AMBIANT
// ========================================

async function turnSoundOn() {

    const ctx = await getAudioContext();

    if (source) {

        try {
            source.stop();
        } catch (error) {}

        source = null;

    }

    if (!gain) {

        gain = ctx.createGain();

        gain.connect(ctx.destination);

    }

    source = ctx.createBufferSource();

    source.buffer = makeNoiseBuffer(
        ctx,
        $("#soundType").value
    );

    source.loop = true;

    source.connect(gain);

    source.start();

    soundOn = true;

    updateSoundButton();

    updateVolume();

}


// ========================================
// 14. DÉSACTIVER LE SON AMBIANT
// ========================================

function turnSoundOff() {

    if (source) {

        try {
            source.stop();
        } catch (error) {}

        source = null;

    }

    soundOn = false;

    updateSoundButton();

}


// Bouton son

function updateSoundButton() {

    $("#soundToggle").textContent =
        soundOn ? "Activé" : "Désactivé";

    $("#soundToggle").classList.toggle(
        "on",
        soundOn
    );

}


// ========================================
// 15. VOLUME
// ========================================

function updateVolume() {

    const value = Number($("#volume").value);

    $("#volumeText").textContent = `${value}%`;

    if (gain && audioContext) {

        gain.gain.setTargetAtTime(
            value / 100 * 0.18,
            audioContext.currentTime,
            0.04
        );

    }

}


// Bouton activation / désactivation

$("#soundToggle").addEventListener("click", async () => {

    try {

        if (soundOn) {

            turnSoundOff();

        } else {

            await turnSoundOn();

        }

    } catch (error) {

        console.error(error);

        $("#status").textContent =
            "Impossible d'activer le son.";

    }

});


// Changement du type de son

$("#soundType").addEventListener("change", async () => {

    if (soundOn) {

        try {
            await turnSoundOn();
        } catch (error) {
            console.error(error);
        }

    }

});


// Changement du volume

$("#volume").addEventListener("input", updateVolume);


// ========================================
// 16. PLEIN ÉCRAN
// ========================================

$("#fullscreen").addEventListener("click", async () => {

    try {

        if (!document.fullscreenElement) {

            await document.documentElement.requestFullscreen();

        } else {

            await document.exitFullscreen();

        }

    } catch (error) {

        $("#status").textContent =
            "Plein écran indisponible.";

    }

});


// ========================================
// 17. CHARGER LES PRÉFÉRENCES
// ========================================

function loadPreferences() {

    const image = localStorage.getItem("sf-image");
    const color = localStorage.getItem("sf-color");

    if (image) {

        $("#bg").style.backgroundImage =
            `url("${image}")`;

        $("#bg").style.backgroundSize = "cover";
        $("#bg").style.backgroundPosition = "center";
        $("#bg").style.backgroundRepeat = "no-repeat";

        $$(".wall").forEach(btn => {
            btn.classList.toggle(
                "selected",
                btn.dataset.bg === image
            );
        });

    }

    if (color) {
        setColor(color);
    }
}


// ========================================
// 18. INITIALISATION
// ========================================

function init() {

    loadPreferences();

    showTime();

    updateVolume();

    $("#session").textContent = `Session ${session}`;

    $("#label").textContent = modes.focus.label;

}

init();
