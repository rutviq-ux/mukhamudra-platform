const LOADER_GIF = "/loader_tools_t/loader_tool.gif";

const LOADING_LINES = [
  // ── Cortisol / collagen thread ──
  "Cortisol is not invited to this loading screen.",
  "Your collagen is safe while you wait.",
  "If you're stressed about loading times, that's cortisol eating your collagen.",
  "Cortisol? In this economy? Relax.",
  "Every second you stay calm, your collagen thanks you.",

  // ── Jaw tension callouts ──
  "Stop clenching your jaw while you wait.",
  "Your face is holding tension right now. Relax it.",
  "Relax that forehead. It's just a loading screen.",
  "Take this moment to unclench your jaw.",
  "Your jaw called. It wants you to stop grinding.",
  "Unclench. Unfurrow. Unbothered.",

  // ── Breath / pranayama ──
  "Breathe in… we're almost there, babe.",
  "Exhale. We're working on it.",
  "Manifesting faster load times through pranayama.",
  "The best loading screen is your breath, doll.",
  "Inhale patience. Exhale expectations.",

  // ── Glow up / snatched ──
  "Loading your glow up.",
  "The godly glow is compiling.",
  "Your snatched jawline will be ready shortly.",
  "Loading… but make it snatched.",
  "Buffering beauty. One moment.",

  // ── Philosophy / yamas with sass ──
  "Patience is a Niyama, babe.",
  "Ahimsa includes being patient with loading screens.",
  "Surrender to the loading screen, babe. — Ishvara Pranidhana",
  "This is your mini Savasana.",
  "Consistency over intensity. Even for loading screens.",
  "Chant OM while you wait. Or don't. We're not your mom.",

  // ── Blunt / direct humor ──
  "Your face is frowning at this screen. Stop it.",
  "Simple words: stop stressing and wait pretty.",
  "Not a pre-recorded loading screen. This is live.",
  "This pause is good for your face, actually.",
  "Spot reduction is a myth but spot relaxation isn't.",
  "Even your loading screen has a skincare routine.",
  "No AI coaches here. Just a real loading screen.",

  // ── Trataka / technique references ──
  "Treating this wait like a Trataka session.",
  "The face responds to patience like it responds to gua sha.",
  "Your lymphatic system needed this break anyway.",
  "Think of this as a micro-session for your nervous system.",

  // ── Verified facts: face & anatomy ──
  "Your face has 43 muscles. Most people only use about 20 of them.",
  "Humans can distinguish over 10,000 different facial expressions.",
  "The masseter in your jaw is the strongest muscle in your body by weight.",
  "Your face is the only place in the body where muscles attach directly to skin.",
  "Babies are born with the ability to recognize faces within minutes.",
  "The orbicularis oculi — the muscle around your eyes — is the only muscle that can reveal a genuine smile.",
  "Facial muscles are the only skeletal muscles that don't connect bone to bone.",
  "The skin on your eyelids is 0.5mm thin — the thinnest on your entire body.",

  // ── Verified facts: breathing & pranayama ──
  "You breathe about 20,000 times a day. Most of them shallow.",
  "Slow exhalation activates the vagus nerve, dropping your heart rate within seconds.",
  "Your right nostril breathing activates the sympathetic nervous system. Your left calms it.",
  "Navy SEALs use box breathing (4-4-4-4) to stay composed under fire.",
  "A single deep diaphragmatic breath can lower cortisol levels measurably.",
  "Newborns breathe exclusively through their nose for the first 4 months of life.",
  "The diaphragm is the only skeletal muscle that works 24/7 without rest.",
  "Ancient yogis measured lifespan in breaths, not years. Fewer breaths per minute = longer life.",

  // ── Verified facts: cortisol & stress ──
  "Cortisol peaks between 6-8 AM. That's why morning pranayama hits different.",
  "Chronic stress can shrink the prefrontal cortex — the brain region for decision-making.",
  "Laughter reduces cortisol by up to 39%. Smiling uses 12 muscles. Frowning uses 11.",
  "Stress can slow collagen production by up to 30%.",
  "Your body can't distinguish between a real threat and an imagined one. Cortisol fires either way.",

  // ── Verified facts: skin & collagen ──
  "Collagen makes up 75-80% of your skin's dry weight.",
  "You lose about 1% of your collagen per year after age 20.",
  "Skin cell turnover takes about 28 days. Your face is literally a new face every month.",
  "Your skin is your largest organ — about 22 square feet of it.",
  "Facial skin gets more UV exposure than any other body part over a lifetime.",

  // ── Verified facts: yoga & ancient knowledge ──
  "The word 'yoga' comes from Sanskrit 'yuj,' meaning to yoke or unite.",
  "Patanjali's Yoga Sutras are roughly 2,400 years old — and still the foundation.",
  "There are 72,000 nadis (energy channels) described in yogic anatomy. Pranayama targets the top 3.",
  "'Mudra' means seal in Sanskrit — a gesture that seals energy in the body.",
  "'Prana' doesn't just mean breath. It means life force. You're literally loading life force right now.",
  "Kumbhaka (breath retention) was considered the most powerful pranayama technique by ancient yogis.",
  "The 8 limbs of yoga were never meant to be practiced separately. They're one system.",

  // ── Verified facts: random cool ones ──
  "Astronauts' faces puff up in space because gravity isn't pulling lymphatic fluid down.",
  "Whales sleep with half their brain — one eye open. Their face literally never relaxes.",
  "Octopuses have no facial muscles at all. They express emotions through color changes.",
  "The Mona Lisa's expression uses the exact muscles Mukha Mudra trains.",
  "Cats have 32 muscles in each ear. Humans have 6. We still don't use most of them.",
  "Your facial expressions are contagious — mirror neurons fire when you see someone smile.",
  "Ancient Egyptians practiced facial massage with jade stones 5,000 years ago.",
  "The 'Om' vibration resonates at 432 Hz — the same frequency found in nature and cosmic microwave background radiation.",
] as const;

function getRandomLine() {
  return LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)];
}

export function LoadingScreen() {
  const line = getRandomLine();
  const size = 64 + Math.floor(Math.random() * 48); // 64–112px
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <img
        src={LOADER_GIF}
        alt=""
        aria-hidden="true"
        className="object-contain animate-[loader-breathe_4s_ease-in-out_infinite]"
        style={{ width: size, height: size }}
      />
      <p className="mt-6 text-muted-foreground text-sm tracking-[0.12em] font-light italic max-w-xs text-center leading-relaxed px-4">
        {line}
      </p>
    </div>
  );
}
