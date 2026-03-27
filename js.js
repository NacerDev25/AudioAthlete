// AudioAthlete - Core Logic
const synth = window.speechSynthesis;

// Translations Object
const translations = {
    en: {
        dir: 'ltr',
        appTitle: 'AudioAthlete',
        appDesc: 'Smart audio-guided workout timer',
        settingsTitle: 'Settings',
        settingsHeading: 'Workout Settings',
        totalTime: 'Total Workout Time (minutes):',
        workInterval: 'Work Interval (seconds):',
        restInterval: 'Rest Interval (seconds):',
        expectedRounds: 'Expected Rounds: ',
        startBtn: 'Start Workout',
        pauseBtn: 'Pause',
        resetBtn: 'Reset',
        ready: 'Ready?',
        prepare: 'Prepare',
        work: 'Work',
        rest: 'Rest',
        finished: 'Finished',
        roundLabel: 'Round: ',
        alertSettings: 'Check settings. Work time must be > 0.',
        voicePrepare: 'Prepare. Starting in 5 seconds.',
        voice10Sec: '10 seconds left.',
        voiceWorkStart: (round) => `Round ${round}. Work!`,
        voiceRestStart: (sec) => `Rest for ${sec} seconds.`,
        voiceNextRound: (round) => `Round ${round}. Go!`,
        voicePaused: 'Paused.',
        voiceReset: 'Reset.',
        voiceFinished: 'Workout complete. Well done!',
        wakeLockActive: 'Screen will stay on during workout.',
        settingsLabel: 'Settings',
        closeSettingsLabel: 'Close Settings'
    },
    ar: {
        dir: 'rtl',
        appTitle: 'أوديو أثليت',
        appDesc: 'مؤقت رياضي ذكي بالتوجيه الصوتي',
        settingsTitle: 'الإعدادات',
        settingsHeading: 'إعدادات التمرين',
        totalTime: 'إجمالي وقت التمرين (بالدقائق):',
        workInterval: 'وقت الجولة (بالثواني):',
        restInterval: 'وقت الراحة (بالثواني):',
        expectedRounds: 'الجولات المتوقعة: ',
        startBtn: 'ابدأ التمرين',
        pauseBtn: 'إيقاف مؤقت',
        resetBtn: 'إعادة ضبط',
        ready: 'جاهز؟',
        prepare: 'استعد',
        work: 'تمرين',
        rest: 'راحة',
        finished: 'انتهى',
        roundLabel: 'الجولة: ',
        alertSettings: 'تأكد من الإعدادات. وقت الجولة يجب أن يكون أكبر من صفر.',
        voicePrepare: 'استعد. سنبدأ بعد 5 ثوانٍ.',
        voice10Sec: 'بقي 10 ثوانٍ.',
        voiceWorkStart: (round) => `الجولة ${round}. ابدأ التمرين!`,
        voiceRestStart: (sec) => `انتهت الجولة. استرح لمدة ${sec} ثانية.`,
        voiceNextRound: (round) => `الجولة ${round}. انطلق!`,
        voicePaused: 'تم إيقاف التمرين مؤقتاً.',
        voiceReset: 'تمت إعادة ضبط التمرين.',
        voiceFinished: 'تهانينا! اكتمل التمرين.',
        wakeLockActive: 'ستبقى الشاشة مفعلة طوال فترة التمرين.',
        settingsLabel: 'الإعدادات',
        closeSettingsLabel: 'إغلاق الإعدادات'
    }
};

let currentLanguage = 'en';

// DOM Elements
const settingsModal = document.getElementById('settings-modal');
const settingsToggle = document.getElementById('settings-toggle');
const closeSettings = document.getElementById('close-settings');
const languageSelect = document.getElementById('language-select');
const totalTimeInput = document.getElementById('total-time');
const workIntervalInput = document.getElementById('work-interval');
const restIntervalInput = document.getElementById('rest-interval');
const currentPhaseDisplay = document.getElementById('current-phase');
const currentRoundDisplay = document.getElementById('current-round');
const timerNumbersDisplay = document.getElementById('timer-numbers');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const announcementRegion = document.getElementById('announcement-region');

