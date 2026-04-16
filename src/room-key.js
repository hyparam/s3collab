/**
 * Random room-key generator. Produces human-readable keys of the form
 * `adj-adj-noun`. The wordlists are small but give > 2 million combinations,
 * which is plenty for demo collaboration rooms.
 */

const ADJECTIVES = [
  'amber', 'azure', 'brave', 'brisk', 'calm', 'clever', 'cosmic', 'crisp',
  'dapper', 'daring', 'dazzling', 'dizzy', 'dreamy', 'eager', 'eerie', 'electric',
  'elegant', 'emerald', 'fancy', 'fearless', 'feisty', 'fierce', 'fluffy', 'fluent',
  'frosty', 'funky', 'gentle', 'giddy', 'glad', 'gleaming', 'glossy', 'golden',
  'grand', 'happy', 'hazy', 'honest', 'humble', 'icy', 'ideal', 'jazzy',
  'jolly', 'jumpy', 'keen', 'kind', 'lively', 'lofty', 'lonely', 'lucky',
  'lunar', 'magenta', 'merry', 'mighty', 'misty', 'moonlit', 'mystic', 'nimble',
  'noble', 'peppy', 'plucky', 'polite', 'proud', 'quick', 'quiet', 'quirky',
  'radiant', 'rapid', 'rare', 'royal', 'rustic', 'sandy', 'savvy', 'scarlet',
  'serene', 'shiny', 'silent', 'silver', 'silky', 'sleepy', 'slick', 'smart',
  'smooth', 'snappy', 'snowy', 'sparkly', 'speedy', 'spicy', 'spry', 'stellar',
  'stormy', 'sunny', 'swift', 'teal', 'tidy', 'tiny', 'tranquil', 'trusty',
  'twinkly', 'vivid', 'warm', 'wild', 'witty', 'woolly', 'zany', 'zesty',
]

const NOUNS = [
  'apple', 'arrow', 'badger', 'banjo', 'beacon', 'bison', 'bloom', 'boulder',
  'branch', 'breeze', 'brook', 'canyon', 'cedar', 'cherry', 'cloud', 'clover',
  'comet', 'cobra', 'corner', 'crane', 'crayon', 'dagger', 'daisy', 'dolphin',
  'dragon', 'dune', 'eagle', 'ember', 'falcon', 'fern', 'ferret', 'fiddle',
  'firefly', 'fjord', 'forest', 'fox', 'galaxy', 'garnet', 'gecko', 'glade',
  'glacier', 'goblin', 'gopher', 'griffin', 'hammer', 'harbor', 'hawk', 'hedge',
  'helix', 'hornet', 'iris', 'island', 'jaguar', 'jasper', 'jester', 'kettle',
  'kingdom', 'koala', 'lagoon', 'lantern', 'lark', 'lemur', 'lichen', 'lotus',
  'lynx', 'maple', 'marsh', 'meadow', 'medley', 'meteor', 'moth', 'mountain',
  'muffin', 'nebula', 'needle', 'ocelot', 'oracle', 'orchid', 'otter', 'owl',
  'panda', 'pebble', 'penguin', 'phoenix', 'pigeon', 'pine', 'planet', 'plum',
  'puffin', 'quartz', 'quail', 'raccoon', 'raven', 'ribbon', 'river', 'robin',
  'saddle', 'sapling', 'seal', 'sparrow', 'sprout', 'stone', 'summit', 'tiger',
  'thistle', 'tulip', 'turtle', 'valley', 'violet', 'walrus', 'willow', 'wolf',
]

/**
 * @param {string[]} list
 * @returns {string}
 */
function pick(list) {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return list[bytes[0] % list.length]
}

/**
 * @returns {string} a random room key like "moonlit-dazzling-lark"
 */
export function generateKey() {
  return `${pick(ADJECTIVES)}-${pick(ADJECTIVES)}-${pick(NOUNS)}`
}

/**
 * @param {string} key
 * @returns {boolean}
 */
export function isValidKey(key) {
  return /^[a-z]+-[a-z]+-[a-z]+$/.test(key)
}
