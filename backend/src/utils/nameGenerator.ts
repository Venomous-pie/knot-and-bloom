export const generateRandomName = (): string => {
    const adjectives = ['Happy', 'Sunny', 'Creative', 'Clever', 'Bright', 'Swift', 'Gentle', 'Cosy', 'Lovely'];
    const nouns = ['Weaver', 'Crafter', 'Artist', 'Maker', 'Designer', 'Artisan', 'Creator', 'Knitter', 'Bloomer'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 1000);
    return `${randomAdjective} ${randomNoun} ${randomNumber}`;
};
