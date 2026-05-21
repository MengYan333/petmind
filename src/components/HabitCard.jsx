import { motion, AnimatePresence } from 'framer-motion';

export default function HabitCard({ message, actions, learningSummary, newsHeadlines, onAction }) {
  if (!message) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-4 mt-4"
      >
        <p className="text-sm text-white/80 mb-3 text-center">{message}</p>

        {learningSummary && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-3 text-xs text-white/70 leading-relaxed">
            {learningSummary}
          </div>
        )}

        {newsHeadlines && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-3 text-xs text-white/70 leading-relaxed whitespace-pre-line">
            {newsHeadlines}
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-center">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => onAction(action)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white/10 hover:bg-white/20 transition-all border border-white/20"
            >
              {action}
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
