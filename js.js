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

// Timing State
let startTime = 0;
let phaseDuration = 0;
let lastSpokenSecond = -1;

// --- AUDIO SYNC & MEDIA SESSION ---
const audioNode = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
audioNode.loop = true;

function setupMediaSession() {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: 'AudioAthlete',
            artist: translations[currentLanguage].appTitle,
            album: translations[currentLanguage].appDesc
        });
        navigator.mediaSession.setActionHandler('play', startTimer);
        navigator.mediaSession.setActionHandler('pause', pauseTimer);
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
    let num = parseFloat(val);
    return isNaN(num) ? 0 : num;
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

// --- ANNOUNCEMENT LOGIC (TalkBack Friendly) ---

function announce(text) {
    if (!text) return;
    
    // 1. ARIA-LIVE for TalkBack (Highest Priority)
    announcementRegion.textContent = '';
    setTimeout(() => {
        announcementRegion.textContent = text;
    }, 50);

    // 2. Web Speech API (Secondary/Backup)
    if (!synth.speaking) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
        utterance.rate = 1.0;
        synth.speak(utterance);
    }
}

// --- TIMER LOGIC ---

function calculateRounds() {
    const totalMinutes = getSafeNumber(totalTimeInput);
    const workSeconds = getSafeNumber(workIntervalInput);
    const restSeconds = getSafeNumber(restIntervalInput);

    if (workSeconds > 0) {
        const totalWorkoutSeconds = totalMinutes * 60;
        const cycleSeconds = workSeconds + restSeconds;
        totalRounds = cycleSeconds > 0 ? Math.floor(totalWorkoutSeconds / cycleSeconds) : 0;
        if (totalRounds < 1 && totalMinutes > 0) totalRounds = 1;

        const roundsCountSpan = document.getElementById('rounds-count');
        if (roundsCountSpan) roundsCountSpan.textContent = totalRounds;
    } else {
        totalRounds = 0;
        const roundsCountSpan = document.getElementById('rounds-count');
        if (roundsCountSpan) roundsCountSpan.textContent = '0';
    }
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
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
    const elapsed = Math.floor((now - startTime) / 1000);
    const remaining = phaseDuration - elapsed;

    if (remaining !== currentIntervalSeconds) {
        currentIntervalSeconds = Math.max(0, remaining);
        
        if (currentPhase === 'Work' && currentIntervalSeconds === 10 && lastSpokenSecond !== 10) {
            announce(translations[currentLanguage].voice10Sec);
            lastSpokenSecond = 10;
        }

        if (currentIntervalSeconds <= 0) {
            handlePhaseTransition();
        }
        
        updateDisplay();
    }
}

function startTimer() {
    const lang = translations[currentLanguage];

    // Recalculate and setup background
    calculateRounds();
    setupMediaSession();
    audioNode.play().catch(() => {});
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
        startTime = Date.now();
        currentIntervalSeconds = phaseDuration;
        lastSpokenSecond = -1;
        announce(lang.voicePrepare);
        // Small hidden toast for Wake Lock
        console.log(lang.wakeLockActive);
    } else {
        startTime = Date.now() - ((phaseDuration - currentIntervalSeconds) * 1000);
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
    startTime = Date.now();

    setTimeout(() => {
        if (currentPhase === 'Prepare') {
            currentPhase = 'Work';
            phaseDuration = getSafeNumber(workIntervalInput);
            announce(lang.voiceWorkStart(currentRound));
        } 
        else if (currentPhase === 'Work') {
            if (currentRound < totalRounds) {
                currentPhase = 'Rest';
                phaseDuration = getSafeNumber(restIntervalInput);
                announce(lang.voiceRestStart(phaseDuration));
            } else {
                finishWorkout();
            }
        } 
        else if (currentPhase === 'Rest') {
            currentRound++;
            currentPhase = 'Work';
            phaseDuration = getSafeNumber(workIntervalInput);
            announce(lang.voiceNextRound(currentRound));
        }
        currentIntervalSeconds = phaseDuration;
        updateDisplay();
    }, 150);
}

function pauseTimer() {
    const lang = translations[currentLanguage];
    clearInterval(timerInterval);
    timerInterval = null;
    isPaused = true;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    announce(lang.voicePaused);
    audioNode.pause();
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
    audioNode.pause();
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
    audioNode.pause();
    releaseWakeLock();
}

// UI Setup & Translations
function updateLanguage() {
    const lang = translations[currentLanguage];
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = lang.dir;
    
    document.getElementById('app-title').textContent = lang.appTitle;
    document.getElementById('app-description').textContent = lang.appDesc;
    document.getElementById('settings-title').textContent = lang.settingsTitle;
    document.getElementById('settings-heading').textContent = lang.settingsHeading;
    document.querySelector('label[for="total-time"]').textContent = lang.totalTime;
    document.querySelector('label[for="work-interval"]').textContent = lang.workInterval;
    document.querySelector('label[for="rest-interval"]').textContent = lang.restInterval;
    
    startBtn.textContent = lang.startBtn;
    pauseBtn.textContent = lang.pauseBtn;
    resetBtn.textContent = lang.resetBtn;
    
    settingsToggle.setAttribute('aria-label', lang.settingsLabel);
    closeSettings.setAttribute('aria-label', lang.closeSettingsLabel);
    
    calculateRounds();
    updateDisplay();
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

[totalTimeInput, workIntervalInput, restIntervalInput].forEach(input => {
    input.addEventListener('input', calculateRounds);
});

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// Initial Load
updateLanguage();
