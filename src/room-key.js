/**
 * Random room-key generator. Produces human-readable keys of the form
 * `title-adjective-noun` — silly rabbit names with a rabbit theme.
 */

const TITLES = [
  'sir', 'lord', 'lady', 'dame', 'duke', 'baron', 'count', 'earl', 'prince',
  'princess', 'king', 'queen', 'captain', 'admiral', 'general', 'sergeant',
  'chief', 'boss', 'doctor', 'professor', 'mayor', 'judge', 'commander',
  'reverend', 'mister', 'madam', 'sultan', 'tsar', 'pope', 'wizard', 'knight',
  'squire', 'jester', 'bard', 'ranger', 'scout', 'agent', 'detective',
  'inspector', 'comrade',
]

const ADJECTIVES = [
  'fluffy', 'floppy', 'hoppy', 'fuzzy', 'snuggly', 'wiggly', 'bouncy',
  'zippy', 'sneaky', 'twitchy', 'perky', 'peppy', 'sassy', 'silly',
  'goofy', 'wacky', 'zany', 'bubbly', 'giggly', 'spunky', 'frisky',
  'feisty', 'springy', 'cuddly', 'chubby', 'plump', 'pretty', 'sweet',
  'jolly', 'merry', 'cozy', 'dreamy', 'sleepy', 'dainty', 'tiny',
  'fancy', 'munchy', 'crunchy', 'grumpy', 'quirky', 'chirpy', 'cheeky',
  'saucy', 'corny', 'nutty', 'loony', 'dorky', 'stumpy', 'boopy',
  'toasty', 'plushy', 'dashing', 'posh', 'regal', 'noble', 'velvet',
  'moonlit', 'woolly',
]

const NOUNS = [
  'bunny', 'hare', 'rabbit', 'cottontail', 'jackrabbit', 'lop', 'angora', 'rex',
  'flemish', 'harlequin', 'floof', 'bun', 'bunbun', 'thumper', 'hopper',
  'nibbler', 'binky', 'zoomie', 'whisker', 'paw', 'tail', 'fluff', 'dewlap',
  'scut', 'warren', 'burrow', 'hutch', 'meadow', 'carrot', 'clover', 'lettuce',
  'parsley', 'dandelion', 'hay', 'cabbage', 'radish', 'turnip', 'basil', 'mint',
  'thyme', 'cilantro', 'chicory', 'timothy', 'alfalfa', 'oat', 'pellet',
  'raisin', 'banana', 'kit', 'doe', 'buck', 'roger', 'peter', 'hazel', 'fiver',
  'nugget', 'loaf', 'biscuit', 'muffin', 'potato', 'dumpling', 'pudding',
  'cupcake', 'marshmallow', 'mochi', 'noodle', 'flop', 'hop', 'leap', 'wiggle',
  'pounce', 'twitch', 'sniffle', 'chomper', 'snoot', 'snout', 'pancake',
  'toast', 'pickle', 'button', 'snuggle', 'velveteen', 'tuft', 'puff', 'pompom',
  'boop', 'zoom', 'blep', 'mlem', 'cookie', 'donut', 'bagel', 'scone',
  'pretzel', 'peanut', 'acorn', 'pepper', 'pea', 'crumpet',
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
 * @returns {string} a random room key like "sir-floppy-bunbun"
 */
export function generateKey() {
  return `${pick(TITLES)}-${pick(ADJECTIVES)}-${pick(NOUNS)}`
}

/**
 * @param {string} key
 * @returns {boolean}
 */
export function isValidKey(key) {
  return /^[a-z]+-[a-z]+-[a-z]+$/.test(key)
}
