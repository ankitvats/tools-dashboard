import type { Quote, Stretch } from './types'

export const STRETCHES: Stretch[] = [
  {
    id: 'neck',
    name: 'Neck Stretch',
    icon: '🧘',
    durationSec: 30,
    instructions:
      'Slowly tilt your head toward each shoulder, holding for 10 seconds per side. Keep shoulders relaxed.',
  },
  {
    id: 'shoulders',
    name: 'Shoulder Rolls',
    icon: '💪',
    durationSec: 30,
    instructions: 'Roll both shoulders backward 10 times, then forward 10 times. Breathe deeply.',
  },
  {
    id: 'wrist',
    name: 'Wrist Stretch',
    icon: '✋',
    durationSec: 25,
    instructions:
      'Extend one arm, palm up, gently pull fingers back with the other hand. Hold 12s each side.',
  },
  {
    id: 'back',
    name: 'Back Stretch',
    icon: '🙆',
    durationSec: 40,
    instructions:
      'Sit tall, twist gently to one side holding the chair, hold 15s, then switch. Lengthen your spine.',
  },
  {
    id: 'eyes',
    name: 'Eye Relaxation',
    icon: '👁️',
    durationSec: 20,
    instructions:
      '20-20-20 rule: look at something 20 feet away for 20 seconds. Blink slowly to rehydrate eyes.',
  },
  {
    id: 'legs',
    name: 'Leg & Hip Opener',
    icon: '🦵',
    durationSec: 35,
    instructions: 'Stand, cross one ankle over the opposite knee, hinge forward gently. Hold 15s each.',
  },
]

export const QUOTES: Quote[] = [
  { id: 'q1', text: 'The secret of getting ahead is getting started.', author: 'Mark Twain', category: 'Motivation' },
  { id: 'q2', text: 'Focus is a matter of deciding what things you’re not going to do.', author: 'John Carmack', category: 'Focus' },
  { id: 'q3', text: 'Well done is better than well said.', author: 'Benjamin Franklin', category: 'Discipline' },
  { id: 'q4', text: 'You don’t have to be great to start, but you have to start to be great.', author: 'Zig Ziglar', category: 'Motivation' },
  { id: 'q5', text: 'Take care of your body. It’s the only place you have to live.', author: 'Jim Rohn', category: 'Health' },
  { id: 'q6', text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci', category: 'Mindset' },
  { id: 'q7', text: 'It always seems impossible until it’s done.', author: 'Nelson Mandela', category: 'Perseverance' },
  { id: 'q8', text: 'Done is better than perfect.', author: 'Sheryl Sandberg', category: 'Productivity' },
  { id: 'q9', text: 'What gets measured gets managed.', author: 'Peter Drucker', category: 'Productivity' },
  { id: 'q10', text: 'Almost everything will work again if you unplug it for a few minutes — including you.', author: 'Anne Lamott', category: 'Rest' },
  { id: 'q11', text: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney', category: 'Action' },
  { id: 'q12', text: 'Your calm mind is the ultimate weapon against your challenges.', author: 'Bryant McGill', category: 'Mindset' },
  { id: 'q13', text: 'Small daily improvements over time lead to stunning results.', author: 'Robin Sharma', category: 'Growth' },
  { id: 'q14', text: 'Energy and persistence conquer all things.', author: 'Benjamin Franklin', category: 'Perseverance' },
  { id: 'q15', text: 'Rest when you’re weary. Refresh and renew yourself.', author: 'Ralph Marston', category: 'Health' },
]

export function quoteForDay(dateKey: string): Quote {
  // Deterministic pick per day so the "daily" quote is stable.
  let hash = 0
  for (let i = 0; i < dateKey.length; i++) hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0
  return QUOTES[hash % QUOTES.length]
}
