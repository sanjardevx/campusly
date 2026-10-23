import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { Box, ButtonBase, IconButton, Menu, MenuItem, Slider, Stack, Tooltip, Typography } from '@mui/material';
import Forward10RoundedIcon from '@mui/icons-material/Forward10Rounded';
import FullscreenExitRoundedIcon from '@mui/icons-material/FullscreenExitRounded';
import FullscreenRoundedIcon from '@mui/icons-material/FullscreenRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import Replay10RoundedIcon from '@mui/icons-material/Replay10Rounded';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import { useTranslation } from 'next-i18next/pages';
import { UPDATE_LESSON_PROGRESS } from '@/apollo/student/mutation';
import { EASE_OUT } from '@/libs/components/dashboard/motion';
import type { LessonVideoQuery } from '@/libs/gql/graphql';

type Video = LessonVideoQuery['lessonVideo'];

/** The server counts a gap longer than this as paused (PROGRESS.heartbeatSec) */
const HEARTBEAT_MS = 20_000;
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
/** A small jump ahead of the furthest point is normal playback between two timeupdates */
const SLACK_SEC = 1.5;

const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  return h ? `${h}:${pad((s % 3600) / 60)}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

const controlSx = { color: '#fff', transition: `transform 160ms ${EASE_OUT}`, '&:active': { transform: 'scale(0.92)' }, '@media (prefers-reduced-motion: reduce)': { '&:active': { transform: 'none' } } };

/**
 * Lesson video with Stitch-style controls and the sequential watch rule (DECISIONS §11): until the
 * lesson is completed the student cannot seek past the furthest point or change the speed. That is
 * comfort only — every heartbeat goes to the server, which counts real 1× time and completes at 90%.
 */
export function VideoPlayer({ lessonId, video, durationSec, onCompleted }: { lessonId: string; video: Video; durationSec: number | null; onCompleted: () => void }) {
  const { t } = useTranslation('student');
  const ref = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(video.resumeAt);
  const [duration, setDuration] = useState(durationSec ?? 0);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [locked, setLocked] = useState(video.isLocked);
  const [fullscreen, setFullscreen] = useState(false);
  const [speedMenu, setSpeedMenu] = useState<HTMLElement | null>(null);
  // How far the student may go while locked; grows with natural playback and the server's answer
  const furthest = useRef(video.maxSeekSec ?? 0);
  const [furthestShown, setFurthestShown] = useState(video.maxSeekSec ?? 0);

  const [send] = useMutation(UPDATE_LESSON_PROGRESS);

  const report = useCallback(() => {
    const v = ref.current;
    if (!v || !started) return;
    void send({
      variables: { input: { lessonId, positionSec: Math.floor(v.currentTime), durationSec: Number.isFinite(v.duration) ? Math.round(v.duration) : undefined } },
    })
      .then(({ data }) => {
        const p = data?.updateLessonProgress;
        if (!p) return;
        furthest.current = Math.max(furthest.current, p.maxPositionSec);
        if (p.status === 'COMPLETED' && locked) {
          setLocked(false);
          onCompleted();
        }
      })
      // A lost heartbeat only delays progress; the next one carries the position again
      .catch(() => undefined);
  }, [send, lessonId, started, locked, onCompleted]);

  // Heartbeat while playing; also when the tab is hidden and when the page is left
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(report, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [playing, report]);
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && report();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      report();
    };
  }, [report]);
  // React does not keep the `muted` attribute in sync after the first render: set the property
  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /** Every seek goes through here: while locked, never past the furthest point */
  const seek = (to: number) => {
    const v = ref.current;
    if (!v) return;
    const max = locked ? furthest.current : duration || v.duration;
    v.currentTime = Math.max(0, Math.min(to, max));
    setTime(v.currentTime);
  };

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (!started) setStarted(true);
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  };

  const onKey = (e: KeyboardEvent) => {
    // Keyboard actions are instant (no animation): space / k play, arrows ±5 s, m mute, f full screen
    if (e.key === ' ' || e.key === 'k') toggle();
    else if (e.key === 'ArrowLeft') seek(time - 5);
    else if (e.key === 'ArrowRight') seek(time + 5);
    else if (e.key === 'm') setMuted((m) => !m);
    else if (e.key === 'f') void toggleFullscreen();
    else return;
    e.preventDefault();
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await frame.current?.requestFullscreen().catch(() => undefined);
  };

  const percent = duration ? Math.round((furthestShown / duration) * 100) : 0;
  // Resume only from the middle: near the end (or a finished video) starts over
  const canResume = video.resumeAt > 5 && (!duration || video.resumeAt < duration - 5);

  return (
    <Box
      ref={frame}
      tabIndex={0}
      onKeyDown={onKey}
      sx={{ position: 'relative', aspectRatio: '16 / 9', bgcolor: '#121614', borderRadius: fullscreen ? 0 : '12px', overflow: 'hidden', outline: 'none', '&:focus-visible': { boxShadow: '0 0 0 3px rgba(62,107,92,0.6)' } }}
    >
      <Box
        component="video"
        ref={ref}
        src={video.url}
        playsInline
        preload="metadata"
        // No download / picture-in-picture menu; the watermark stays on the student's own copy
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        onClick={toggle}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration);
          // Resume where the student stopped (not in the last seconds: then start over)
          if (video.resumeAt > 5 && video.resumeAt < v.duration - 5) v.currentTime = video.resumeAt;
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setTime(t);
          // Natural playback moves the furthest point; a jump does not (seeking is caught below)
          if (t <= furthest.current + SLACK_SEC && t > furthest.current) {
            furthest.current = t;
            setFurthestShown(t);
          }
        }}
        onSeeking={(e) => {
          const v = e.currentTarget;
          if (locked && v.currentTime > furthest.current + SLACK_SEC) v.currentTime = furthest.current;
        }}
        onRateChange={(e) => {
          if (locked && e.currentTarget.playbackRate !== 1) e.currentTarget.playbackRate = 1;
        }}
        onPlay={() => {
          setPlaying(true);
          // A heartbeat at the start: the server's clock for 1× watching starts now, not 20 s later
          report();
        }}
        onPause={() => {
          setPlaying(false);
          report();
        }}
        onEnded={() => {
          setPlaying(false);
          report();
        }}
        sx={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', cursor: 'pointer' }}
      />

      {/* The student's ID over the picture (DECISIONS §11): a recording shows whose account it was */}
      <Stack
        direction="row"
        sx={{ position: 'absolute', top: 12, right: 12, alignItems: 'center', gap: 0.5, px: 1.25, py: 0.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.85)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', pointerEvents: 'none', userSelect: 'none' }}
      >
        <VerifiedUserOutlinedIcon sx={{ fontSize: 14, color: '#A0D0C2' }} />
        ID {video.watermark}
      </Stack>

      {/* Before the first play: resume banner (or a plain play button) */}
      {!started && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(18,22,20,0.35)' }}>
          <ButtonBase
            onClick={toggle}
            aria-label={canResume ? t('lesson.player.resume', { time: clock(video.resumeAt) }) : t('lesson.player.play')}
            sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.5, borderRadius: '14px', bgcolor: 'rgba(23,29,26,0.9)', color: '#fff', textAlign: 'left', transition: `transform 160ms ${EASE_OUT}`, '&:active': { transform: 'scale(0.97)' } }}
          >
            <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PlayArrowRoundedIcon />
            </Box>
            {canResume && (
              <Box>
                <Typography sx={{ fontWeight: 600 }}>{t('lesson.player.resume', { time: clock(video.resumeAt) })}</Typography>
                {locked && duration > 0 && <Typography sx={{ fontSize: '0.8125rem', color: '#A0D0C2' }}>{t('lesson.player.resumeHint', { percent })}</Typography>}
              </Box>
            )}
          </ButtonBase>
        </Box>
      )}

      {/* Controls: a solid dark strip (no gradients, DECISIONS §13) */}
      <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, px: { xs: 1, sm: 2 }, pt: 0.5, pb: 1, bgcolor: 'rgba(0,0,0,0.55)', opacity: started ? 1 : 0, transition: 'opacity 200ms ease', pointerEvents: started ? 'auto' : 'none' }}>
        <Box sx={{ position: 'relative', px: 0.75 }}>
          {/* While locked: the reachable part of the timeline is lighter */}
          {locked && duration > 0 && (
            <Box sx={{ position: 'absolute', left: 6, right: 6, top: '50%', height: 4, mt: '-2px', pointerEvents: 'none' }}>
              <Box sx={{ width: `${Math.min(100, (furthestShown / duration) * 100)}%`, height: '100%', bgcolor: 'rgba(255,255,255,0.35)', borderRadius: 2 }} />
            </Box>
          )}
          <Slider
            size="small"
            aria-label={t('lesson.player.seek')}
            value={Math.min(time, duration || time)}
            max={duration || 1}
            step={1}
            onChange={(_, v) => seek(v as number)}
            valueLabelDisplay="off"
            sx={{ color: '#BCEDDA', py: 1, '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.25)', opacity: 1 }, '& .MuiSlider-thumb': { width: 12, height: 12, '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 0 6px rgba(188,237,218,0.25)' } } }}
          />
        </Box>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: { xs: 0, sm: 0.5 } }}>
            <IconButton size="small" onClick={toggle} aria-label={playing ? t('lesson.player.pause') : t('lesson.player.play')} sx={controlSx}>
              {playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
            </IconButton>
            <IconButton size="small" onClick={() => seek(time - 10)} aria-label={t('lesson.player.back10')} sx={controlSx}>
              <Replay10RoundedIcon fontSize="small" />
            </IconButton>
            <Tooltip title={locked ? t('lesson.player.locked') : ''}>
              <span>
                <IconButton size="small" onClick={() => seek(time + 10)} aria-label={t('lesson.player.forward10')} sx={controlSx}>
                  <Forward10RoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <IconButton size="small" onClick={() => setMuted((m) => !m)} aria-label={muted ? t('lesson.player.unmute') : t('lesson.player.mute')} sx={controlSx}>
              {muted ? <VolumeOffRoundedIcon fontSize="small" /> : <VolumeUpRoundedIcon fontSize="small" />}
            </IconButton>
            <Typography sx={{ ml: 0.5, fontSize: '0.8125rem', color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              <Box component="span" sx={{ color: '#fff', fontWeight: 600 }}>
                {clock(time)}
              </Box>{' '}
              / {clock(duration)}
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={locked ? t('lesson.player.speedLocked') : t('lesson.player.speed')}>
              <span>
                <ButtonBase
                  disabled={locked}
                  onClick={(e) => setSpeedMenu(e.currentTarget)}
                  aria-label={t('lesson.player.speed')}
                  sx={{ px: 1, py: 0.5, gap: 0.5, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.75rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums', '&.Mui-disabled': { color: 'rgba(255,255,255,0.6)' } }}
                >
                  {locked && <LockOutlinedIcon sx={{ fontSize: 13 }} />}
                  {rate}×
                </ButtonBase>
              </span>
            </Tooltip>
            <IconButton size="small" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? t('lesson.player.exitFullscreen') : t('lesson.player.fullscreen')} sx={controlSx}>
              {fullscreen ? <FullscreenExitRoundedIcon fontSize="small" /> : <FullscreenRoundedIcon fontSize="small" />}
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      {/* Inside the player: still visible in full screen */}
      <Menu anchorEl={speedMenu} open={!!speedMenu} onClose={() => setSpeedMenu(null)} disablePortal>
        {SPEEDS.map((s) => (
          <MenuItem
            key={s}
            selected={s === rate}
            onClick={() => {
              if (ref.current) ref.current.playbackRate = s;
              setRate(s);
              setSpeedMenu(null);
            }}
          >
            {s}×
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
