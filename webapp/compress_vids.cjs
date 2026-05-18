const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const path = require('path');
const fs = require('fs');

const vidsToCompress = ['IMG_1536.MOV', 'IMG_2087.MOV', 'IMG_2085.MOV'];
const vidsDir = path.join(__dirname, 'assets', 'vids');

async function compressVideo(filename) {
    return new Promise((resolve, reject) => {
        const inputPath = path.join(vidsDir, filename);
        const outputPath = path.join(vidsDir, filename.replace('.MOV', '.mp4'));
        
        console.log(`Compressing ${filename}...`);
        
        ffmpeg(inputPath)
            .outputOptions([
                '-vcodec libx264',
                '-crf 28', // Good compression
                '-preset faster',
                '-vf scale=-2:720' // Resize to 720p height
            ])
            .on('end', () => {
                console.log(`Finished ${filename}`);
                resolve();
            })
            .on('error', (err) => {
                console.error(`Error compressing ${filename}:`, err);
                reject(err);
            })
            .save(outputPath);
    });
}

async function main() {
    for (const vid of vidsToCompress) {
        if (fs.existsSync(path.join(vidsDir, vid))) {
            await compressVideo(vid);
        } else {
            console.log(`Skipping ${vid}, not found.`);
        }
    }
    console.log("All done.");
}

main();
