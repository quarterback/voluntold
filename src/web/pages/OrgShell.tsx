import { createContext, useContext } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AppBar, BottomNavigation, BottomNavigationAction, Box, Button, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Paper, Toolbar, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FONT_DISPLAY } from '../theme';
import TodayIcon from '@mui/icons-material/TodayOutlined';
import TaskIcon from '@mui/icons-material/AssignmentOutlined';
import PeopleIcon from '@mui/icons-material/GroupOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import UnfoldIcon from '@mui/icons-material/UnfoldMore';
import NeedIcon from '@mui/icons-material/FlagOutlined';
import { api, orgApi } from '../api';
import { Loading, useLoad } from './common';
import type { Field, Tag } from '../../shared/types';
import { DemoTour } from './DemoTour';

export interface OrgInfo {
  org: { id: string; name: string; weeklyAskLimit: number; signupUrl: string | null; publishDefault: boolean; timeZone: string; sample: boolean; atproto: { did: string; handle: string } | null };
  me: { role: 'admin' | 'coordinator' | 'lead'; memberId: string; leadTeamIds: string[]; email: string };
  atprotoReady: boolean;
  demo: boolean;
  fields: Field[];
  teams: { id: string; name: string; volunteerIds: string[]; leadMemberIds: string[] }[];
  tags: (Tag & { count: number })[];
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
    const [info, fields, teams, tags] = await Promise.all([api(path('')), api(path('/fields')), api(path('/teams')), api(path('/tags'))]);
    return { ...info, fields: fields.fields, teams: teams.teams, tags: tags.tags } as OrgInfo;
  }, [orgId]);

  if (!data) return <Loading error={error} />;
  const found = ALL_TABS.find((t) => location.pathname.includes(`/${t.key}`))?.key ?? 'today';
  const tab = found === 'offers' ? 'today' : found;
  const go = (key: string) => navigate(`/o/${orgId}/${key}`);

  return (
    <OrgContext.Provider value={{ ...data, path, reload }}>
      {wide ? (
        <Box component="nav" aria-label="Main" sx={{
          position: 'fixed', inset: '0 auto 0 0', width: SIDEBAR, bgcolor: theme.vt.ink, color: theme.vt.onInk, p: 1.5, display: 'flex', flexDirection: 'column',
        }}>
          <Button onClick={() => navigate('/start?choose=1')} endIcon={<UnfoldIcon fontSize="small" />}
            sx={{ justifyContent: 'space-between', color: theme.vt.onInk, px: 1.25, mb: 2, minHeight: 48, borderRadius: 2.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}>
            <Typography component="span" noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '1.0625rem', letterSpacing: '-0.01em' }}>{data.org.name}</Typography>
          </Button>
          <List disablePadding>
            {[...TABS, SETTINGS].map((t) => (
              <ListItemButton key={t.key} selected={tab === t.key} onClick={() => go(t.key)}
                aria-current={tab === t.key ? 'page' : undefined}
                sx={{ mb: 0.5, py: 1, color: theme.vt.onInk, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                  '&.Mui-selected, &.Mui-selected:hover': { bgcolor: theme.vt.lime, color: theme.vt.onLime, '& .MuiListItemIcon-root': { color: theme.vt.onLime } } }}>
                <ListItemIcon sx={{ minWidth: 34, color: theme.vt.onInk2 }}>{t.icon}</ListItemIcon>
                <ListItemText primary={t.label} />
              </ListItemButton>
            ))}
          </List>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={{ px: 1.25, color: theme.vt.onInk2 }} noWrap>{data.me.email}</Typography>
        </Box>
      ) : (
        <AppBar position="sticky">
          <Toolbar sx={{ gap: 1, justifyContent: 'space-between' }}>
            <Button onClick={() => navigate('/start?choose=1')} endIcon={<UnfoldIcon fontSize="small" />} sx={{ color: theme.vt.onInk, px: 0.5, minWidth: 0, maxWidth: '100%' }}>
              <Typography component="span" noWrap sx={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '1.0625rem' }}>{data.org.name}</Typography>
            </Button>
            <IconButton aria-label="Settings" onClick={() => go('settings')} sx={{ color: tab === 'settings' ? theme.vt.lime : theme.vt.onInk2 }}><SettingsIcon fontSize="small" /></IconButton>
          </Toolbar>
        </AppBar>
      )}
      <Box component="main" sx={{ ml: wide ? `${SIDEBAR}px` : 0 }}>
        <Outlet />
      </Box>
      <DemoTour />
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
