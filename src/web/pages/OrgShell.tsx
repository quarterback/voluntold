import { createContext, useContext } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppBar, BottomNavigation, BottomNavigationAction, Box, Button, Paper, Toolbar, Typography } from '@mui/material';
import TodayIcon from '@mui/icons-material/TodayOutlined';
import TaskIcon from '@mui/icons-material/AssignmentOutlined';
import PeopleIcon from '@mui/icons-material/GroupOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import { api, orgApi } from '../api';
import { Loading, useLoad } from './common';
import type { Field } from '../../shared/types';

export interface OrgInfo {
  org: { id: string; name: string; weeklyAskLimit: number; signupUrl: string | null; publishDefault: boolean; timeZone: string; atproto: { did: string; handle: string } | null };
  me: { role: 'admin' | 'coordinator' | 'lead'; memberId: string; leadTeamIds: string[]; email: string };
  atprotoReady: boolean;
  fields: Field[];
  teams: { id: string; name: string; volunteerIds: string[]; leadMemberIds: string[] }[];
}

interface Ctx extends OrgInfo {
  path: (p: string) => string;
  reload: () => Promise<void>;
}

const OrgContext = createContext<Ctx | null>(null);
export const useOrg = () => useContext(OrgContext)!;

const TABS = ['today', 'tasks', 'people', 'settings'];

export function OrgShell() {
  const { orgId } = useParams();
  const path = orgApi(orgId!);
  const navigate = useNavigate();
  const location = useLocation();
  const { data, error, reload } = useLoad(async () => {
    const [info, fields, teams] = await Promise.all([api(path('')), api(path('/fields')), api(path('/teams'))]);
    return { ...info, fields: fields.fields, teams: teams.teams } as OrgInfo;
  }, [orgId]);

  if (!data) return <Loading error={error} />;
  const tab = TABS.find((t) => location.pathname.includes(`/${t}`)) ?? 'today';

  return (
    <OrgContext.Provider value={{ ...data, path, reload }}>
      <AppBar position="sticky">
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h3" component="p" sx={{ flex: 1 }} noWrap>{data.org.name}</Typography>
          <Button size="small" onClick={() => navigate('/?choose=1')}>Switch</Button>
        </Toolbar>
      </AppBar>
      <Box component="main">
        <Outlet />
      </Box>
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10 }} elevation={0}>
        <BottomNavigation showLabels value={tab} onChange={(_, v) => navigate(`/o/${orgId}/${v}`)} component="nav" aria-label="Main">
          <BottomNavigationAction label="Today" value="today" icon={<TodayIcon />} />
          <BottomNavigationAction label="Tasks" value="tasks" icon={<TaskIcon />} />
          <BottomNavigationAction label="People" value="people" icon={<PeopleIcon />} />
          <BottomNavigationAction label="Settings" value="settings" icon={<SettingsIcon />} />
        </BottomNavigation>
      </Paper>
    </OrgContext.Provider>
  );
}