// State Variables
let currentIntervalSeconds = 0;
let currentPhase = 'Ready'; 
let currentRound = 0;
let totalRounds = 0;
let timerInterval = null;
let isPaused = false;
let wakeLock = null;

// Timing State (Drift-Free logic)
let phaseStartTime = 0;
let phaseDuration = 0;
let lastSpokenSecond = -1;
let pausedTime = 0;
let halfwayPointTriggered = false;

// --- ADVANCED AUDIO POOL ---

const audioPool = {
    ar: {
        start: new Audio('ar_start.mp3'),
        half: new Audio('ar_half.mp3'),
        three: new Audio('ar_three.mp3'),
        rest: new Audio('ar_rest.mp3')
    },
    en: {
        start: new Audio('en_start.mp3'),
        half: new Audio('en_half.mp3'),
        three: new Audio('en_three.mp3'),
        rest: new Audio('en_rest.mp3')
    }
};

const silentAudioNode = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
silentAudioNode.loop = true;

/**
 * SUPER-FIX: Extreme Audio Unlocking for Mobile
 * This function plays all sounds briefly and silences them to bypass mobile browser restrictions.
 */
async function primeAudioEngine() {
    if (synth) {
        synth.cancel();
        const unlock = new SpeechSynthesisUtterance(currentLanguage === 'ar' ? "نظام جاهز" : "Audio active");
        unlock.volume = 0.1; 
        unlock.lang = currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
        synth.speak(unlock);
    }

    // Unlock all audio files in the pool for the current language
    const currentPool = audioPool[currentLanguage];
    for (const key in currentPool) {
        try {
            const sound = currentPool[key];
            sound.muted = true; // Mute first to be safe
            await sound.play();
            sound.pause();
            sound.currentTime = 0;
            sound.muted = false; // Unmute for later use
        } catch (e) {
            console.warn(`Initial unlock failed for ${key}`, e);
        }
    }

    try {
        await silentAudioNode.play();
    } catch (e) {}
}

function playNotification(soundName) {
    const audio = audioPool[currentLanguage][soundName];
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.warn(`Playback blocked for ${soundName}`, e);
            if (soundName === 'start') announce(translations[currentLanguage].work);
        });
    }
}

function triggerHaptic() {
    if ("vibrate" in navigator) {
        navigator.vibrate(50);
    }
}

function setupMediaSession() {
    if ('mediaSession' in navigator && window.MediaMetadata) {
        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: 'AudioAthlete',
                artist: translations[currentLanguage].appTitle,
                album: translations[currentLanguage].appDesc
            });
            navigator.mediaSession.setActionHandler('play', startTimer);
            navigator.mediaSession.setActionHandler('pause', pauseTimer);
        } catch (e) {
            console.error("MediaSession error:", e);
        }
    }
}

// --- CORE UTILS ---

function convertArabicDigits(str) {
    if (typeof str !== 'string') str = String(str);
    return str.replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 1632)
              .replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 1776);
}

function getSafeNumber(input) {
    let val = convertArabicDigits(input.value);
    let num = Number(val);
    if (isNaN(num) || num < 0) return 0;
    return num;
}

// --- SCREEN WAKE LOCK ---
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {}
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release().then(() => wakeLock = null);
    }
}

document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

// --- ANNOUNCEMENT LOGIC ---

function announce(text) {
    if (!text) return;
    announcementRegion.textContent = '';
    setTimeout(() => {
        announcementRegion.textContent = text;
    }, 50);

    if (synth) {
        setTimeout(() => {
            synth.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
            utterance.rate = 1.0;
            synth.speak(utterance);
        }, 150); 
    }
}

// --- TIMER LOGIC ---

