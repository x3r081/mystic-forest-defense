import { Suspense, useEffect } from 'react';
import { attachGameDebugAudit } from './game/gameDebug';
import { ForestScene } from './game/ForestScene';
import { GameScene } from './game/GameScene';
import { StartScreen } from './ui/StartScreen';
import { DifficultyScreen } from './ui/DifficultyScreen';
import { GameHUD } from './ui/GameHUD';
import { GameOverScreen } from './ui/GameOverScreen';
import { LevelCompleteScreen, VictoryScreen } from './ui/LevelTransition';
import { MapTransitionScreen } from './ui/MapTransitionScreen';
import { LoadingScreen } from './ui/LoadingScreen';
import { LeaderboardScreen } from './ui/LeaderboardScreen';
import { useGameStore } from './game/store';
import './App.css';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const inBattle = screen === 'playing' || screen === 'maptransition';

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    return attachGameDebugAudit();
  }, []);

  return (
    <div className="app">
      <Suspense fallback={<LoadingScreen />}>
        {inBattle ? <GameScene /> : <ForestScene />}
      </Suspense>

      {screen === 'start' && <StartScreen />}
      {screen === 'difficulty' && <DifficultyScreen />}
      {screen === 'leaderboard' && <LeaderboardScreen />}
      {screen === 'playing' && <GameHUD />}
      {screen === 'maptransition' && <MapTransitionScreen />}
      {screen === 'levelcomplete' && <LevelCompleteScreen />}
      {screen === 'victory' && <VictoryScreen />}
      {screen === 'gameover' && <GameOverScreen />}
    </div>
  );
}
