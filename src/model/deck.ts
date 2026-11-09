import fp from 'lodash/fp'
import type {Shuffler} from '../utils/random_utils'

export const colors = ['BLUE', 'GREEN', 'RED', 'YELLOW'] as const
export type Color = typeof colors[number]

export type Type = 'NUMBERED' | 'SKIP' | 'REVERSE' | 'DRAW TWO' | 'WILD' | 'WILD DRAW FOUR'
export type TypedCard<T extends Type> = T extends 'NUMBERED' ? { type: T, color: Color, number: number } : T extends 'WILD' | 'WILD DRAW FOUR' ? { type: T } : { type: T, color: Color }
export type NumberedCard = TypedCard<'NUMBERED'>
export type ColouredCard = TypedCard<'NUMBERED' | 'SKIP' | 'REVERSE' | 'DRAW TWO'>
export type WildCard = TypedCard<'WILD' | 'WILD DRAW FOUR'>
export type Card = NumberedCard | ColouredCard | WildCard
export type CardMemento = Record<string, string | number>

export interface Deck {
    readonly length: number;
    readonly cards: ReadonlyArray<Card>;
}

export const createDeck = (cards: ReadonlyArray<Card> = []): Deck => ({
    length: cards.length,
    cards: Object.freeze([...cards])
});

export const deal = (deck: Deck): { readonly card: Card | undefined; readonly deck: Deck } => {
    const [card, ...remaining] = deck.cards;
    return {
        card,
        deck: createDeck(remaining)
    };
};

export const peek = (deck: Deck): Card | undefined => deck.cards[0];
export const top = (deck: Deck): Card | undefined => deck.cards[0];

export const add = fp.curry((card: Card, deck: Deck): Deck =>
    createDeck([card, ...deck.cards])
);

export const filter = fp.curry((predicate: (card: Card) => boolean, deck: Deck): Deck =>
    createDeck(deck.cards.filter(predicate))
);

export const shuffle = fp.curry((shuffler: Shuffler<Card>, deck: Deck): Deck => {
    const copy = [...deck.cards];
    const result: unknown = shuffler(copy);
    return createDeck(Array.isArray(result) ? (result as Card[]) : copy);
});

export const toMemento = (deck: Deck): CardMemento[] =>
    deck.cards.map(c => ({ ...c }));

const validColor = (value: unknown): value is Color =>
    (colors as readonly unknown[]).includes(value);

export const cardFromMemento = (m: CardMemento): Card => {
    switch (m.type) {
        case 'NUMBERED': {
            if (!validColor(m.color) || typeof m.number !== 'number' || !Number.isInteger(m.number) || m.number < 0 || m.number > 9) {
                throw new Error('Invalid numbered card');
            }
            return { type: 'NUMBERED', color: m.color, number: m.number };
        }
        case 'SKIP':
        case 'REVERSE':
        case 'DRAW TWO': {
            if (!validColor(m.color)) {
                throw new Error('Invalid coloured card');
            }
            return { type: m.type, color: m.color };
        }
        case 'WILD':
        case 'WILD DRAW FOUR': {
            return { type: m.type };
        }
        default:
            throw new Error('Invalid card type');
    }
};

export const createDeckFromMemento = fp.flow(
    fp.map(cardFromMemento),
    createDeck
);

export const hasColor = fp.curry((color: Color, card: Card): boolean =>
    'color' in card && card.color === color
);

export const hasNumber = fp.curry((number: number, card: Card): boolean =>
    card.type === 'NUMBERED' && card.number === number
);

/**
 * Checks whether a player holds any card matching the given color.
 */
export const hasMatchingColorInHand = fp.curry((currentColor: Color, hand: ReadonlyArray<Card>): boolean =>
    fp.some(hasColor(currentColor), hand)
);

/**
 * Validates whether a card can be legally played according to official UNO rules:
 * - Regular cards match current top card by color or type/number.
 * - Wild cards can be played anytime.
 * - Wild Draw Four can ONLY be legally played if player has NO matching color cards in hand.
 */
export const canPlayCard = fp.curry((
    currentActiveColor: Color,
    topCard: Card,
    playerHand: ReadonlyArray<Card>,
    cardToPlay: Card
): boolean => {
    if (cardToPlay.type === 'WILD') return true;

    if (cardToPlay.type === 'WILD DRAW FOUR') {
        // Legally only playable if player has NO card in hand matching current active color
        return !hasMatchingColorInHand(currentActiveColor, playerHand);
    }

    if ('color' in cardToPlay && cardToPlay.color === currentActiveColor) return true;

    if (cardToPlay.type === topCard.type) {
        if (cardToPlay.type === 'NUMBERED' && topCard.type === 'NUMBERED') {
            return cardToPlay.number === topCard.number;
        }
        return true;
    }

    return false;
});

export const cardPoints = (card: Card): number => {
    if (card.type === 'NUMBERED') return card.number;
    if (card.type === 'WILD' || card.type === 'WILD DRAW FOUR') return 50;
    return 20; // SKIP, REVERSE, DRAW TWO
};

export function createInitialDeck(): Deck {
    const cardsOfColor = (color: Color): Card[] => [
        { type: 'NUMBERED', color, number: 0 } as NumberedCard,
        ...fp.flatMap(
            (n: number) => [
                { type: 'NUMBERED', color, number: n } as NumberedCard,
                { type: 'NUMBERED', color, number: n } as NumberedCard
            ],
            fp.range(1, 10)
        ),
        ...fp.flatMap(
            (type: 'SKIP' | 'REVERSE' | 'DRAW TWO') => [
                { type, color } as ColouredCard,
                { type, color } as ColouredCard
            ],
            ['SKIP', 'REVERSE', 'DRAW TWO'] as const
        )
    ];

    const wildCards = fp.flatMap(
        () => [
            { type: 'WILD' } as WildCard,
            { type: 'WILD DRAW FOUR' } as WildCard
        ],
        fp.range(0, 4)
    );

    return createDeck([...fp.flatMap(cardsOfColor, colors), ...wildCards]);
}