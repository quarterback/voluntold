import { Navigate, Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Start } from './pages/Start';
import { OrgShell } from './pages/OrgShell';
import { Today } from './pages/Today';
import { Tasks } from './pages/Tasks';
import { TaskEdit } from './pages/TaskEdit';
import { TaskDetail } from './pages/TaskDetail';
import { People } from './pages/People';
import { Person } from './pages/Person';
import { Settings } from './pages/Settings';
import { Import } from './pages/Import';
import { VolunteerPage } from './pages/VolunteerPage';
import { Needs } from './pages/Needs';
import { Offers } from './pages/Offers';
import { BROWSER_DEMO } from './demoMode';

/** The browser demo has no sign-in. A full load signs the visitor in again. */
function DemoLogin() {
  const next = new URLSearchParams(location.search).get('next');
  location.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/');
  return null;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={BROWSER_DEMO ? <DemoLogin /> : <Login />} />
      <Route path="/me" element={<VolunteerPage />} />
      <Route path="/" element={<Home />} />
      <Route path="/start" element={<Start />} />
      <Route path="/o/:orgId" element={<OrgShell />}>
        <Route index element={<Navigate to="today" replace />} />
        <Route path="today" element={<Today />} />
        <Route path="needs" element={<Needs />} />
        <Route path="needs/:needId" element={<Needs />} />
        <Route path="offers" element={<Offers />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="tasks/new" element={<TaskEdit />} />
        <Route path="tasks/:taskId" element={<TaskDetail />} />
        <Route path="tasks/:taskId/edit" element={<TaskEdit />} />
        <Route path="people" element={<People />} />
        <Route path="people/:volunteerId" element={<Person />} />
        <Route path="settings" element={<Settings />} />
        <Route path="import" element={<Import />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
