import styles from './LoadingScreen.module.css';

/**
 * Themed fallback shown while the 3D scene initializes. Mirrors the boot splash
 * in index.html so the transition from page-load to app feels seamless.
 */
export function LoadingScreen() {
  return (
    <div className={styles.root}>
      <div className={styles.orb} />
      <p className={styles.title}>Mystic Forest Defense</p>
      <p className={styles.sub}>Summoning the grove…</p>
    </div>
  );
}
