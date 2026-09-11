import styles from "./app-preloader.module.css";

export function AppPreloader() {
  return (
    <div
      className={styles.preloader}
      role="status"
      aria-label="Loading Smark Connect"
    >
      <div className={styles.message}>
        <p className={styles.wordmark}>
          <span>Your</span> <strong>AI CMO</strong>
        </p>
        <p className={styles.impactLine}>
          Make your next move the one that matters.
        </p>
      </div>

      <svg
        className={styles.perimeter}
        aria-hidden="true"
      >
        <rect
          className={styles.track}
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          pathLength="100"
        />
        <rect
          className={styles.trailOuter}
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          pathLength="100"
          strokeDasharray="6.8 93.2"
        />
        <rect
          className={styles.trailInner}
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          pathLength="100"
          strokeDasharray="4.2 95.8"
        />
        <rect
          className={styles.tracer}
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          pathLength="100"
          strokeDasharray="1.4 98.6"
        />
      </svg>
    </div>
  );
}
