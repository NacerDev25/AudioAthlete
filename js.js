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

// --- ADVANCED AUDIO POOL (The Fix for Mobile Devices) ---

/**
 * Pre-loading all professional audio assets into memory.
 * This ensures the browser can play them instantly later.
 */
const audioPool = {
    ar: {
        start: new Audio('sounds/ar/start.mp3'),
        half: new Audio('sounds/ar/half.mp3'),
        three: new Audio('sounds/ar/three.mp3'),
        rest: new Audio('sounds/ar/rest.mp3')
    },
    en: {
        start: new Audio('sounds/en/start.mp3'),
        half: new Audio('sounds/en/half.mp3'),
        three: new Audio('sounds/en/three.mp3'),
        rest: new Audio('sounds/en/rest.mp3')
    }
};

// Silent background audio to keep process alive
const silentAudioNode = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
silentAudioNode.loop = true;

/**
 * SUPER-FIX: Extreme Audio Unlocking for Mobile
 * This version prioritizes the user gesture and handles the "Audio Channel" conflict.
 */
async function primeAudioEngine() {
    // 1. Instant speech unlock (High priority)
    if (synth) {
        synth.cancel();
        const unlock = new SpeechSynthesisUtterance("Audio active");
        unlock.volume = 0.01; 
        unlock.lang = currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
        synth.speak(unlock);
    }

    // 2. Instant MP3 unlock (Play only the START sound of current lang)
    try {
        const startSound = audioPool[currentLanguage].start;
        await startSound.play();
        startSound.pause();
        startSound.currentTime = 0;
    } catch (e) {
        console.warn("Direct MP3 unlock failed, will retry on demand", e);
    }

    // 3. Keep-alive silent loop
    try {
        await silentAudioNode.play();
    } catch (e) {}
    
    announce("System Ready"); // Voice feedback for accessibility
}

/**
 * Play notification with a small delay to avoid clashing with Speech Synthesis
 */
function playNotification(soundName) {
    const audio = audioPool[currentLanguage][soundName];
    if (!audio) return;

    // Reset and play
    audio.pause();
    audio.currentTime = 0;
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.warn(`Playback blocked for ${soundName}. Retrying...`, e);
            // Fallback: trigger speech if MP3 fails
            if (soundName === 'start') announce(translations[currentLanguage].work);
        });
    }
}

function announce(text) {
    if (!text) return;
    
    // Update ARIA region for screen readers (NVDA/TalkBack)
    announcementRegion.textContent = '';
    setTimeout(() => {
        announcementRegion.textContent = text;
    }, 50);

    // Speech Synthesis with safety delay
    if (synth) {
        setTimeout(() => {
            synth.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
            utterance.rate = 1.0;
            synth.speak(utterance);
        }, 150); // The "Magic Delay" to prevent channel clashing
    }
}

function startTimer() {
    // IMMEDIATE ACTION: Unlock audio before ANY other logic
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
        
        // Let the system breathe before the first big announcement
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

// UI Setup & Translations
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

// CHIP SELECTION LOGIC
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
                announce(`${headingText}: ${valueText}`);
                
                triggerHaptic();
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

// Initial Load
updateLanguage();
setupChips();

// SERVICE WORKER REGISTRATION
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('PWA Service Worker registered'))
            .catch(err => console.log('PWA Service Worker failed', err));
    });
}
