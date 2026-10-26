import { createContext, useContext } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AppBar, BottomNavigation, BottomNavigationAction, Box, Button, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Paper, Toolbar, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TodayIcon from '@mui/icons-material/TodayOutlined';
import TaskIcon from '@mui/icons-material/AssignmentOutlined';
import PeopleIcon from '@mui/icons-material/GroupOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import UnfoldIcon from '@mui/icons-material/UnfoldMore';
import NeedIcon from '@mui/icons-material/FlagOutlined';
import { api, orgApi } from '../api';
import { Loading, useLoad } from './common';
import type { Field } from '../../shared/types';

export interface OrgInfo {
  org: { id: string; name: string; weeklyAskLimit: number; signupUrl: string | null; publishDefault: boolean; timeZone: string; atproto: { did: string; handle: string } | null };
  me: { role: 'admin' | 'coordinator' | 'lead'; memberId: string; leadTeamIds: string[]; email: string };
  atprotoReady: boolean;
  demo: boolean;
  fields: Field[];
  teams: { id: string; name: string; volunteerIds: string[]; leadMemberIds: string[] }[];
}

interface Ctx extends OrgInfo {
  path: (p: string) => string;
  reload: () => Promise<void>;
}

const OrgContext = createContext<Ctx | null>(null);
export const useOrg = () => useContext(OrgContext)!;

const TABS = [
  { key: 'today', label: 'Today', icon: <TodayIcon fontSize="small" /> },
  { key: 'needs', label: 'Needs', icon: <NeedIcon fontSize="small" /> },
  { key: 'tasks', label: 'Tasks', icon: <TaskIcon fontSize="small" /> },
  { key: 'people', label: 'People', icon: <PeopleIcon fontSize="small" /> },
];
const SETTINGS = { key: 'settings', label: 'Settings', icon: <SettingsIcon fontSize="small" /> };
const ALL_TABS = [...TABS, SETTINGS, { key: 'offers', label: 'Today', icon: null }];

const SIDEBAR = 232;

export function OrgShell() {
  const { orgId } = useParams();
  const path = orgApi(orgId!);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const { data, error, reload } = useLoad(async () => {
    const [info, fields, teams] = await Promise.all([api(path('')), api(path('/fields')), api(path('/teams'))]);
    return { ...info, fields: fields.fields, teams: teams.teams } as OrgInfo;
  }, [orgId]);

  if (!data) return <Loading error={error} />;
  const found = ALL_TABS.find((t) => location.pathname.includes(`/${t.key}`))?.key ?? 'today';
  const tab = found === 'offers' ? 'today' : found;
  const go = (key: string) => navigate(`/o/${orgId}/${key}`);

  return (
    <OrgContext.Provider value={{ ...data, path, reload }}>
      {wide ? (
        <Box component="nav" aria-label="Main" sx={{
          position: 'fixed', inset: '0 auto 0 0', width: SIDEBAR, bgcolor: 'background.paper', borderRight: `1px solid ${theme.vt.border}`, p: 1.5, display: 'flex', flexDirection: 'column',
        }}>
          <Button onClick={() => navigate('/?choose=1')} endIcon={<UnfoldIcon fontSize="small" />}
            sx={{ justifyContent: 'space-between', color: 'text.primary', fontWeight: 600, px: 1.25, mb: 1.5, minHeight: 40 }}>
            <Typography component="span" noWrap sx={{ fontWeight: 600 }}>{data.org.name}</Typography>
          </Button>
          <List disablePadding>
            {[...TABS, SETTINGS].map((t) => (
              <ListItemButton key={t.key} selected={tab === t.key} onClick={() => go(t.key)}
                aria-current={tab === t.key ? 'page' : undefined}
                sx={{ mb: 0.25, py: 0.75, '&.Mui-selected': { bgcolor: theme.vt.accentSoft, color: theme.vt.accent, '& .MuiListItemIcon-root': { color: theme.vt.accent } } }}>
                <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>{t.icon}</ListItemIcon>
                <ListItemText primary={t.label} />
              </ListItemButton>
            ))}
          </List>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={{ px: 1.25 }} noWrap>{data.me.email}</Typography>
        </Box>
      ) : (
        <AppBar position="sticky">
          <Toolbar sx={{ gap: 1, justifyContent: 'space-between' }}>
            <Button onClick={() => navigate('/?choose=1')} endIcon={<UnfoldIcon fontSize="small" />} sx={{ color: 'text.primary', fontWeight: 600, px: 0.5, minWidth: 0, maxWidth: '100%' }}>
              <Typography component="span" noWrap sx={{ fontWeight: 600 }}>{data.org.name}</Typography>
            </Button>
            <IconButton aria-label="Settings" onClick={() => go('settings')} sx={{ color: tab === 'settings' ? 'primary.main' : 'text.secondary' }}><SettingsIcon fontSize="small" /></IconButton>
          </Toolbar>
        </AppBar>
      )}
      <Box component="main" sx={{ ml: wide ? `${SIDEBAR}px` : 0 }}>
        <Outlet />
      </Box>
      {!wide && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10 }} elevation={0}>
          <BottomNavigation showLabels value={tab === 'settings' ? false : tab} onChange={(_, v) => go(v)} component="nav" aria-label="Main">
            {TABS.map((t) => <BottomNavigationAction key={t.key} label={t.label} value={t.key} icon={t.icon} />)}
          </BottomNavigation>
        </Paper>
      )}
    </OrgContext.Provider>
  );
}
