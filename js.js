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
        alertSettings: 'Please check your settings. Work interval must be greater than zero.',
        voicePrepare: 'Prepare yourself. Starting in 5 seconds.',
        voice10Sec: '10 seconds remaining.',
        voiceWorkStart: (round) => `Round ${round}. Work hard!`,
        voiceRestStart: (sec) => `Work finished. Rest for ${sec} seconds.`,
        voiceNextRound: (round) => `Round ${round}. Go!`,
        voicePaused: 'Workout paused.',
        voiceReset: 'Workout reset.',
        voiceFinished: 'Congratulations! Workout complete.',
        wakeLockNotSupported: 'Wake Lock not supported. Keep your screen on manually.',
        wakeLockActive: 'Screen will stay on during workout.'
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
        alertSettings: 'يرجى التحقق من الإعدادات. يجب أن يكون وقت الجولة أكبر من صفر.',
        voicePrepare: 'استعد. سنبدأ بعد 5 ثوانٍ.',
        voice10Sec: 'بقي 10 ثوانٍ.',
        voiceWorkStart: (round) => `الجولة ${round}. ابدأ التمرين!`,
        voiceRestStart: (sec) => `انتهت الجولة. استرح لمدة ${sec} ثانية.`,
        voiceNextRound: (round) => `الجولة ${round}. انطلق!`,
        voicePaused: 'تم إيقاف التمرين مؤقتاً.',
        voiceReset: 'تمت إعادة ضبط التمرين.',
        voiceFinished: 'تهانينا! اكتمل التمرين.',
        wakeLockNotSupported: 'خاصية منع انطفاء الشاشة غير مدعومة. يرجى إبقاء الشاشة مفعلة يدوياً.',
        wakeLockActive: 'ستبقى الشاشة مفعلة طوال فترة التمرين.'
    }
};

let currentLanguage = 'en';

// DOM Elements
const settingsModal = document.getElementById('settings-modal');
const settingsToggle = document.getElementById('settings-toggle');
const closeSettings = document.getElementById('close-settings');
const settingsTitle = document.getElementById('settings-title');

const languageSelect = document.getElementById('language-select');
const appTitle = document.getElementById('app-title');
const appDesc = document.getElementById('app-description');
const settingsHeading = document.getElementById('settings-heading');
const totalTimeLabel = document.querySelector('label[for="total-time"]');
const workIntervalLabel = document.querySelector('label[for="work-interval"]');
const restIntervalLabel = document.querySelector('label[for="rest-interval"]');
const roundsSummary = document.getElementById('rounds-summary');

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
let currentPhase = 'Ready'; // Ready, Prep, Work, Rest, Finished
let currentRound = 0;
let totalRounds = 0;
let timerInterval = null;
let isPaused = false;
let voiceUnlocked = false;
let wakeLock = null;

// Timing State
let startTime = 0;
let phaseDuration = 0;
let lastSpokenSecond = -1;

// --- UTILS ---

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
            console.log('Wake Lock is active');
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release().then(() => {
            wakeLock = null;
            console.log('Wake Lock released');
        });
    }
}

// --- LOGIC ---

// Modal Logic
settingsToggle.addEventListener('click', () => {
    settingsModal.classList.add('active');
    settingsModal.setAttribute('aria-hidden', 'false');
});

closeSettings.addEventListener('click', () => {
    settingsModal.classList.remove('active');
    settingsModal.setAttribute('aria-hidden', 'true');
});

// Language Management
function updateLanguage() {
    const lang = translations[currentLanguage];
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = lang.dir;

    appTitle.textContent = lang.appTitle;
    appDesc.textContent = lang.appDesc;
    settingsTitle.textContent = lang.settingsTitle;
    settingsHeading.textContent = lang.settingsHeading;
    totalTimeLabel.textContent = lang.totalTime;
    workIntervalLabel.textContent = lang.workInterval;
    restIntervalLabel.textContent = lang.restInterval;
    startBtn.textContent = lang.startBtn;
    pauseBtn.textContent = lang.pauseBtn;
    resetBtn.textContent = lang.resetBtn;
    
    settingsToggle.setAttribute('aria-label', currentLanguage === 'ar' ? 'الإعدادات' : 'Settings');
    closeSettings.setAttribute('aria-label', currentLanguage === 'ar' ? 'إغلاق الإعدادات' : 'Close Settings');
    
    calculateRounds();
    updateDisplay();
}

languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    updateLanguage();
});

function calculateRounds() {
    const totalMinutes = getSafeNumber(totalTimeInput);
    const workSeconds = getSafeNumber(workIntervalInput);
    const restSeconds = getSafeNumber(restIntervalInput);

    if (workSeconds > 0) {
        const totalWorkoutSeconds = totalMinutes * 60;
        const cycleSeconds = workSeconds + restSeconds;
        totalRounds = cycleSeconds > 0 ? Math.floor(totalWorkoutSeconds / cycleSeconds) : 0;
        
        // Final sanity check
        if (totalRounds < 1 && totalMinutes > 0) totalRounds = 1;

        const roundsCountSpan = document.getElementById('rounds-count');
        if (roundsCountSpan) {
            roundsCountSpan.textContent = totalRounds;
        }
    } else {
        totalRounds = 0;
        const roundsCountSpan = document.getElementById('rounds-count');
        if (roundsCountSpan) roundsCountSpan.textContent = '0';
    }
}

[totalTimeInput, workIntervalInput, restIntervalInput].forEach(input => {
    input.addEventListener('input', calculateRounds);
});

// Voice Announcements
function speak(text) {
    if (!text) return;
    
    // Cancel any ongoing speech to prioritize new instructions
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    synth.speak(utterance);
    
    // For Screen Readers
    announcementRegion.textContent = text;
}

// Timer Formatting
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

    // Visual styles
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
        currentIntervalSeconds = remaining;
        
        // Precision checks for voice alerts
        if (currentPhase === 'Work' && currentIntervalSeconds === 10 && lastSpokenSecond !== 10) {
            speak(translations[currentLanguage].voice10Sec);
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

    // CRITICAL: Mobile Voice Unlock & Wake Lock
    if (!voiceUnlocked) {
        speak(""); // Empty utterance to unlock channel
        voiceUnlocked = true;
    }
    requestWakeLock();

    if (timerInterval) return;

    if (!isPaused) {
        calculateRounds(); 
        const workSec = getSafeNumber(workIntervalInput);
        if (workSec <= 0) {
            speak(lang.alertSettings);
            alert(lang.alertSettings);
            return;
        }
        
        currentRound = 1;
        currentPhase = 'Prepare';
        phaseDuration = 5;
        startTime = Date.now();
        currentIntervalSeconds = phaseDuration;
        lastSpokenSecond = -1;
        speak(lang.voicePrepare);
    } else {
        // Resuming from pause
        startTime = Date.now() - ((phaseDuration - currentIntervalSeconds) * 1000);
    }

    isPaused = false;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    
    // Using high-frequency interval for smooth UI and precision
    timerInterval = setInterval(tick, 100);
    updateDisplay();
}

function handlePhaseTransition() {
    const lang = translations[currentLanguage];
    lastSpokenSecond = -1;
    startTime = Date.now();

    if (currentPhase === 'Prepare') {
        currentPhase = 'Work';
        phaseDuration = getSafeNumber(workIntervalInput);
        speak(lang.voiceWorkStart(currentRound));
    } 
    else if (currentPhase === 'Work') {
        if (currentRound < totalRounds) {
            currentPhase = 'Rest';
            phaseDuration = getSafeNumber(restIntervalInput);
            speak(lang.voiceRestStart(phaseDuration));
        } else {
            finishWorkout();
        }
    } 
    else if (currentPhase === 'Rest') {
        currentRound++;
        currentPhase = 'Work';
        phaseDuration = getSafeNumber(workIntervalInput);
        speak(lang.voiceNextRound(currentRound));
    }
    
    currentIntervalSeconds = phaseDuration;
}

function pauseTimer() {
    const lang = translations[currentLanguage];
    clearInterval(timerInterval);
    timerInterval = null;
    isPaused = true;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    speak(lang.voicePaused);
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
    lastSpokenSecond = -1;
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    
    updateDisplay();
    speak(lang.voiceReset);
    releaseWakeLock();
}

function finishWorkout() {
    const lang = translations[currentLanguage];
    clearInterval(timerInterval);
    timerInterval = null;
    currentPhase = 'Finished';
    currentIntervalSeconds = 0;
    speak(lang.voiceFinished);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    releaseWakeLock();
}

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// Initialize
updateLanguage();
