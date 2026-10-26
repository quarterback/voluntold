import { Navigate, Route, Routes } from 'react-router-dom';
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

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/me" element={<VolunteerPage />} />
      <Route path="/" element={<Start />} />
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
