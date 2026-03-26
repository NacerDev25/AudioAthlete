const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');

// Folder paths
const folders = [
    path.join(__dirname, 'sounds', 'ar'),
    path.join(__dirname, 'sounds', 'en')
];

// Create folders if they don't exist
folders.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// Audio Assets to generate
const assets = [
    { text: 'ابدأ التمرين', lang: 'ar', filename: 'sounds/ar/start.mp3' },
    { text: 'انتصف الوقت', lang: 'ar', filename: 'sounds/ar/half.mp3' },
    { text: 'ثلاث ثواني متبقية', lang: 'ar', filename: 'sounds/ar/three.mp3' },
    { text: 'وقت الراحة', lang: 'ar', filename: 'sounds/ar/rest.mp3' },
    { text: 'Start workout', lang: 'en', filename: 'sounds/en/start.mp3' },
    { text: 'Halfway point', lang: 'en', filename: 'sounds/en/half.mp3' },
    { text: 'Three seconds left', lang: 'en', filename: 'sounds/en/three.mp3' },
    { text: 'Rest time', lang: 'en', filename: 'sounds/en/rest.mp3' }
];

async function generateAssets() {
    for (const asset of assets) {
        console.log(`Generating: ${asset.filename}...`);
        await new Promise((resolve) => {
            const gtts = new gTTS(asset.text, asset.lang);
            gtts.save(asset.filename, function (err) {
                if (err) {
                    console.error(`Error generating ${asset.filename}:`, err.message);
                } else {
                    console.log(`Successfully generated: ${asset.filename}`);
                }
                // Small delay between requests
                setTimeout(resolve, 1000);
            });
        });
    }
    console.log("All tasks processed.");
}

generateAssets();
