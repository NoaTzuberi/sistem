import { AppShell } from '../../../../components/layout/AppShell/AppShell';
import { HomeScreen } from '../../components/HomeScreen/HomeScreen';

// Trainee Home (PRD §5.1). Statuses and the next workout come from the server, which
// computes them in the trainee's time zone — nothing here reads the device clock.
export function HomePage() {
  return (
    <AppShell bleed>
      <HomeScreen />
    </AppShell>
  );
}
