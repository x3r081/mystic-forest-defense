import { useGameStore } from '../game/store';
import { difficulties, type DifficultyId } from '../data/difficulties';
import styles from './StartScreen.module.css';

const ORDER: DifficultyId[] = ['easy', 'medium', 'hard'];

/**
 * Difficulty picker shown before a new run begins.
 */
export function DifficultyScreen() {
  const selected = useGameStore((s) => s.selectedDifficulty);
  const selectDifficulty = useGameStore((s) => s.selectDifficulty);
  const startGame = useGameStore((s) => s.startGame);
  const backToTitle = useGameStore((s) => s.backToTitle);

  return (
    <div className={styles.root}>
      <div className={styles.titleBlock}>
        <p className={styles.kicker}>Choose Your Path</p>
        <h1 className={styles.title}>
          Select <span className={styles.accent}>Difficulty</span>
        </h1>
        <p className={styles.tagline}>One hundred levels across ten mystic maps await.</p>
      </div>

      <div className={styles.difficultyGrid}>
        {ORDER.map((id) => {
          const d = difficulties[id];
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              className={`${styles.difficultyCard} ${active ? styles.difficultyCardActive : ''}`}
              onClick={() => selectDifficulty(id)}
              aria-pressed={active}
            >
              <span className={styles.difficultyLabel}>{d.label}</span>
              <span className={styles.difficultyDesc}>{d.description}</span>
              <span className={styles.difficultyStats}>
                ❤ {d.startingLives} · ◈ {d.startingCoins} · +{d.mapTransitionBonus} at ruins
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.difficultyActions}>
        <button className={styles.playButton} onClick={startGame} type="button">
          Begin the Defense
        </button>
        <button className={styles.ghostLink} onClick={backToTitle} type="button">
          Back
        </button>
      </div>
    </div>
  );
}
