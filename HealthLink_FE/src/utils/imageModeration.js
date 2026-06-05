import * as nsfwjs from 'nsfwjs';
import '@tensorflow/tfjs';

let modelPromise = null;

const loadModel = () => {
    if (!modelPromise) {
        modelPromise = nsfwjs.load();
    }

    return modelPromise;
};

const createImageFromFile = (file) => {
    return new Promise((resolve, reject) => {
        const imageUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(imageUrl);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error('Cannot read image file.'));
        };

        img.src = imageUrl;
    });
};

export const isImageFile = (file) => {
    return file?.type?.startsWith('image/');
};

export const moderateImageFile = async (file) => {
    if (!isImageFile(file)) {
        return {
            safe: true,
            skipped: true,
            reason: 'Not an image file',
        };
    }

    const model = await loadModel();
    const img = await createImageFromFile(file);
    const predictions = await model.classify(img);

    const scores = predictions.reduce((result, item) => {
        result[item.className] = item.probability;
        return result;
    }, {});

    const pornScore = scores.Porn || 0;
    const hentaiScore = scores.Hentai || 0;
    const sexyScore = scores.Sexy || 0;

    const isClearlyUnsafe = pornScore >= 0.8 || hentaiScore >= 0.8;
    const isSuspicious = sexyScore >= 0.85;

    if (isClearlyUnsafe) {
        return {
            safe: false,
            warning: false,
            reason: 'This image may contain explicit sensitive content.',
            scores,
        };
    }

    if (isSuspicious) {
        return {
            safe: true,
            warning: true,
            reason: 'This image may be sensitive. Please make sure it is a valid medical document.',
            scores,
        };
    }

    return {
        safe: true,
        warning: false,
        scores,
    };
};