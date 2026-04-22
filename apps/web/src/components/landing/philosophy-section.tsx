"use client";

import { motion } from "framer-motion";

const YAMAS = [
  {
    sanskrit: "अहिंसा",
    romanized: "Ahimsa",
    title: "Nonviolence",
    description:
      "That violent expression is making your face look ugly. Let's choose kindness instead. It's definitely a cuter look.",
  },
  {
    sanskrit: "सत्या",
    romanized: "Satya",
    title: "Truth",
    description:
      "You won't have to stress out to remember the details of your lies if you simply stick to the truth.",
  },
  {
    sanskrit: "आस्तेया",
    romanized: "Asteya",
    title: "Non-stealing",
    description:
      "If you get caught stealing, your face is going to frown and crack. Better not to do it.",
  },
  {
    sanskrit: "ब्रह्मचर्य",
    romanized: "Brahmacharya",
    title: "Moderation",
    description:
      "Sex is not bad, but if you're going to ruin your peace of mind by being obsessive, it's gonna cause anxiety, depression, addiction, harming cortisol. Eats collagen, remember?",
  },
  {
    sanskrit: "अपरिग्रह",
    romanized: "Aparigraha",
    title: "Non-possessiveness",
    description:
      "Stick to what is materially necessary. That heavy baggage and possessive attitude is not a cute look on your face.",
  },
];

const NIYAMAS = [
  {
    sanskrit: "शौच",
    romanized: "Shaucha",
    title: "Cleanliness",
    description:
      "You'll obviously have to wash your face. But maintaining cleanliness in face, body, mind and around shall keep you free from lazy, lustful thoughts.",
  },
  {
    sanskrit: "संतोष",
    romanized: "Santosha",
    title: "Happiness",
    description:
      "You gotta smile, babe. Keeps the cheeks naturally lifted and corners of the mouth free from drooping.",
  },
  {
    sanskrit: "तपस",
    romanized: "Tapas",
    title: "Discipline",
    description:
      "Keep purifying that beautiful body and 5 senses. Constantly. Consistency is key!!",
  },
  {
    sanskrit: "स्वाध्याय",
    romanized: "Svadhyaya",
    title: "Self study",
    description:
      "Only through self study and staying informed can you stay away from falling back into the toxic pattern of catastrophizing the face.",
  },
  {
    sanskrit: "ईश्वर प्रणिधाना",
    romanized: "Ishvara Pranidhana",
    title: "Surrender",
    description:
      "Surrender to the supreme source babe and become the vehicle to imbibe all the qualities of the godly glow. CHANT OM.",
  },
];

const LIMBS = [
  {
    number: 3,
    sanskrit: "आसन",
    romanized: "Asana",
    title: "Posture",
    description:
      "You will obviously have to focus on the rest of the body and establish it in a perfect posture. Open that chest tension, release knots in the body. Spot reduction is obviously a myth.",
  },
  {
    number: 4,
    sanskrit: "प्राणायामा",
    romanized: "Pranayama",
    title: "Breath control",
    description:
      "The best lymphatic drainage is your breath, doll. And the best stress buster too. All that cortisol is not doing any good to your collagen. Simple words: STOP stressing out and being ugly.",
  },
  {
    number: 5,
    sanskrit: "प्रत्याहारा",
    romanized: "Pratyahara",
    title: "Sensory withdrawal",
    description:
      "Let go of the concept of self, and withdraw from all your senses babe. You'll see the truth of the chitta. That clarity shall reflect on your face.",
  },
  {
    number: 6,
    sanskrit: "धारणा",
    romanized: "Dharana",
    title: "Concentration",
    description:
      "Trataka Kriya (candle light gazing) is the best modality for dharana babe. Trains your face to not crack in any stressful situation.",
  },
  {
    number: 7,
    sanskrit: "ध्यान",
    romanized: "Dhyana",
    title: "Meditation",
    description:
      "That continuous flow of concentration towards a single point is for sure going to make your face look like the goddess that you are!",
  },
  {
    number: 8,
    sanskrit: "समाधि",
    romanized: "Samadhi",
    title: "Integration",
    description:
      "What if you enter this state of zen that nothing on the outside can affect your inside? Don't you think that gorgeous silence would reflect on your face like the epitome of BEAUTY!!!",
  },
];

export function PhilosophySection() {
  return (
    <section className="aura-bg relative pt-8 pb-32 px-6 section-warm z-10">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/3.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-6xl mx-auto space-y-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
            Philosophy
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-[3.5rem] font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The 8 Limbs of Mukha Mudra
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
            Patanjali's Ashtanga Yoga, reimagined for the face and breath.
            Ancient framework, Gen-Z execution.
          </p>
        </motion.div>

        {/* ── Yama ── */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-baseline gap-3"
          >
            <span className="text-xs font-mono text-muted-foreground/40">
              01
            </span>
            <div>
              <h3
                className="text-2xl font-light"
                style={{ fontFamily: "var(--font-display)" }}
              >
                यमा: Yama
              </h3>
              <p className="text-xs uppercase tracking-[0.2em] text-primary mt-1">
                The 5 restraints
              </p>
            </div>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {YAMAS.map((item, i) => (
              <motion.div
                key={item.romanized}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="void-card p-5 space-y-2"
              >
                <p
                  className="text-lg"
                  style={{ fontFamily: "var(--font-devanagari)" }}
                >
                  {item.sanskrit}
                </p>
                <p className="text-xs uppercase tracking-[0.15em] text-primary">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Niyama ── */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-baseline gap-3"
          >
            <span className="text-xs font-mono text-muted-foreground/40">
              02
            </span>
            <div>
              <h3
                className="text-2xl font-light"
                style={{ fontFamily: "var(--font-display)" }}
              >
                नियमा: Niyama
              </h3>
              <p className="text-xs uppercase tracking-[0.2em] text-primary mt-1">
                The 5 observances
              </p>
            </div>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {NIYAMAS.map((item, i) => (
              <motion.div
                key={item.romanized}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="void-card p-5 space-y-2"
              >
                <p
                  className="text-lg"
                  style={{ fontFamily: "var(--font-devanagari)" }}
                >
                  {item.sanskrit}
                </p>
                <p className="text-xs uppercase tracking-[0.15em] text-primary">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Limbs 3–8 ── */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-baseline gap-3"
          >
            <span className="text-xs font-mono text-muted-foreground/40">
              03–08
            </span>
            <div>
              <h3
                className="text-2xl font-light"
                style={{ fontFamily: "var(--font-display)" }}
              >
                The Practice
              </h3>
              <p className="text-xs uppercase tracking-[0.2em] text-primary mt-1">
                Asana through Samadhi
              </p>
            </div>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {LIMBS.map((limb, i) => (
              <motion.div
                key={limb.romanized}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="void-card p-6 space-y-3"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground/40 font-mono">
                    {String(limb.number).padStart(2, "0")}
                  </span>
                  <p
                    className="text-lg"
                    style={{ fontFamily: "var(--font-devanagari)" }}
                  >
                    {limb.sanskrit}
                  </p>
                </div>
                <p className="text-xs uppercase tracking-[0.15em] text-primary">
                  {limb.romanized}: {limb.title}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {limb.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
