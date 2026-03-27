import { normalize, classifyItem } from '@otaku-calendar/core';
export async function extractAndClassify(items) {
    if (!items || items.length === 0) {
        return [];
    }
    const normalized = items.map(item => normalize(item));
    const classified = normalized.map(item => {
        const classification = classifyItem(item);
        return {
            ...item,
            confidence: classification.confidence,
            type: classification.type,
            mediaType: classification.mediaType,
        };
    });
    return classified;
}
