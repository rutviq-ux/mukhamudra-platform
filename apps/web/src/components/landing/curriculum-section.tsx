"use client";

import { motion } from "framer-motion";

const STAGES = [
  {
    stage: 1,
    chakra: "Ajna",
    focus: "Foundation",
    practices:
      "Nostril awareness, basic breath counting, diaphragmatic breathing. Building the container.",
    mechanism:
      "Activates the parasympathetic nervous system via vagus nerve stimulation. Shifts the body from fight-or-flight to rest-and-digest.",
    impact:
      "Immediate cortisol reduction, better oxygen delivery to skin cells, foundation for all advanced techniques.",
  },
  {
    stage: 2,
    chakra: "Ajna",
    focus: "Rhythm",
    practices:
      "Equal ratio breathing (Sama Vritti), introduction to Ujjayi. Finding your natural pace.",
    mechanism:
      "Regulates heart rate variability (HRV) through rhythmic breathing patterns. Ujjayi creates gentle back-pressure that strengthens respiratory muscles.",
    impact:
      "Stabilised nervous system, reduced anxiety, improved sleep quality. Your face stops holding tension you didn't even know was there.",
  },
  {
    stage: 3,
    chakra: "Vishuddha",
    focus: "Extension",
    practices:
      "Extended exhale ratios, Nadi Shodhana (alternate nostril breathing). Calming the vagus nerve.",
    mechanism:
      "Extended exhale directly activates the vagus nerve, lowering heart rate and blood pressure. Nadi Shodhana balances left-right brain hemisphere activity.",
    impact:
      "Deep cortisol suppression, balanced autonomic function. The breath becomes your most powerful anti-ageing tool.",
  },
  {
    stage: 4,
    chakra: "Vishuddha",
    focus: "Retention",
    practices:
      "Kumbhaka (breath holds) introduction. Internal retention after inhale. Expanding lung capacity.",
    mechanism:
      "Breath retention increases CO₂ tolerance, triggering the Bohr effect: more efficient oxygen release from haemoglobin to tissues.",
    impact:
      "Enhanced cellular oxygenation, fibroblast activation, increased collagen synthesis. Your skin literally gets more fuel to repair itself.",
  },
  {
    stage: 5,
    chakra: "Anahata",
    focus: "Bandhas",
    practices:
      "Mula Bandha, Jalandhara Bandha integration. Energy locks that transform breath into prana.",
    mechanism:
      "Bandhas create intra-abdominal and thoracic pressure changes that redirect blood flow and stimulate the thyroid and parathyroid glands.",
    impact:
      "Thyroid modulation (metabolism + skin health), hormonal balance, prana starts moving upward through the central channel.",
  },
  {
    stage: 6,
    chakra: "Anahata",
    focus: "Advanced Pranayama",
    practices:
      "Bhastrika, Kapalabhati, Surya Bhedana. Heating and energizing techniques.",
    mechanism:
      "Rapid diaphragmatic pumping increases mitochondrial activity and triggers thermogenesis. Surya Bhedana activates the sympathetic nervous system in a controlled way.",
    impact:
      "Metabolic boost, toxin elimination, increased cellular energy production. The furnace that powers your glow from inside.",
  },
  {
    stage: 7,
    chakra: "Sahasrara",
    focus: "Subtle breath",
    practices:
      "Micro-breathing, breath suspension, Kevala Kumbhaka. The breath becomes barely perceptible.",
    mechanism:
      "Ultra-refined breathing reduces metabolic demand, allowing the body to enter deep repair states similar to advanced meditation.",
    impact:
      "Cellular autophagy (self-cleaning), HGH release during deep rest states, profound nervous system reset.",
  },
  {
    stage: 8,
    chakra: "Sahasrara",
    focus: "Integration",
    practices:
      "Breath merges with awareness. Pranayama becomes Pratyahara. You're not breathing. You're being breathed.",
    mechanism:
      "The breath-mind feedback loop dissolves. The nervous system enters a state of coherence where stress response is fundamentally rewired.",
    impact:
      "Permanent baseline shift: lower resting cortisol, higher HRV, radiant complexion that comes from genuine inner peace. The epitome of glow.",
  },
];

export function CurriculumSection() {
  return (
    <section className="aura-bg relative py-32 px-6 section-warm">
      {/* Aura background */}
      <div className="aura-bg__img">
        <img src="/visual-library/aura/2.jpeg" alt="" aria-hidden="true" loading="lazy" />
      </div>
      <div className="absolute inset-0 grain-overlay pointer-events-none z-[1]" />

      <div className="max-w-6xl mx-auto space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="tag-pill uppercase tracking-[0.25em] mx-auto mb-5">
            Pranayama
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-light"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The 8-Stage Ascension
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
            A progressive curriculum from basic breath awareness to advanced
            Pranayama mastery. You advance at your own pace. Each stage builds
            on the last.
          </p>
        </motion.div>

        {/* ── The metabolic engine hook ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="void-card p-8 border-primary/20"
        >
          <h3
            className="text-xl font-light mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The Metabolic Engine of Vitality
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">
                Collagen Shield
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pranayama directly suppresses cortisol, the hormone that breaks
                down collagen. Lower cortisol = preserved collagen = plumper,
                more youthful skin.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">
                Fibroblast Activation
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Controlled breath holds (Kumbhaka) increase CO₂ tolerance,
                triggering the Bohr effect, so more oxygen reaches your skin
                cells, activating the fibroblasts that produce collagen.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">
                Mitochondrial Power-Up
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Advanced techniques like Bhastrika and Kapalabhati increase
                mitochondrial activity, the cellular powerhouses that fuel skin
                repair, regeneration, and that radiant glow.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-4">
          {STAGES.map((stage, i) => (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="void-card p-6 space-y-4"
            >
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-muted-foreground/40">
                  {String(stage.stage).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-medium">{stage.focus}</p>
                  <p className="text-xs text-primary">{stage.chakra}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-1.5">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground/60">
                    Practice
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {stage.practices}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground/60">
                    Clinical Mechanism
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {stage.mechanism}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs uppercase tracking-[0.15em] text-primary">
                    Architectural Impact
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {stage.impact}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