function calculateRounds() {
    const totalMinutes = getSafeNumber(totalTimeInput);
    const workSeconds = getSafeNumber(workIntervalInput);
    const restSeconds = getSafeNumber(restIntervalInput);
    const roundsCountSpan = document.getElementById('rounds-count');

    if (workSeconds <= 0) {
        totalRounds = 0;
        if (roundsCountSpan) roundsCountSpan.textContent = '0';
        return;
    }

    const totalWorkoutSeconds = totalMinutes * 60;
    const cycleSeconds = workSeconds + restSeconds;
    
    if (cycleSeconds > 0) {
        totalRounds = Math.floor(totalWorkoutSeconds / cycleSeconds);
        if (totalRounds < 1 && totalMinutes > 0) totalRounds = 1;
    } else {
        totalRounds = 0;
    }

    if (roundsCountSpan) roundsCountSpan.textContent = totalRounds;
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateDisplay() {
    const lang = translations[currentLanguage];
    timerNumbersDisplay.textContent = formatTime(currentIntervalSeconds);
    currentRoundDisplay.textContent = `${lang.roundLabel}${currentRound} / ${totalRounds}`;
    
    let displayPhase = lang.ready;
    if (currentPhase === 'Prepare') displayPhase = lang.prepare;
    if (currentPhase === 'Work') displayPhase = lang.work;
    if (currentPhase === 'Rest') displayPhase = lang.rest;
    if (currentPhase === 'Finished') displayPhase = lang.finished;
    
    currentPhaseDisplay.textContent = displayPhase;

    if (currentPhase === 'Work') {
        currentPhaseDisplay.style.color = 'var(--primary-color)';
        timerNumbersDisplay.style.color = 'var(--primary-color)';
    } else if (currentPhase === 'Rest') {
        currentPhaseDisplay.style.color = 'var(--secondary-color)';
        timerNumbersDisplay.style.color = 'var(--secondary-color)';
    } else {
        currentPhaseDisplay.style.color = 'var(--accent-blue)';
        timerNumbersDisplay.style.color = 'var(--text-main)';
    }
}

function tick() {
    if (isPaused) return;

    const now = Date.now();
    const elapsedSincePhaseStart = (now - phaseStartTime) / 1000;
    const remaining = phaseDuration - elapsedSincePhaseStart;
    const roundedRemaining = Math.max(0, Math.ceil(remaining));

    if (roundedRemaining !== currentIntervalSeconds) {
        currentIntervalSeconds = roundedRemaining;
        
        if (currentPhase === 'Work' && !halfwayPointTriggered && currentIntervalSeconds <= phaseDuration / 2) {
            playNotification('half');
            halfwayPointTriggered = true;
        }

        if (currentIntervalSeconds <= 3 && currentIntervalSeconds > 0 && lastSpokenSecond !== currentIntervalSeconds) {
            playNotification('three');
            lastSpokenSecond = currentIntervalSeconds;
        }

        if (currentPhase === 'Work' && currentIntervalSeconds === 10) {
            announce(translations[currentLanguage].voice10Sec);
        }

        if (remaining <= 0) {
            handlePhaseTransition();
        }
        
        updateDisplay();
    }
}

function startTimer() {
    primeAudioEngine();
    const lang = translations[currentLanguage];
    calculateRounds();
    setupMediaSession();
    requestWakeLock();

    if (timerInterval) return;

    if (!isPaused) {
        const workSec = getSafeNumber(workIntervalInput);
        if (workSec <= 0) {
            announce(lang.alertSettings);
            return;
        }
        currentRound = 1;
        currentPhase = 'Prepare';
        phaseDuration = 5;
        phaseStartTime = Date.now();
        currentIntervalSeconds = phaseDuration;
        lastSpokenSecond = -1;
        halfwayPointTriggered = false;
        setTimeout(() => announce(lang.voicePrepare), 500);
    } else {
        const alreadyElapsed = phaseDuration - pausedTime;
        phaseStartTime = Date.now() - (alreadyElapsed * 1000);
    }

    isPaused = false;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    timerInterval = setInterval(tick, 100);
    updateDisplay();
}

function handlePhaseTransition() {
    const lang = translations[currentLanguage];
    lastSpokenSecond = -1;
    halfwayPointTriggered = false;
    phaseStartTime = phaseStartTime + (phaseDuration * 1000);

    if (currentPhase === 'Prepare') {
        currentPhase = 'Work';
        phaseDuration = getSafeNumber(workIntervalInput);
        playNotification('start');
        announce(lang.voiceWorkStart(currentRound));
    } 
    else if (currentPhase === 'Work') {
        if (currentRound < totalRounds) {
            currentPhase = 'Rest';
            phaseDuration = getSafeNumber(restIntervalInput);
            playNotification('rest');
            announce(lang.voiceRestStart(phaseDuration));
        } else {
            finishWorkout();
            return;
        }
    } 
    else if (currentPhase === 'Rest') {
        currentRound++;
        currentPhase = 'Work';
        phaseDuration = getSafeNumber(workIntervalInput);
        playNotification('start');
        announce(lang.voiceNextRound(currentRound));
    }
    
    currentIntervalSeconds = phaseDuration;
    updateDisplay();
}

function pauseTimer() {
    const lang = translations[currentLanguage];
    clearInterval(timerInterval);
    timerInterval = null;
    isPaused = true;
    const now = Date.now();
    pausedTime = phaseDuration - ((now - phaseStartTime) / 1000);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    announce(lang.voicePaused);
    silentAudioNode.pause();
    releaseWakeLock();
}

function resetTimer() {
    const lang = translations[currentLanguage];
    clearInterval(timerInterval);
    timerInterval = null;
    isPaused = false;
    currentRound = 0;
    currentPhase = 'Ready';
    currentIntervalSeconds = 0;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    updateDisplay();
    announce(lang.voiceReset);
    silentAudioNode.pause();
    releaseWakeLock();
}

function finishWorkout() {
    const lang = translations[currentLanguage];
    clearInterval(timerInterval);
    timerInterval = null;
    currentPhase = 'Finished';
    currentIntervalSeconds = 0;
    announce(lang.voiceFinished);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    silentAudioNode.pause();
    releaseWakeLock();
}

function updateLanguage() {
    const lang = translations[currentLanguage];
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = lang.dir;
    document.getElementById('app-title').textContent = lang.appTitle;
    document.getElementById('app-description').textContent = lang.appDesc;
    document.getElementById('settings-title').textContent = lang.settingsTitle;
    document.getElementById('settings-heading').textContent = lang.settingsHeading;
    document.getElementById('label-total-time').textContent = lang.totalTime;
    document.getElementById('label-work-interval').textContent = lang.workInterval;
    document.getElementById('label-rest-interval').textContent = lang.restInterval;
    startBtn.textContent = lang.startBtn;
    pauseBtn.textContent = lang.pauseBtn;
    resetBtn.textContent = lang.resetBtn;
    settingsToggle.setAttribute('aria-label', lang.settingsLabel);
    closeSettings.setAttribute('aria-label', lang.closeSettingsLabel);
    calculateRounds();
    updateDisplay();
}

function setupChips() {
    const chipGroups = document.querySelectorAll('.chip-group');
    chipGroups.forEach(group => {
        const chips = group.querySelectorAll('.chip');
        const hiddenInputId = group.getAttribute('aria-labelledby').replace('label-', '');
        const hiddenInput = document.getElementById(hiddenInputId);
        const heading = document.getElementById(group.getAttribute('aria-labelledby'));
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => {
                    c.classList.remove('selected');
                    c.setAttribute('aria-checked', 'false');
                });
                chip.classList.add('selected');
                chip.setAttribute('aria-checked', 'true');
                hiddenInput.value = chip.dataset.value;
                const valueText = chip.textContent;
                const headingText = heading.textContent.split('(')[0].trim();
                triggerHaptic();
                announce(`${headingText}: ${valueText}`);
                heading.focus();
                calculateRounds();
            });
        });
    });
}

settingsToggle.addEventListener('click', () => {
    settingsModal.classList.add('active');
    settingsModal.setAttribute('aria-hidden', 'false');
});

closeSettings.addEventListener('click', () => {
    settingsModal.classList.remove('active');
    settingsModal.setAttribute('aria-hidden', 'true');
});

languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    updateLanguage();
});

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

updateLanguage();
setupChips();
// PWA Install Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('PWA prompt ready');
});

// SERVICE WORKER REGISTRATION
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('PWA Service Worker registered'))
            .catch(err => console.log('PWA Service Worker failed', err));
    });
}

