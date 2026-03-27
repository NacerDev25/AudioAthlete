const sharp = require('sharp');
const fs = require('fs');

async function generateIcons() {
    try {
        await sharp('icon.svg')
            .resize(192, 192)
            .png()
            .toFile('icon-192.png');
        console.log('Generated icon-192.png');

        await sharp('icon.svg')
            .resize(512, 512)
            .png()
            .toFile('icon-512.png');
        console.log('Generated icon-512.png');
    } catch (err) {
        console.error('Error generating icons:', err);
    }
}

generateIcons();
