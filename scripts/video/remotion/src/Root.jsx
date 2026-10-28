// 1 composition / khuôn (content/video/formats.json) – id "fmt-<khuôn>". Props = timeline từ scripts/video/motion.mjs buildTimeline (render.mjs ghi props.json).
// Thời lượng/kích thước lấy từ props (calculateMetadata) nên cùng 1 composition dùng được cho mọi kịch bản của khuôn đó.
import React from 'react';
import { Composition } from 'remotion';
import formats from '../../../../content/video/formats.json';
import { Short } from './Short.jsx';
import { DEMO } from './demo.js';
import { StitchShort } from './stitch/StitchShort.jsx';

const meta = ({ props }) => ({ durationInFrames: Math.max(1, props.durationInFrames || 300), fps: props.fps || 30, width: props.w || 1080, height: props.h || 1920 });

export const Root = () => (
  <>
    {formats.formats.map(f => (
      <Composition key={f.id} id={`fmt-${f.id}`} component={Short} width={1080} height={1920} fps={30} durationInFrames={300}
        defaultProps={{ ...DEMO, format: f.id, hook: { ...DEMO.hook, pattern: f.hook.pattern, badge: f.hook.badge } }} calculateMetadata={meta} />
    ))}
    {/* Stitch overlay shorts (docs/VIDEO-MOTION.md): props = scripts/video/motion/build_overlay.py output, 60 fps over the render_v9 host plate */}
    <Composition id="stitch-short" component={StitchShort} width={1080} height={1920} fps={60} durationInFrames={600} defaultProps={{ nodes: [], plate: null }}
      calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, props.durationInFrames || 600), fps: props.fps || 60, width: 1080, height: 1920 })} />
  </>
);
