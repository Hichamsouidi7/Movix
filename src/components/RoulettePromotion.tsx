import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { PrefetchLink as Link } from '@/routing/PrefetchLink';
import { Dices, Sparkles, ArrowRight } from 'lucide-react';

const RoulettePromotion: React.FC = () => {
  const { t } = useTranslation();
  return (
    <motion.div
      className="px-4 md:px-8"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration: 0.7,
        ease: "easeOut",
        delay: 0.2
      }}
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-800 via-purple-900 to-indigo-950 p-[1px] border border-red-500/30 shadow-2xl shadow-red-950/40"
        initial={{ scale: 0.96, opacity: 0.8 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {/* Glow Effects */}
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 md:p-10 rounded-2xl bg-black/50 backdrop-blur-xl">
          <motion.div
            className="mb-6 md:mb-0 md:mr-8 text-white max-w-2xl"
            initial={{ x: -40, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-4 h-4 text-red-400" />
              <span>{t('nav.roulette') || 'Roulette Cinéma'}</span>
            </div>

            <motion.h2
              className="text-2xl md:text-4xl font-extrabold mb-3 tracking-tight bg-gradient-to-r from-white via-red-100 to-purple-200 bg-clip-text text-transparent"
              initial={{ y: -20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              Tu ne sais pas quoi regarder ce soir ?
            </motion.h2>

            <motion.p
              className="text-gray-300 text-sm md:text-base mb-2 leading-relaxed"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              Laisse le hasard décider ! Lance la roulette et découvre instantanément un film ou une série parfaitement adapté à ton humeur.
            </motion.p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Link
              to="/roulette"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg shadow-red-600/30 transition-all duration-300 transform hover:scale-105 active:scale-95 group"
            >
              <Dices className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
              <span>Lancer la Roulette</span>
              <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default RoulettePromotion;
